import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

export default class LogClient {

    private webSocket: WebSocket | undefined;

    constructor(private ownAdress: string, public loggerAdress: string, authString: string, public reconnect = true, public reconnectInterval = 5000,
        public onClose: ((logger: LogClient, code: number) => void) | undefined = undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined = undefined) {

        this.Start(authString);
    }

    /**
     * Starts the predefined metrics logger, which is designed to work with McDuckes/log-server
     */
    public StartMetrics() {
        setInterval(() => { this.SendMetrics() }, 5000)
    }

    public async SendMetrics() {
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([si.disksIO(), si.networkStats(), si.fsSize()]);

        let data = {
            cpu: os.loadavg()[0],
            ram_free: os.freemem,
            ram_total: os.totalmem,
            disk_read: diskInfo.rIO_sec,
            disk_write: diskInfo.wIO_sec,
            disk_wait: diskInfo.tWaitTime,
            disk_usage: diskUsageInfo[0].used,
            disk_total: diskUsageInfo[0].size,
            traffic_in: trafficInfo[0].rx_bytes / 1024,
            traffic_out: trafficInfo[0].tx_bytes / 1024,
        };

        this.Log(1, 'metrics', undefined, data);
    }

    public Start(authString: string) {
        this.webSocket =

            new WebSocket(`${this.loggerAdress}/log?auth=${authString}&name=${this.ownAdress}`)

                .on('open', () => {
                    this.Message('Logger connected.');
                })

                .on('error', (error: Error) => {
                    if (this.onError)
                        this.onError(this, error);
                    else
                        this.Message(error.message);
                })

                .on('close', (code: number) => {
                    this.Message('Logger disconnected. Code: ' + code);
                    if (this.onClose) {
                        this.onClose(this, code);
                    } else if (this.reconnect) {
                        setTimeout(() => {
                            this.Message('Attempting reconnect.');
                            this.Start(authString);
                        }, this.reconnectInterval);
                    }
                });
    }

    public Message(message: string) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }


    public Log(severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, channel: string, message: string | undefined, data: any) {
        if (data instanceof Error) { data = { exception: data.message, stack: data.stack } }
        this.webSocket?.send(JSON.stringify({
            time: Date.now(),
            channel,
            server: this.ownAdress,
            severity,
            message,
            data
        }));
    }
}