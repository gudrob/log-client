"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
class LogClient {
    constructor(name, loggerAdress, authString, reconnect = true, reconnectInterval = 5000, rejectUnauthorized = false, onClose = undefined, onError = undefined) {
        this.name = name;
        this.loggerAdress = loggerAdress;
        this.reconnect = reconnect;
        this.reconnectInterval = reconnectInterval;
        this.onClose = onClose;
        this.onError = onError;
        this.start(authString, rejectUnauthorized);
    }
    startMetrics(interval) {
        setInterval(() => { this.sendMetrics(); }, interval);
    }
    async sendMetrics() {
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([systeminformation_1.default.disksIO(), systeminformation_1.default.networkStats(), systeminformation_1.default.fsSize()]);
        let data = {
            cpu: os_1.default.loadavg()[0],
            ru: os_1.default.freemem() / os_1.default.totalmem(),
            dr: diskInfo.rIO_sec,
            dw: diskInfo.wIO_sec,
            du: Math.round(diskUsageInfo[0].used / diskUsageInfo[0].size * 100),
            tin: trafficInfo[0].rx_bytes / 1024,
            tout: trafficInfo[0].tx_bytes / 1024,
        };
        this.log(undefined, undefined, undefined, data);
    }
    start(authString, rejectUnauthorized) {
        this.webSocket =
            new ws_1.default(`${this.loggerAdress}/log?auth=${authString}&name=${this.name}`, {
                rejectUnauthorized: rejectUnauthorized
            })
                .on('open', () => {
                this.message('Logger connected.');
            })
                .on('error', (error) => {
                if (this.onError)
                    return this.onError(this, error);
                this.message(error.message);
            })
                .on('close', (code) => {
                this.message('Logger disconnected. Code: ' + code);
                if (this.onClose) {
                    this.onClose(this, code);
                }
                else if (this.reconnect) {
                    setTimeout(() => {
                        this.message('Attempting reconnect.');
                        this.start(authString, rejectUnauthorized);
                    }, this.reconnectInterval);
                }
            });
    }
    message(message) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }
    log(level = 1 | 2 | 3 | 4 | 5 | 6, channel, message, data) {
        var _a;
        if (data instanceof Error) {
            data = { name: data.name, exception: data.message, stack: data.stack };
        }
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            level,
            channel,
            message,
            data
        }), (err) => {
            if (err)
                this.message(`Error while logging: ${err.message}`);
        });
    }
}
exports.default = LogClient;
