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
exports.GRPCServer = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const rpc_service_1 = require("./rpc-service");
class GRPCServer {
    constructor(options = {}) {
        this.options = Object.assign({
            protoPath: __dirname + '/../protos/kaspad.proto',
            serverHost: '0.0.0.0:9090'
        }, options);
        this.grpcServer = new grpc.Server();
        this.rpcService = new rpc_service_1.RPCService(this);
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
        this.kaspadPackage = proto.kaspad;
        console.log("proto.kaspad", proto);
    }
    /**
     * Starts an RPC server that receives requests for the RPC service at the
     * sample server port
     */
    start() {
        this.grpcServer.addService(this.kaspadPackage.RPC.service, this.rpcService);
        //server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
        //server.start();
        const { serverHost } = this.options;
        this.grpcServer.bindAsync(serverHost, grpc.ServerCredentials.createInsecure(), (err) => {
            if (err)
                return console.log("bindAsync:err", err);
            this.grpcServer.start();
        });
    }
}
exports.GRPCServer = GRPCServer;
