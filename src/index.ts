import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private name: string, public loggerAdress: string, authString: string, public reconnect = true, public reconnectInterval = 5000,
        public onClose: ((logger: LogClient, code: number) => void) | undefined = undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined = undefined) {

        this.start(authString);
    }

    /**
     * Starts the predefined metrics logger, which is designed to work with gudatr/log-server
     */
    public startMetrics(interval: number) {
        setInterval(() => { this.sendMetrics() }, interval)
    }

    public async sendMetrics() {
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([si.disksIO(), si.networkStats(), si.fsSize()]);

        let data = {
            cpu: os.loadavg()[0],
            ru: os.freemem() / os.totalmem(),
            dr: diskInfo.rIO_sec,
            dw: diskInfo.wIO_sec,
            du: Math.round(diskUsageInfo[0].used / diskUsageInfo[0].size * 100),
            tin: trafficInfo[0].rx_bytes / 1024,
            tout: trafficInfo[0].tx_bytes / 1024,
        };

        this.log(undefined, undefined, undefined, data);
    }

    public start(authString: string) {
        this.webSocket =
            new WebSocket(`${this.loggerAdress}/log?auth=${authString}&name=${this.name}`)

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
                            this.start(authString);
                        }, this.reconnectInterval);
                    }
                });
    }

    public message(message: string) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }


    public log(level = 1 | 2 | 3 | 4 | 5 | 6, channel: string | undefined, message: string | undefined, data: any) {
        if (data instanceof Error) { data = { name: data.name, exception: data.message, stack: data.stack } }
        try {
            this.webSocket?.send(JSON.stringify({
                level,
                channel,
                message,
                data
            }));
        } catch (err: any) {
            this.message(`Error while logging: ${err.message}`);
        }
    }
}