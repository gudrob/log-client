"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const os_1 = __importDefault(require("os"));
const check_disk_space_1 = __importDefault(require("check-disk-space"));
class NodeSocketLogClient {
    constructor(ownAdress, loggerAdress, authString, onClose = undefined, onError = undefined) {
        this.ownAdress = ownAdress;
        this.loggerAdress = loggerAdress;
        this.onClose = onClose;
        this.onError = onError;
        this.reconnect = true;
        this.reconnectInterval = 1000;
        this.initLogger(authString);
    }
    initHealth() {
        setInterval(() => { this.sendHealthInfo(); }, 10000);
    }
    sendHealthInfo() {
        (0, check_disk_space_1.default)('/').then((diskSpace) => {
            var _a;
            let diskusage = (1 - diskSpace.free / diskSpace.size);
            let diskfree = diskSpace.free;
            let disktotal = diskSpace.size;
            (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
                server: this.ownAdress,
                severity: 0,
                data: {
                    cpus: os_1.default.loadavg(),
                    free: os_1.default.freemem,
                    total: os_1.default.totalmem,
                    disk: {
                        diskusage,
                        diskfree,
                        disktotal
                    }
                }
            }));
        });
    }
    initLogger(authString) {
        this.webSocket = new ws_1.default(this.loggerAdress + "/log?auth=" + authString);
        this.webSocket.on('open', () => {
            this.message('Logger connected.');
        });
        this.webSocket.on('error', (error) => {
            if (this.onError)
                this.onError(this, error);
            else
                this.message(error.message);
        });
        this.webSocket.on('close', (code) => {
            this.message('Logger disconnected.');
            if (this.onClose) {
                this.onClose(this, code);
            }
            else if (this.reconnect) {
                setTimeout(() => {
                    this.message('Attempting reconnect.');
                    this.initLogger(authString);
                }, this.reconnectInterval);
            }
        });
    }
    message(message) {
        console.log(`[${new Date().toISOString()} - ${this.loggerAdress}] ${message}`);
    }
    log(severity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10, message, data) {
        var _a;
        (_a = this.webSocket) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            server: this.ownAdress,
            severity,
            message,
            data
        }));
    }
}
exports.default = NodeSocketLogClient;
