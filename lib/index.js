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
        var _a, _b;
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([systeminformation_1.default.disksIO(), systeminformation_1.default.networkStats(), systeminformation_1.default.fsSize()]);
        //@ts-ignore
        if (!diskInfo)
            diskInfo = {};
        let data = {
            cpu: os_1.default.loadavg()[0] * 100,
            mem_used: (1 - os_1.default.freemem() / os_1.default.totalmem()) * 100,
            io_read: (_a = diskInfo.rIO_sec) !== null && _a !== void 0 ? _a : 0,
            io_write: (_b = diskInfo.wIO_sec) !== null && _b !== void 0 ? _b : 0,
            disk_used: diskUsageInfo[0].used / diskUsageInfo[0].size * 100,
            net_in: trafficInfo[0].rx_sec / MB,
            net_out: trafficInfo[0].tx_sec / MB,
        };
        for (let key in data) {
            data[key] = +data[key].toFixed(2);
        }
        this.logMetrics(data);
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
    log(level, channel, message, data = undefined) {
        if (!this.webSocket)
            return;
        let sendData;
        if (data instanceof Error) {
            data = data.stack ? data.stack : data.message;
        }
        switch (typeof data) {
            case 'string':
                sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + data;
                break;
            case 'object':
                sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + JSON.stringify(data);
                break;
            default:
                sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"');
                break;
        }
        this.webSocket.send(sendData);
    }
    logMetrics(data) {
        if (!this.webSocket)
            return;
        this.webSocket.send(JSON.stringify(data));
    }
}
exports.default = LogClient;
