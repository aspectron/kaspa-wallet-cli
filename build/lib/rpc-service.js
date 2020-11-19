"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCService = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const helper_1 = require("./helper");
const wallet_api_1 = require("./wallet-api");
__exportStar(require("./interfaces"), exports);
const walletApi = new wallet_api_1.WalletApi({
    appFolder: process.cwd()
});
class RPCService {
    constructor(server) {
        //super()
        this.server = server;
    }
    getBlock(call, cb) {
        console.log("block:request", call.request);
        cb({ code: grpc.status.OK, details: "TODO" });
        walletApi.getBlock(call.request, cb);
    }
    sayHello(call, cb) {
        walletApi.testWallet("xxxxxx");
        cb(null, { message: 'Hello ' + call.request.name });
    }
    sayRepeatHello(call) {
        let senders = [];
        function sender(name) {
            return (callback) => {
                call.write({ message: 'Hey! ' + name });
                setTimeout(callback, 500); // in ms
            };
        }
        for (let i = 0; i < call.request.count; i++) {
            senders[i] = sender(call.request.name + (i + 1));
        }
        helper_1.asyncForEach(senders, () => {
            call.end();
        });
    }
}
exports.RPCService = RPCService;
