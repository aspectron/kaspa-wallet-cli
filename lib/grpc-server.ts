import {
	GrpcObject, ProtobufTypeDefinition, PackageDefinition,
	ServiceClientConstructor
} from '@grpc/grpc-js/build/src/make-client';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {RPCService, IRPCService} from './rpc-service';




class GRPCServer{
	grpcServer: any;//grpc.Server;
	options: any;
	kaspadPackage:any;
	rpcService: IRPCService;

	constructor(options:any={}){

		this.options = Object.assign({
			protoPath: __dirname + '/../protos/kaspad.proto',
			serverHost: '0.0.0.0:9090'
		}, options);
		this.grpcServer = new grpc.Server();
		this.rpcService = new RPCService(this);
		this.init();
	}

	init(){
		const packageDefinition:PackageDefinition = protoLoader.loadSync(this.options.protoPath, {
			keepCase: true,
			longs: String,
			enums: String,
			defaults: true,
			oneofs: true
		});

		const proto:GrpcObject = grpc.loadPackageDefinition(packageDefinition);
		this.kaspadPackage = proto.kaspad;
		console.log("proto.kaspad", proto)
	}

	/**
	 * Starts an RPC server that receives requests for the RPC service at the
	 * sample server port
	 */
	start() {
		this.grpcServer.addService(this.kaspadPackage.RPC.service, this.rpcService);
		//server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
		//server.start();
		const {serverHost} = this.options;
		this.grpcServer.bindAsync(
			serverHost,
			grpc.ServerCredentials.createInsecure(),
			(err:any)=>{
				if(err)
					return console.log("bindAsync:err", err)
				this.grpcServer.start();
			}
		);
	}
}

let server = new GRPCServer();
server.start();