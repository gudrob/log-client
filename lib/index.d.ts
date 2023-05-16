export default class LogClient {
    private name;
    loggerAdress: string;
    reconnect: boolean;
    reconnectInterval: number;
    rejectUnauthorized: boolean;
    perMessageDeflate: boolean | undefined;
    onClose: ((logger: LogClient, code: number) => void) | undefined;
    onError: ((logger: LogClient, error: Error) => void) | undefined;
    overrideLogCommand: ((messsage: string, thisClient: LogClient) => void) | undefined;
    private webSocket;
    constructor(name: string, loggerAdress: string, reconnect: boolean, reconnectInterval: number, rejectUnauthorized: boolean, perMessageDeflate: boolean | undefined, onClose: ((logger: LogClient, code: number) => void) | undefined, onError: ((logger: LogClient, error: Error) => void) | undefined, overrideLogCommand: ((messsage: string, thisClient: LogClient) => void) | undefined);
    /**
     * Starts the predefined metrics logger, which is designed to work with gudatr/log-server
     * You should start the metrics logging only on one thread per application
     */
    startMetrics(interval?: number): void;
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
    sendMetrics(): Promise<void>;
    open(): boolean;
    /**
     * Initializes the websocket connection
     * @param passphrase - the passphrase for the logging endpoint
     * @param rejectUnauthorized - if wss is chosen, determines if self-signed certificates, etc. will be rejected
     * @param perMessageDeflate - enables per message deflate if the server also supports it
     * @throws if the logger address is invalid
     * @returns
     */
    start(passphrase: string, rejectUnauthorized: boolean, perMessageDeflate: boolean | undefined): void;
    message(message: string): void;
    log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string, message: string, data: object | undefined): void;
    logMetrics(data: {
        [key: string]: number;
    }): void;
}
