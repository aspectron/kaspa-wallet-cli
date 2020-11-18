import * as grpc from '@grpc/grpc-js';
import {asyncForEach} from './helper';

interface IsayHello extends grpc.MethodDefinition<any, any>{
	path: string; // "/songs.Songs/GetSong"
    requestStream: boolean; // false
    responseStream: boolean; // false
    requestSerialize: grpc.serialize<any>;
    requestDeserialize: grpc.deserialize<any>;
    responseSerialize: grpc.serialize<any>;
    responseDeserialize: grpc.deserialize<any>;
}

export interface IRPCService{
	server: any;
	sayHello:grpc.handleUnaryCall<any, any>;
	sayRepeatHello:grpc.handleServerStreamingCall<any, any>;
	getUTXOs:grpc.handleUnaryCall<any, any>;
	//handleBidiStreamingCall
	//handleClientStreamingCall
}

export class RPCService implements IRPCService{
	server: any;
	constructor(server:any){
		//super()
		this.server = server;
	}
	sayHello(call:grpc.ServerUnaryCall<any, any>, callback:Function) {
		callback(null, {message: 'Hello ' + call.request.name});
	}

	sayRepeatHello(call:grpc.ServerWritableStream<any, any>) {
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

