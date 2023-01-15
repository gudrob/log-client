export default class LogClient {
    private ownAdress;
    loggerAdress: string;
    reconnect: boolean;
    reconnectInterval: number;
    onClose: ((logger: LogClient, code: number) => void) | undefined;
    onError: ((logger: LogClient, error: Error) => void) | undefined;
    private webSocket;
    constructor(ownAdress: string, loggerAdress: string, authString: string, reconnect?: boolean, reconnectInterval?: number, onClose?: ((logger: LogClient, code: number) => void) | undefined, onError?: ((logger: LogClient, error: Error) => void) | undefined);
    startMetrics(interval: number): void;
    sendMetrics(): Promise<void>;
    start(authString: string): void;
    message(message: string): void;
    log(level: number | undefined, channel: string | undefined, message: string | undefined, data: any): void;
}
