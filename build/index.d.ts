export default class NodeSocketLogClient {
    private ownAdress;
    loggerAdress: string;
    onClose: ((logger: NodeSocketLogClient, code: number) => void) | undefined;
    onError: ((logger: NodeSocketLogClient, error: Error) => void) | undefined;
    private webSocket;
    reconnect: boolean;
    reconnectInterval: number;
    constructor(ownAdress: string, loggerAdress: string, authString: string, onClose?: ((logger: NodeSocketLogClient, code: number) => void) | undefined, onError?: ((logger: NodeSocketLogClient, error: Error) => void) | undefined);
    initHealth(): void;
    sendHealthInfo(): void;
    initLogger(authString: string): void;
    message(message: string): void;
    log(severity: number | undefined, message: string, data: any): void;
}
