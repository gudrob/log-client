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
     */
    public startMetrics(interval: number = 15000) {
        setInterval(() => { this.sendMetrics() }, interval)
    }

    public async sendMetrics() {
        let diskInfo = await si.disksIO();
        let trafficInfo = await si.networkStats();
        let diskUsageInfo = await si.fsSize();

        const MB = 1000000;
        const dataValues = ['cpu', 'ru', 'dr', 'dw', 'du', 'tin', 'tout'];

        let data: { [key: string]: number } = {
            cpu: os.loadavg()[0],
            ru: os.freemem() / os.totalmem() / MB,
            dr: diskInfo?.rIO_sec ?? 0,
            dw: diskInfo?.wIO_sec ?? 0,
            du: diskUsageInfo[0].used / diskUsageInfo[0].size / MB,
            tin: trafficInfo[0].rx_sec / MB,
            tout: trafficInfo[0].tx_sec / MB,
        };

        dataValues.forEach((element) => {
            data[element] = +data[element].toFixed(2);
        });

        //@ts-ignore, premarily called this way to reduce traffic
        this.log(undefined, undefined, undefined, data);
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

    public message(message: string) {
        if (this.overrideLogCommand !== undefined) {
            this.overrideLogCommand(message, this);
        } else {
            console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
        }
    }

    public log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string | undefined, message: string | undefined, data: any) {
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
}