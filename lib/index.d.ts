export default class LogClient {
    private name;
    loggerAdress: string;
    reconnect: boolean;
    reconnectInterval: number;
    rejectUnauthorized: boolean;
    onClose: ((logger: LogClient, code: number) => void) | undefined;
    onError: ((logger: LogClient, error: Error) => void) | undefined;
    overrideLogCommand: ((messsage: string, thisClient: LogClient) => void) | undefined;
    private webSocket;
    constructor(name: string, loggerAdress: string, authString: string, reconnect?: boolean, reconnectInterval?: number, rejectUnauthorized?: boolean, onClose?: ((logger: LogClient, code: number) => void) | undefined, onError?: ((logger: LogClient, error: Error) => void) | undefined, overrideLogCommand?: ((messsage: string, thisClient: LogClient) => void) | undefined);
    startMetrics(interval?: number): void;
    sendMetrics(): Promise<void>;
    start(authString: string, rejectUnauthorized: boolean): void;
    message(message: string): void;
    log(level: 1 | 2 | 3 | 4 | 5 | 6, channel: string, message: string, data?: any): void;
    logMetrics(data: {
        [key: string]: number;
    }): void;
}
