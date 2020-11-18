"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCService = void 0;
const helper_1 = require("./helper");
class RPCService {
    constructor(server) {
        //super()
        this.server = server;
    }
    sayHello(call, callback) {
        callback(null, { message: 'Hello ' + call.request.name });
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
    getUTXOs(call, callback) {
        let { addresses } = call.request;
        console.log("GetUTXOs:addresses", addresses, call.request);
        let utxos = addresses.map((a, index) => {
            return {
                scriptPubKey: a + "xxxx",
                amount: index
            };
        });
        console.log("utxos", utxos);
        callback(null, { utxos });
    }
}
exports.RPCService = RPCService;
