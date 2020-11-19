import * as grpc from '@grpc/grpc-js';
import {asyncForEach} from './helper';
import {WalletApi} from './wallet-api';
import {
	IRPCService,
	IHelloReq, IHelloStreamReq, IHelloRes, Api
} from './interfaces';

export * from './interfaces';

const walletApi:WalletApi = new WalletApi({
	appFolder:process.cwd()
});


export class RPCService implements IRPCService{
	[name: string]: grpc.UntypedHandleCall;

	server: any;

	constructor(server:any){
		//super()
		this.server = server;
	}

	getBlock(call:grpc.ServerUnaryCall<Api.BlockReq, Api.BlockRes>, cb:grpc.sendUnaryData<Api.BlockRes>){
		console.log("block:request", call.request)
		cb({code:grpc.status.OK, details:"TODO"});
		walletApi.getBlock(call.request, cb);
	}

	sayHello(call:grpc.ServerUnaryCall<IHelloReq, IHelloRes>, cb:grpc.sendUnaryData<IHelloRes>) {
		walletApi.testWallet("xxxxxx");
		cb(null, {message: 'Hello ' + call.request.name});
	}

	sayRepeatHello(call:grpc.ServerWritableStream<IHelloStreamReq, IHelloRes>) {
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

	/*
	getUTXOs(call:grpc.ServerUnaryCall<any, any>, cb:Function){
		let {addresses} = call.request
		console.log("GetUTXOs:addresses", addresses, call.request)
		let utxos = addresses.map((a:any, index:number)=>{
			return {
				scriptPubKey: a+"xxxx",
				amount:index
			}
		});
		console.log("utxos", utxos)
		cb(null, {utxos});
	}
	*/
}

