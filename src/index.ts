import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

const MB = 1000000; //one MB according to IEC 80000-13
const SINGLE_APOSTROPHE_REGEX = /'/g;
const MetricsBufferSize = 7 * 4 + 1;

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private name: string, public loggerAdress: string, public reconnect = true, public reconnectIntervalMs = 5000,
        public rejectUnauthorized = false,
        public perMessageDeflate: boolean | undefined = undefined,
        public onClose: ((logger: LogClient, code: number) => void) | undefined = undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined = undefined) {
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
        if (!this.webSocket) return;

        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([si.disksIO(), si.networkStats(), si.fsSize()]);

        if (!this.webSocket) return;

        let metricsBuffer = Buffer.allocUnsafe(MetricsBufferSize);

        metricsBuffer[0] = 0;
        metricsBuffer.writeFloatBE(os.loadavg()[0] * 100, 1);
        metricsBuffer.writeFloatBE((1 - os.freemem() / os.totalmem()) * 100, 5);
        metricsBuffer.writeFloatBE(diskInfo.rIO_sec ? diskInfo.rIO_sec : 0, 9);
        metricsBuffer.writeFloatBE(diskInfo.wIO_sec ? diskInfo.wIO_sec : 0, 13);
        metricsBuffer.writeFloatBE(diskUsageInfo[0].used / diskUsageInfo[0].size * 100, 17);
        metricsBuffer.writeFloatBE(trafficInfo[0].rx_sec / MB, 21);
        metricsBuffer.writeFloatBE(trafficInfo[0].tx_sec / MB, 25);

        this.webSocket.send(metricsBuffer);
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
                    }, this.reconnectIntervalMs);
                }
            });
    }

    /**
     * Log a message with the provided parameters
     * @param level The message's level ranging from 1 to 6 where 1 is the least and 6 the most important
     * @param channel A channel name to group messages by on the server side, shoud not contain apostrophes
     * @param message The message itself, shoud not contain apostrophes
     * @param data Data to provide context for the message
     * @returns 
     */
    public log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string, message: string, data: object | string | undefined = undefined) {

        if (!this.webSocket) return;


        if (data instanceof Error) {
            data = data.stack ? data.stack : data.message;
        }

        switch (typeof data) {
            case 'string':
                this.webSocket.send(level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + data);
                break;
            case 'object':
                this.webSocket.send(level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + JSON.stringify(data));
                break;
            default:
                this.webSocket.send(level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"'));
                break;
        }
    }
}