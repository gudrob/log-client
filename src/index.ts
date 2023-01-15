import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private ownAdress: string, public loggerAdress: string, authString: string, public reconnect = true, public reconnectInterval = 5000,
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
            du: diskUsageInfo[0].used,
            dt: diskUsageInfo[0].size,
            tin: trafficInfo[0].rx_bytes / 1024,
            tout: trafficInfo[0].tx_bytes / 1024,
        };

        this.log(0, undefined, undefined, data);
    }

    public start(authString: string) {
        this.webSocket =

            new WebSocket(`${this.loggerAdress}/log?auth=${authString}&name=${this.ownAdress}`)

                .on('open', () => {
                    this.message('Logger connected.');
                })

                .on('error', (error: Error) => {
                    if (this.onError)
                        this.onError(this, error);
                    else
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


    public log(level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, channel: string | undefined, message: string | undefined, data: any) {
        if (data instanceof Error) { data = { name: data.name, exception: data.message, stack: data.stack } }
        this.webSocket?.send(JSON.stringify({
            level,
            time: Date.now(),
            channel,
            message,
            data
        }));
    }
}