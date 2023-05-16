"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
const MB = 1000000;
const SINGLE_APOSTROPHE_REGEX = /'/g;
class LogClient {
    constructor(name, loggerAdress, authString, reconnect = true, reconnectInterval = 5000, rejectUnauthorized = false, perMessageDeflate, onClose, onError, overrideLogCommand) {
        this.name = name;
        this.loggerAdress = loggerAdress;
        this.reconnect = reconnect;
        this.reconnectInterval = reconnectInterval;
        this.rejectUnauthorized = rejectUnauthorized;
        this.perMessageDeflate = perMessageDeflate;
        this.onClose = onClose;
        this.onError = onError;
        this.overrideLogCommand = overrideLogCommand;
        this.start(authString, rejectUnauthorized, perMessageDeflate);
    }
    startMetrics(interval = 20000) {
        setInterval(() => { this.sendMetrics(); }, interval);
    }
    async sendMetrics() {
        var _a, _b;
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([systeminformation_1.default.disksIO(), systeminformation_1.default.networkStats(), systeminformation_1.default.fsSize()]);
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
    start(authString, rejectUnauthorized, perMessageDeflate) {
        let url = `${this.loggerAdress}/log?auth=${authString}&name=${this.name}`;
        try {
            new URL(url);
        }
        catch (err) {
            return this.message('Invalid url ' + url);
        }
        this.webSocket = new ws_1.default(url, {
            rejectUnauthorized,
            perMessageDeflate
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
            this.webSocket = undefined;
            this.message('Logger disconnected. Code: ' + code);
            if (this.onClose)
                return this.onClose(this, code);
            if (this.reconnect) {
                setTimeout(() => {
                    this.message('Attempting reconnect.');
                    this.start(authString, rejectUnauthorized, perMessageDeflate);
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
    log(level, channel, message, data = undefined) {
        if (!this.webSocket)
            return;
        if (data instanceof Error) {
            data = { err: data.stack };
        }
        let sendData;
        if (data) {
            sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + JSON.stringify(data);
        }
        else {
            sendData = level + "'" + channel.replace(SINGLE_APOSTROPHE_REGEX, '"') + "'" + message.replace(SINGLE_APOSTROPHE_REGEX, '"');
        }
        this.webSocket.send(sendData, (err) => {
            if (err)
                this.message(`Error while logging: ${err.message}`);
        });
    }
    logMetrics(data) {
        if (!this.webSocket)
            return;
        this.webSocket.send(JSON.stringify(data), (err) => {
            if (err)
                this.message(`Error while logging metrics: ${err.message}`);
        });
    }
}
exports.default = LogClient;
