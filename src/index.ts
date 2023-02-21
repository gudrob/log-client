import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private name: string, public loggerAdress: string, authString: string, public reconnect = true, public reconnectInterval = 5000,
        public rejectUnauthorized = false,
        public onClose: ((logger: LogClient, code: number) => void) | undefined = undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined = undefined,
        public overrideLogCommand: ((messsage: string, thisClient: LogClient) => void) | undefined = undefined) {

        this.start(authString, rejectUnauthorized);
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
     * Disk usge percentage
     * Network read MB per second
     * Network write MB per second
     */
    private dataValues: string[] = [];
    public async sendMetrics() {
        let diskInfo = await si.disksIO();
        let trafficInfo = await si.networkStats();
        let diskUsageInfo = await si.fsSize();

        const MB = 1000000; //IEC 80000-13

        let data: { [key: string]: number } = {
            cpu: os.loadavg()[0],
            mem_used: 1 - (os.freemem() / os.totalmem()),
            io_read: diskInfo?.rIO_sec ?? 0,
            io_write: diskInfo?.wIO_sec ?? 0,
            disk_used: diskUsageInfo[0].used / diskUsageInfo[0].size,
            net_in: trafficInfo[0].rx_sec / MB,
            net_out: trafficInfo[0].tx_sec / MB,
        };

        if (this.dataValues.length === 0) {
            this.dataValues = Object.keys(data);
        }

        for (let element of this.dataValues) {
            data[element] = +data[element].toFixed(2);
        }

        this.logMetrics(data);
    }

    public start(authString: string, rejectUnauthorized: boolean) {
        this.webSocket =
            new WebSocket(`${this.loggerAdress}/log?auth=${authString}&name=${this.name}`,
                {
                    rejectUnauthorized: rejectUnauthorized
                })

                .on('open', () => {
                    this.message('Logger connected.');
                })

                .on('error', (error: Error) => {
                    if (this.onError)
                        return this.onError(this, error);

                    this.message(error.message);
                })

                .on('close', (code: number) => {
                    this.message('Logger disconnected. Code: ' + code);
                    if (this.onClose) {
                        this.onClose(this, code);
                    } else if (this.reconnect) {
                        setTimeout(() => {
                            this.message('Attempting reconnect.');
                            this.start(authString, rejectUnauthorized);
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

    public log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string, message: string, data: any) {
        if (data instanceof Error) { data = { name: data.name, exception: data.message, stack: data.stack } }

        this.webSocket?.send(JSON.stringify({
            level,
            channel,
            message,
            data
        }), (err) => {
            if (err) this.message(`Error while logging: ${err.message}`);
        });
    }

    public logMetrics(data: { [key: string]: number }) {
        this.webSocket?.send(JSON.stringify(data), (err) => {
            if (err) this.message(`Error while logging metrics: ${err.message}`);
        });
    }
}