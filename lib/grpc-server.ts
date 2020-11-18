import {
	GrpcObject, ProtobufTypeDefinition, PackageDefinition,
	ServiceClientConstructor
} from '@grpc/grpc-js/build/src/make-client';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {RPCService, IRPCService} from './rpc-service';

interface KaspadPackage extends GrpcObject{
    RPC: ServiceClientConstructor
}

interface KaspadProto extends GrpcObject{
    kaspad: KaspadPackage
}



export class GRPCServer{
	grpcServer: grpc.Server;//IGRPCServer;
	options: any;
	kaspadPackage?: KaspadPackage;
	rpcService: IRPCService;

	constructor(options:any={}){
		let appFolder = options?.appFolder || __dirname+"/../";
		this.options = Object.assign({
			protoPath: appFolder + '/protos/kaspad.proto',
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

		const proto:KaspadProto = <KaspadProto>grpc.loadPackageDefinition(packageDefinition);
		this.kaspadPackage = proto.kaspad;
		//console.log("proto.kaspad", proto)
	}

	/**
	 * Starts an RPC server that receives requests for the RPC service at the
	 * server port
	 */
	start() {
		if(!this.kaspadPackage)
			return
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
				console.log(`GPRC server listening at ${serverHost}`)
			}
		);
	}
}