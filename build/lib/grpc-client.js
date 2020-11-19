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
exports.GRPCClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
class GRPCClient {
    constructor(options = {}) {
        this.callbacks = [];
        let appFolder = (options === null || options === void 0 ? void 0 : options.appFolder) || __dirname + "/../";
        this.options = Object.assign({
            protoPath: appFolder + '/protos/messages.proto',
            serverHost: 'localhost:16210',
            retryDelay: 2000
        }, options);
        this.init();
    }
    init() {
        const packageDefinition = protoLoader.loadSync(this.options.protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const proto = grpc.loadPackageDefinition(packageDefinition);
        this.protoPkg = proto.protowire;
        this.connectStream();
    }
    connectStream() {
        if (!this.protoPkg)
            return;
        const { serverHost, retryDelay } = this.options;
        let stream;
        try {
            const client = new this.protoPkg.RPC(serverHost, grpc.credentials.createInsecure());
            stream = client.MessageStream(() => {
                //console.log("MessageStream fn")
            });
            stream.on("error", (error) => {
                if (error.code == grpc.status.UNAVAILABLE) {
                    stream = null;
                    this.stream = null;
                    console.log("stream error:", error.details);
                    setTimeout(() => this.connectStream(), retryDelay);
                }
                else {
                    console.log("stream error:", error);
                    let cb = this.callbacks.shift();
                    if (cb) {
                        cb(error);
                    }
                }
            });
        }
        catch (err) {
            console.log("client connect error:", err);
            return;
        }
        if (!stream)
            return;
        this.stream = stream;
        //console.log("stream", stream);
        //stream.on('metadata', function(...args) {
        //	console.log('stream metadata', args);
        //});
        stream.on('data', (data) => {
            //stream.end();
            let cb = this.callbacks.shift();
            console.log('stream data', data, cb);
            if (cb) {
                cb(null, data);
            }
        });
        stream.on('end', () => {
            //console.log('stream end');
        });
        let req = {
            getUTXOsByAddressRequest: {}
            //getBlockDagInfoRequest:{}
        };
        //stream.write(req);
    }
    call(data, cb) {
        if (!this.stream)
            return cb({ defaults: "client not connected" });
        this.callbacks.push(cb);
        this.stream.write(data);
    }
}
exports.GRPCClient = GRPCClient;
