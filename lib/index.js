"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
const MB = 1000000; //one MB according to IEC 80000-13
const SINGLE_APOSTROPHE_REGEX = /'/g;
const MetricsBufferSize = 7 * 4 + 1;
class LogClient {
    constructor(name, loggerAdress, reconnect = true, reconnectIntervalMs = 5000, rejectUnauthorized = false, perMessageDeflate = undefined, onClose = undefined, onError = undefined) {
        this.name = name;
        this.loggerAdress = loggerAdress;
        this.reconnect = reconnect;
        this.reconnectIntervalMs = reconnectIntervalMs;
        this.rejectUnauthorized = rejectUnauthorized;
        this.perMessageDeflate = perMessageDeflate;
        this.onClose = onClose;
        this.onError = onError;
    }
    /**
     * Starts the predefined metrics logger, which is designed to work with gudatr/log-server
     * You should start the metrics logging only on one thread per application
     */
    startMetrics(interval = 20000) {
        setInterval(() => { this.sendMetrics(); }, interval);
    }
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
    async sendMetrics() {
        if (!this.webSocket)
            return;
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([systeminformation_1.default.disksIO(), systeminformation_1.default.networkStats(), systeminformation_1.default.fsSize()]);
        if (!this.webSocket)
            return;
        let metricsBuffer = Buffer.allocUnsafe(MetricsBufferSize);
        metricsBuffer[0] = 0;
        metricsBuffer.writeFloatBE(os_1.default.loadavg()[0] * 100, 1);
        metricsBuffer.writeFloatBE((1 - os_1.default.freemem() / os_1.default.totalmem()) * 100, 5);
        metricsBuffer.writeFloatBE(diskInfo.rIO_sec ? diskInfo.rIO_sec : 0, 9);
        metricsBuffer.writeFloatBE(diskInfo.wIO_sec ? diskInfo.wIO_sec : 0, 13);
        metricsBuffer.writeFloatBE(diskUsageInfo[0].used / diskUsageInfo[0].size * 100, 17);
        metricsBuffer.writeFloatBE(trafficInfo[0].rx_sec / MB, 21);
        metricsBuffer.writeFloatBE(trafficInfo[0].tx_sec / MB, 25);
        this.webSocket.send(metricsBuffer);
    }
    open() {
        return !!this.webSocket;
    }
    /**
     * Initializes the websocket connection
     * @param passphrase - the passphrase for the logging endpoint
     * @param rejectUnauthorized - if wss is chosen, determines if self-signed certificates, etc. will be rejected
     * @param perMessageDeflate - enables per message deflate if the server also supports it
     * @throws if the logger address is invalid
     * @returns
     */
    start(passphrase, rejectUnauthorized, perMessageDeflate) {
        let url = `${this.loggerAdress}/log?auth=${passphrase}&name=${this.name}`;
        new URL(url);
        this.webSocket = new ws_1.default(url, {
            rejectUnauthorized,
            perMessageDeflate
        })
            .on('error', (error) => {
            if (this.onError)
                return this.onError(this, error);
        })
            .on('close', (code) => {
            this.webSocket = undefined;
            if (this.onClose)
                return this.onClose(this, code);
            if (this.reconnect) {
                setTimeout(() => {
                    this.start(passphrase, rejectUnauthorized, perMessageDeflate);
                }, this.reconnectIntervalMs);
            }
        });
    }
    /**
     * Log a message with the provided parameters
     * @param level The message's level ranging from 1 to 6 where 1 is the least and 6 the most important
     * @param channel A channel name to group messages by on the server side, shoud not contain apostrophes
     * @param message The message itself, shoud not contain apostrophes
     * @param data Data to provide context for the message
     * @returns
     */
    log(level, channel, message, data = undefined) {
        if (!this.webSocket)
            return;
        if (data instanceof Error) {
            data = data.stack ? data.stack : data.message;
        }
        switch (typeof data) {
            case 'string':
                this.webSocket.send(level + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + data);
                break;
            case 'object':
                this.webSocket.send(level + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + JSON.stringify(data));
                break;
            default:
                this.webSocket.send(level + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"'));
                break;
        }
    }
}
exports.default = LogClient;
