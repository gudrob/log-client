import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

const MB = 1000000; //one MB according to IEC 80000-13
const SINGLE_APOSTROPHE_REGEX = /'/g;

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private name: string, public loggerAdress: string, public reconnect = true, public reconnectInterval = 5000,
        public rejectUnauthorized = false,
        public perMessageDeflate: boolean | undefined,
        public onClose: ((logger: LogClient, code: number) => void) | undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined) {
    }

    /**
     * Starts the predefined metrics logger, which is designed to work with gudatr/log-server
     * You should start the metrics logging only on one thread per application
     */
    public startMetrics(interval: number = 20000) {
        setInterval(() => { this.sendMetrics() }, interval)
    }

    /**
     * Dispatches a metrics log entry containing
     * - CPU Load average for the last minute
     * - RAM used percentage
     * - Read IO per second
     * - Write IO per second
     * - Disk usage percentage
     * - Network read MB per second
     * - Network write MB per second
     */
    public async sendMetrics() {
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([si.disksIO(), si.networkStats(), si.fsSize()]);

        //@ts-ignore
        if (!diskInfo) diskInfo = {};

        let data: { [key: string]: number } = {
            cpu: os.loadavg()[0] * 100,
            mem_used: (1 - os.freemem() / os.totalmem()) * 100,
            io_read: diskInfo.rIO_sec ?? 0,
            io_write: diskInfo.wIO_sec ?? 0,
            disk_used: diskUsageInfo[0].used / diskUsageInfo[0].size * 100,
            net_in: trafficInfo[0].rx_sec / MB,
            net_out: trafficInfo[0].tx_sec / MB,
        };

        for (let key in data) {
            data[key] = +data[key].toFixed(2);
        }

        this.logMetrics(data);
    }

    public open(): boolean {
        return !!this.webSocket;
    }

    /**
     * Initializes the websocket connection
     * @param passphrase - the passphrase for the logging endpoint
     * @param rejectUnauthorized - if wss is chosen, determines if self-signed certificates, etc. will be rejected
     * @param perMessageDeflate - enables per message deflate if the server also supports it
     * @throws if the logger address is invalid
     * @returns 
     */
    public start(passphrase: string, rejectUnauthorized: boolean, perMessageDeflate: boolean | undefined) {
        let url = `${this.loggerAdress}/log?auth=${passphrase}&name=${this.name}`;

        new URL(url);

        this.webSocket = new WebSocket(url, {
            rejectUnauthorized,
            perMessageDeflate
        })

            .on('error', (error: Error) => {
                if (this.onError) return this.onError(this, error);
            })

            .on('close', (code: number) => {
                this.webSocket = undefined;

                if (this.onClose) return this.onClose(this, code);

                if (this.reconnect) {
                    setTimeout(() => {
                        this.start(passphrase, rejectUnauthorized, perMessageDeflate);
                    }, this.reconnectInterval);
                }
            });
    }

    public log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string, message: string, data: object | string | undefined = undefined) {

        if (!this.webSocket) return;

        let sendData;

        if (data instanceof Error) {
            data = data.stack ? data.stack : data.message;
        }

        switch (typeof data) {
            case 'string':
                sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + data;
                break;
            case 'object':
                sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + JSON.stringify(data);
                break;
            default:
                sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"');
                break;
        }

        this.webSocket.send(sendData);
    }

    public logMetrics(data: { [key: string]: number }) {
        if (!this.webSocket) return;

        this.webSocket.send(JSON.stringify(data));
    }
}