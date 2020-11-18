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
Object.defineProperty(exports, "__esModule", { value: true });
const PROTO_PATH = __dirname + '/protos/kaspad.proto';
//import {RequestType} from '@grpc/grpc-js';
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDefinition);
const kaspadProto = proto.kaspad;
const asyncForEach = (fns, callback) => {
    let digest = () => {
        let fn = fns.shift();
        if (!fn)
            return callback();
        fn(() => setTimeout(digest, 0));
    };
    digest();
};
/**
 * Implements the SayHello RPC method.
 */
function sayHello(call, callback) {
    callback(null, { message: 'Hello ' + call.request.name });
}
function sayRepeatHello(call) {
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
    asyncForEach(senders, () => {
        call.end();
    });
}
function getUTXOs(call, callback) {
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
/**
 * Starts an RPC server that receives requests for the RPC service at the
 * sample server port
 * /
function main() {
    const server = new grpc.Server();
    server.addService(kaspadProto.RPC.service, {sayHello, sayRepeatHello, getUTXOs});
    //server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
    //server.start();
    server.bindAsync(
        '0.0.0.0:9090',
        grpc.ServerCredentials.createInsecure(),
        (err, port)=>{
            if(err)
                return console.log("bindAsync:err", err)
            server.start();
        }
    );
}

main();
*/ 
