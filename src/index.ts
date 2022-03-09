import WebSocket from 'ws';
import os from 'os';
import si from "systeminformation"

export default class LogClient {

    private webSocket: WebSocket | undefined;        //You should initHealth on one thread, preferably the main thread

    //Options for default connection close behaviour, you can define your own in the onClose function
    public reconnect: boolean = true;
    public reconnectInterval: number = 1000;

    constructor(private ownAdress: string,
        public loggerAdress: string,
        authString: string,
        public onClose: ((logger: LogClient, code: number) => void) | undefined = undefined,
        public onError: ((logger: LogClient, error: Error) => void) | undefined = undefined) {

        this.Start(authString);
    }

    public StartMetrics() {
        setInterval(() => { this.SendMetrics() }, 10000)
    }

    public async SendMetrics() {
        let diskInfo = await si.disksIO();
        let trafficInfo = await si.networkStats();
        let diskUsageInfo = await si.fsSize();

        this.webSocket?.send(JSON.stringify({
            server: this.ownAdress,
            severity: 0,
            data: {
                cpu: os.loadavg()[0],
                ram_free: os.freemem,
                ram_total: os.totalmem,
                disk_read: diskInfo.rIO_sec,
                disk_write: diskInfo.wIO_sec,
                disk_wait: diskInfo.tWaitTime,
                disk_usage: diskUsageInfo[0].size,
                disk_total: diskUsageInfo[0].used,
                traffic_in: trafficInfo[0].rx_bytes / 1024,
                traffic_out: trafficInfo[0].tx_bytes / 1024,
            }
        }));
    }

    public Start(authString: string) {
        this.webSocket = new WebSocket(`${this.loggerAdress}/log?auth=${authString}&name=${this.ownAdress}`);

        this.webSocket.on('open', () => {
            this.Message('Logger connected.');
        });

        this.webSocket.on('error', (error: Error) => {
            if (this.onError)
                this.onError(this, error);
            else
                this.Message(error.message);
        });

        this.webSocket.on('close', (code: number) => {
            this.Message('Logger disconnected.');
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

    public Log(severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, message: string, channel: string, data: any) {
        if (data instanceof Error) { data = { stack: data.stack } }
        this.webSocket?.send(JSON.stringify({
            time: Date.now(),
            server: this.ownAdress,
            severity,
            message,
            channel,
            data
        }));
    }
}