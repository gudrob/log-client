export default class LogClient {
    private ownAdress;
    loggerAdress: string;
    reconnect: boolean;
    reconnectInterval: number;
    onClose: ((logger: LogClient, code: number) => void) | undefined;
    onError: ((logger: LogClient, error: Error) => void) | undefined;
    private webSocket;
    constructor(ownAdress: string, loggerAdress: string, authString: string, reconnect?: boolean, reconnectInterval?: number, onClose?: ((logger: LogClient, code: number) => void) | undefined, onError?: ((logger: LogClient, error: Error) => void) | undefined);
    StartMetrics(): void;
    SendMetrics(): Promise<void>;
    Start(authString: string): void;
    Message(message: string): void;
    Log(severity: number | undefined, channel: string, message: string | undefined, data: any): void;
}
