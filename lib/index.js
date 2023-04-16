"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
class LogClient {
    constructor(name, loggerAdress, authString, reconnect = true, reconnectInterval = 5000, rejectUnauthorized = false, onClose = undefined, onError = undefined, overrideLogCommand = undefined) {
        this.name = name;
        this.loggerAdress = loggerAdress;
        this.reconnect = reconnect;
        this.reconnectInterval = reconnectInterval;
        this.rejectUnauthorized = rejectUnauthorized;
        this.onClose = onClose;
        this.onError = onError;
        this.overrideLogCommand = overrideLogCommand;
        this.start(authString, rejectUnauthorized);
    }
    startMetrics(interval = 20000) {
        setInterval(() => { this.sendMetrics(); }, interval);
    }
    async sendMetrics() {
        var _a, _b;
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([systeminformation_1.default.disksIO(), systeminformation_1.default.networkStats(), systeminformation_1.default.fsSize()]);
        const MB = 1000000;
        let data = {
            cpu: os_1.default.loadavg()[0] * 100,
            mem_used: (1 - os_1.default.freemem() / os_1.default.totalmem()) * 100,
            io_read: (_a = diskInfo === null || diskInfo === void 0 ? void 0 : diskInfo.rIO_sec) !== null && _a !== void 0 ? _a : 0,
            io_write: (_b = diskInfo === null || diskInfo === void 0 ? void 0 : diskInfo.wIO_sec) !== null && _b !== void 0 ? _b : 0,
            disk_used: diskUsageInfo[0].used / diskUsageInfo[0].size * 100,
            net_in: trafficInfo[0].rx_sec / MB,
            net_out: trafficInfo[0].tx_sec / MB,
        };
        for (let key in data) {
            data[key] = +data[key].toFixed(2);
        }
        this.logMetrics(data);
    }
    start(authString, rejectUnauthorized) {
        this.webSocket =
            new ws_1.default(`${this.loggerAdress}/log?auth=${authString}&name=${this.name}`, { rejectUnauthorized })
                .on('open', () => {
                this.message('Logger connected.');
            })
                .on('error', (error) => {
                if (this.onError)
                    return this.onError(this, error);
                this.message(error.message);
            })
                .on('close', (code) => {
                this.webSocket = undefined;
                this.message('Logger disconnected. Code: ' + code);
                if (this.onClose)
                    return this.onClose(this, code);
                if (this.reconnect) {
                    setTimeout(() => {
                        this.message('Attempting reconnect.');
                        this.start(authString, rejectUnauthorized);
                    }, this.reconnectInterval);
                }
            });
    }
    message(message) {
        if (this.overrideLogCommand) {
            return this.overrideLogCommand(message, this);
        }
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }
    log(level, channel, message, data) {
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
    logMetrics(data) {
        var _a;
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify(data), (err) => {
            if (err)
                this.message(`Error while logging metrics: ${err.message}`);
        });
    }
}
exports.default = LogClient;
