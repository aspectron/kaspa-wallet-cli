import {PackageDefinition} from '@grpc/grpc-js/build/src/make-client';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import {KaspadPackage, MessagesProto} from './interfaces';


export class GRPCClient{
	options: any;
	stream: any;
	callbacks:Array<Function> = [];
	protoPkg?:KaspadPackage;

	constructor(options:any={}){
		let appFolder = options?.appFolder || __dirname+"/../";
		this.options = Object.assign({
			protoPath: appFolder + '/protos/messages.proto',
			serverHost: 'localhost:16210',
			retryDelay: 2000
		}, options);
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

		const proto:MessagesProto = <MessagesProto>grpc.loadPackageDefinition(packageDefinition);
		this.protoPkg = proto.protowire;

		this.connectStream();
	}
	connectStream(){
		if(!this.protoPkg)
			return
		const {serverHost, retryDelay} = this.options;
		let stream:any;
		try{
			const client = new this.protoPkg.RPC(serverHost,
							grpc.credentials.createInsecure());
		

			stream = client.MessageStream(()=>{
				//console.log("MessageStream fn")
			});
			stream.on("error", (error:any)=>{
				if(error.code == grpc.status.UNAVAILABLE){
					stream = null;
					this.stream = null;
					console.log("stream error:", error.details)
					setTimeout(()=>this.connectStream(), retryDelay);
				}else{
					console.log("stream error:", error)
					let cb = this.callbacks.shift();
					if(cb){
						cb(error);
					}
				}
			})
		}catch(err){
			console.log("client connect error:", err)
			return;
		}
		if(!stream)
			return
		this.stream = stream;

		//console.log("stream", stream);
		//stream.on('metadata', function(...args) {
		//	console.log('stream metadata', args);
		//});
		stream.on('data', (data:any)=>{
			//stream.end();
			let cb = this.callbacks.shift();
			console.log('stream data', data, cb);
			if(cb){
				if(data.payload){
					let result:any = data[data.payload];
					if(result.error){
						if(result.error.message){
							result.error.details = result.error.message;
							delete result.error.message;
						}
						return cb(result.error);
					}
					cb(null, result);
				}
				
			}
		});
		stream.on('end', ()=>{
			//console.log('stream end');
		});
		let req = {
			getUTXOsByAddressRequest:{}
			//getBlockDagInfoRequest:{}
		}
		//stream.write(req);
	}
	call(data:any, cb:Function){
		if(!this.stream)
			return cb({defaults:"client not connected"})
		this.callbacks.push(cb);
		this.stream.write(data);
	}
}