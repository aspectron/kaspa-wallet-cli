const PROTO_PATH = __dirname + '/protos/kaspad.proto';
import {GrpcObject, ProtobufTypeDefinition} from '@grpc/grpc-js/build/src/make-client';
//import {RequestType} from '@grpc/grpc-js';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
});

const proto:GrpcObject = grpc.loadPackageDefinition(packageDefinition);
const kaspadProto = proto.kaspad;

const asyncForEach = (fns:Array<Function>, callback:Function)=>{
	let digest=()=>{
		let fn = fns.shift();
		if(!fn)
			return callback();

		fn(()=>setTimeout(digest,0));
	}

	digest();
}

/**
 * Implements the SayHello RPC method.
 */
function sayHello(call:grpc.ServerUnaryCall<RequestType,ResponseType>, callback:Function) {
	callback(null, {message: 'Hello ' + call.request.name});
}

function sayRepeatHello(call:grpc.ServerWritableStream<any,ResponseType>) {
	let senders = [];
	function sender(name:string) {
		return (callback:Function) => {
			call.write({message: 'Hey! ' + name});
			setTimeout(callback, 500); // in ms
		};
	}
	for (let i = 0; i < call.request.count; i++) {
		senders[i] = sender(call.request.name + (i+1));
	}

	asyncForEach(senders, ()=>{
		call.end();
	});
}

function getUTXOs(call:grpc.ServerUnaryCall<any,ResponseType>, callback:Function){
	let {addresses} = call.request
	console.log("GetUTXOs:addresses", addresses, call.request)
	let utxos = addresses.map((a:any, index:number)=>{
		return {
			scriptPubKey: a+"xxxx",
			amount:index
		}
	});
	console.log("utxos", utxos)
	callback(null, {utxos});
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