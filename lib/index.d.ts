<<<<<<< HEAD
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
=======
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
    Log(severity: number | undefined, message: string, channel: string, data: any): void;
}
>>>>>>> 00111096e6f7c64fc6c600f8150ca5ca5fdf0329
