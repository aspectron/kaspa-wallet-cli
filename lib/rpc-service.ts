import * as grpc from '@grpc/grpc-js';
import {asyncForEach} from './helper';

interface IHelloReq{
	name:string
}
interface IHelloRes{
	message:string
}
interface IHelloStreamReq{
	name:string;
	count:number;
}

export interface IRPCService extends grpc.UntypedServiceImplementation{}

export class RPCService implements IRPCService{
	[name: string]: grpc.UntypedHandleCall;

	server: any;
	constructor(server:any){
		//super()
		this.server = server;
	}
	sayHello(call:grpc.ServerUnaryCall<IHelloReq, IHelloRes>, callback:Function) {
		callback(null, {message: 'Hello ' + call.request.name});
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

	getUTXOs(call:grpc.ServerUnaryCall<any, any>, callback:Function){
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
}

