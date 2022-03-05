export default class LogClient {
    private ownAdress;
    loggerAdress: string;
    onClose: ((logger: LogClient, code: number) => void) | undefined;
    onError: ((logger: LogClient, error: Error) => void) | undefined;
    private webSocket;
    reconnect: boolean;
    reconnectInterval: number;
    constructor(ownAdress: string, loggerAdress: string, authString: string, onClose?: ((logger: LogClient, code: number) => void) | undefined, onError?: ((logger: LogClient, error: Error) => void) | undefined);
    StartMetrics(): void;
    SendMetrics(): Promise<void>;
    Start(authString: string): void;
    Message(message: string): void;
    Log(severity: number | undefined, message: string, data: any): void;
}
