<<<<<<< HEAD
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
class LogClient {
    constructor(ownAdress, loggerAdress, authString, reconnect = true, reconnectInterval = 5000, onClose = undefined, onError = undefined) {
        this.ownAdress = ownAdress;
        this.loggerAdress = loggerAdress;
        this.reconnect = reconnect;
        this.reconnectInterval = reconnectInterval;
        this.onClose = onClose;
        this.onError = onError;
        this.Start(authString);
    }
    StartMetrics() {
        setInterval(() => { this.SendMetrics(); }, 5000);
    }
    async SendMetrics() {
        let [diskInfo, trafficInfo, diskUsageInfo] = await Promise.all([systeminformation_1.default.disksIO(), systeminformation_1.default.networkStats(), systeminformation_1.default.fsSize()]);
        let data = {
            cpu: os_1.default.loadavg()[0],
            ram_free: os_1.default.freemem,
            ram_total: os_1.default.totalmem,
            disk_read: diskInfo.rIO_sec,
            disk_write: diskInfo.wIO_sec,
            disk_wait: diskInfo.tWaitTime,
            disk_usage: diskUsageInfo[0].used,
            disk_total: diskUsageInfo[0].size,
            traffic_in: trafficInfo[0].rx_bytes / 1024,
            traffic_out: trafficInfo[0].tx_bytes / 1024,
        };
        this.Log(1, 'metrics', undefined, data);
    }
    Start(authString) {
        this.webSocket =
            new ws_1.default(`${this.loggerAdress}/log?auth=${authString}&name=${this.ownAdress}`)
                .on('open', () => {
                this.Message('Logger connected.');
            })
                .on('error', (error) => {
                if (this.onError)
                    this.onError(this, error);
                else
                    this.Message(error.message);
            })
                .on('close', (code) => {
                this.Message('Logger disconnected. Code: ' + code);
                if (this.onClose) {
                    this.onClose(this, code);
                }
                else if (this.reconnect) {
                    setTimeout(() => {
                        this.Message('Attempting reconnect.');
                        this.Start(authString);
                    }, this.reconnectInterval);
                }
            });
    }
    Message(message) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }
    Log(severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, channel, message, data) {
        var _a;
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            time: Date.now(),
            channel,
            server: this.ownAdress,
            severity,
            message,
            data
        }));
    }
}
exports.default = LogClient;
=======
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
class LogClient {
    constructor(ownAdress, loggerAdress, authString, onClose = undefined, onError = undefined) {
        this.ownAdress = ownAdress;
        this.loggerAdress = loggerAdress;
        this.onClose = onClose;
        this.onError = onError;
        this.reconnect = true;
        this.reconnectInterval = 1000;
        this.Start(authString);
    }
    StartMetrics() {
        setInterval(() => { this.SendMetrics(); }, 10000);
    }
    async SendMetrics() {
        var _a;
        let diskInfo = await systeminformation_1.default.disksIO();
        let trafficInfo = await systeminformation_1.default.networkStats();
        let diskUsageInfo = await systeminformation_1.default.fsSize();
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            server: this.ownAdress,
            severity: 0,
            data: {
                cpu: os_1.default.loadavg()[0],
                ram_free: os_1.default.freemem,
                ram_total: os_1.default.totalmem,
                disk_read: diskInfo.rIO_sec,
                disk_write: diskInfo.wIO_sec,
                disk_wait: diskInfo.tWaitTime,
                disk_usage: diskUsageInfo[0].size,
                disk_total: diskUsageInfo[0].used,
                traffic_in: trafficInfo[0].rx_bytes / 1024,
                traffic_out: trafficInfo[0].tx_bytes / 1024,
            }
        }));
    }
    Start(authString) {
        this.webSocket = new ws_1.default(`${this.loggerAdress}/log?auth=${authString}&name=${this.ownAdress}`);
        this.webSocket.on('open', () => {
            this.Message('Logger connected.');
        });
        this.webSocket.on('error', (error) => {
            if (this.onError)
                this.onError(this, error);
            else
                this.Message(error.message);
        });
        this.webSocket.on('close', (code) => {
            this.Message('Logger disconnected.');
            if (this.onClose) {
                this.onClose(this, code);
            }
            else if (this.reconnect) {
                setTimeout(() => {
                    this.Message('Attempting reconnect.');
                    this.Start(authString);
                }, this.reconnectInterval);
            }
        });
    }
    Message(message) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }
    Log(severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, message, channel, data) {
        var _a;
        if (data instanceof Error) {
            data = { stack: data.stack };
        }
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            time: Date.now(),
            server: this.ownAdress,
            severity,
            message,
            channel,
            data
        }));
    }
}
exports.default = LogClient;
>>>>>>> 00111096e6f7c64fc6c600f8150ca5ca5fdf0329
