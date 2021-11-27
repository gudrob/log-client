import WebSocket from 'ws';
import os from 'os';
import checkDiskSpace from 'check-disk-space'

export default class NodeSocketLogClient {

    private webSocket: WebSocket | undefined;        //You should initHealth on one thread, preferably the main thread

    //Options for default connection close behaviour, you can define your own in the onClose function
    public reconnect: boolean = true;
    public reconnectInterval: number = 1000;

    constructor(private ownAdress: string,
        public loggerAdress: string,
        authString: string,
        public onClose: ((logger: NodeSocketLogClient, code: number) => void) | undefined = undefined,
        public onError: ((logger: NodeSocketLogClient, error: Error) => void) | undefined = undefined) {

        this.initLogger(authString);
    }

    public initHealth() {
        setInterval(() => { this.sendHealthInfo() }, 10000)
    }

    public sendHealthInfo() {
        checkDiskSpace('/').then((diskSpace) => {
            let diskusage = (1 - diskSpace.free / diskSpace.size);
            let diskfree = diskSpace.free;
            let disktotal = diskSpace.size;

            this.webSocket?.send(JSON.stringify({
                server: this.ownAdress,
                severity: 0,
                data: {
                    cpus: os.loadavg(),
                    free: os.freemem,
                    total: os.totalmem,
                    disk: {
                        diskusage,
                        diskfree,
                        disktotal
                    }
                }
            }));
        });
    }

    public initLogger(authString: string) {
        this.webSocket = new WebSocket(this.loggerAdress + "/log?auth=" + authString);

        this.webSocket.on('open', () => {
            this.message('Logger connected.');
        });

        this.webSocket.on('error', (error: Error) => {
            if (this.onError)
                this.onError(this, error);
            else
                this.message(error.message);
        });

        this.webSocket.on('close', (code) => {
            this.message('Logger disconnected.');
            if (this.onClose) {
                this.onClose(this, code);
            } else if (this.reconnect) {
                setTimeout(() => {
                    this.message('Attempting reconnect.');
                    this.initLogger(authString);
                }, this.reconnectInterval);
            }
        });
    }

    public message(message: string) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }

    public log(severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, message: string, data: any) {
        this.webSocket?.send(JSON.stringify({
            server: this.ownAdress,
            severity,
            message,
            data
        }));
    }
}