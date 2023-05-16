import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

const MB = 1000000; //one MB according to IEC 80000-13

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private name: string, public loggerAdress: string, authString: string, public reconnect = true, public reconnectInterval = 5000,
        public rejectUnauthorized = false,
        public perMessageDeflate: boolean | undefined,
        public onClose: ((logger: LogClient, code: number) => void) | undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined,
        public overrideLogCommand: ((messsage: string, thisClient: LogClient) => void) | undefined) {

        this.start(authString, rejectUnauthorized, perMessageDeflate);
    }

    /**
     * Starts the predefined metrics logger, which is designed to work with gudatr/log-server
     * You should start the Metrics logging only on one thread per application
     */
    public startMetrics(interval: number = 20000) {
        setInterval(() => { this.sendMetrics() }, interval)
    }

    /**
     * Dispatches a metrics log entry containing
     * CPU Load average for the last minute
     * RAM used percentage
     * Read IO per second
     * Write IO per second
     * Disk usage percentage
     * Network read MB per second
     * Network write MB per second
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

    public start(authString: string, rejectUnauthorized: boolean, perMessageDeflate: boolean | undefined) {
        let url = `${this.loggerAdress}/log?auth=${authString}&name=${this.name}`;

        try {
            new URL(url)
        } catch (err: any) {
            return this.message('Invalid url ' + url);
        }

        this.webSocket = new WebSocket(url, {
            rejectUnauthorized,
            perMessageDeflate
        })

            .on('open', () => {
                this.message('Logger connected.');
            })

            .on('error', (error: Error) => {
                if (this.onError) return this.onError(this, error);

                this.message(error.message);
            })

            .on('close', (code: number) => {
                this.webSocket = undefined;

                this.message('Logger disconnected. Code: ' + code);

                if (this.onClose) return this.onClose(this, code);

                if (this.reconnect) {
                    setTimeout(() => {
                        this.message('Attempting reconnect.');
                        this.start(authString, rejectUnauthorized, perMessageDeflate);
                    }, this.reconnectInterval);
                }
            });
    }

    public message(message: string): void {
        if (this.overrideLogCommand) {
            return this.overrideLogCommand(message, this);
        }

        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }

    public log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string, message: string, data: any = {}) {

        if (!this.webSocket) return;

        if (data instanceof Error) { data = { msg: data.message, stack: data.stack } }

        this.webSocket.send(JSON.stringify([
            level,
            channel,
            message,
            data
        ]), (err) => {
            if (err) this.message(`Error while logging: ${err.message}`);
        });
    }

    public logMetrics(data: { [key: string]: number }) {
        if (!this.webSocket) return;

        this.webSocket.send(JSON.stringify(data), (err) => {
            if (err) this.message(`Error while logging metrics: ${err.message}`);
        });
    }
}