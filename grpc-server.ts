const PROTO_PATH = __dirname + '/protos/kaspad.proto';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
});
const kaspadProto = grpc.loadPackageDefinition(packageDefinition).kaspad;

const asyncForEach = (fns, callback)=>{
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
function sayHello(call, callback) {
	callback(null, {message: 'Hello ' + call.request.name});
}

function sayRepeatHello(call) {
	let senders = [];
	function sender(name) {
		return (callback) => {
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

function getUTXOs(call, callback){
	let {addresses} = call.request
	console.log("GetUTXOs:addresses", addresses, call.request)
	let utxos = addresses.map((a, index)=>{
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
 */
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