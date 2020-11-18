import * as grpc from '@grpc/grpc-js';
import {Metadata, ServerUnaryCall,
ServerReadableStream, ServerWritableStream, ServerDuplexStream} from '@grpc/grpc-js';
import {ServerErrorResponse, ServerStatusResponse} from '@grpc/grpc-js/build/src/server-call';

/*
export declare enum Status{
	TODO = 99,
	OK = 0,
	ERROR = 1
}


export interface ServerErrorRes{
	code: Status,
	error:string,
	details?:string
}
*/

export namespace Api {

	export interface BlockReq{
		hash:string
	}

	export interface BlockRes {
		blockHash: string;
		parentBlockHashes: string[];
		version: number;
		hashMerkleRoot: string;
		acceptedIdMerkleRoot: string;
		utxoCommitment: string;
		timestamp: number;
		bits: number;
		nonce: number;
		acceptingBlockHash: string;
		blueScore: number;
		isChainBlock: boolean;
		mass: number;
	}

	export interface Utxo {
		transactionId: string;
		value: number;
		scriptPubKey: string;
		acceptingBlockHash: string;
		acceptingBlockBlueScore: number;
		index: number;
		isSpent: boolean;
		isCoinbase: boolean;
		isSpendable: boolean;
		confirmations: number;
	}
	export interface UtxoResponse {
		utxos: Utxo[];
	}
	export interface ErrorResponse {
		errorCode: number;
		errorMessage: string;
	}

	export interface TransactionInput {
		previousTransactionId: string;
		previousTransactionOutputIndex: string;
		scriptSig: string;
		sequence: string;
		address: string;
	}
	export interface TransactionOutput {
		value: number;
		scriptPubKey: string;
		address: string;
	}
	export interface Transaction {
		transactionId: string;
		transactionHash: string;
		acceptingBlockHash: string;
		acceptingBlockBlueScore: number;
		subnetworkId: string;
		lockTime: number;
		gas: number;
		payloadHash: string;
		payload: string;
		inputs: Array<TransactionInput>;
		outputs: Array<TransactionOutput>;
		mass: number;
		confirmations: number;
	}

	interface TransactionsResponse {
		transactions: Transaction[];
	}
	type SendTxResponse = boolean;
}

export interface IHelloReq{ name:string }
export interface IHelloRes{ message:string }
export interface IHelloStreamReq{ name:string; count:number; }

/*
export declare type sendUnaryData<ResponseType> = (error: ServerErrorRes | ServerErrorResponse | ServerStatusResponse | null, value?: ResponseType | null, trailer?: Metadata, flags?: number) => void;
export declare type handleUnaryCall<RequestType, ResponseType> = (call: ServerUnaryCall<RequestType, ResponseType>, callback: sendUnaryData<ResponseType>) => void;
export declare type handleClientStreamingCall<RequestType, ResponseType> = (call: ServerReadableStream<RequestType, ResponseType>, callback: sendUnaryData<ResponseType>) => void;
export declare type handleServerStreamingCall<RequestType, ResponseType> = (call: ServerWritableStream<RequestType, ResponseType>) => void;
export declare type handleBidiStreamingCall<RequestType, ResponseType> = (call: ServerDuplexStream<RequestType, ResponseType>) => void;
export declare type HandleCall<RequestType, ResponseType> = handleUnaryCall<RequestType, ResponseType> | handleClientStreamingCall<RequestType, ResponseType> | handleServerStreamingCall<RequestType, ResponseType> | handleBidiStreamingCall<RequestType, ResponseType>;
export declare type UntypedHandleCall2 = HandleCall<any, any>;
export interface UntypedServiceImplementation {
    [name: string]: UntypedHandleCall2;
}
export declare type ServiceDefinition<ImplementationType = UntypedServiceImplementation> = {
    readonly [index in keyof ImplementationType]: grpc.MethodDefinition<any, any>;
}
*/
export interface IRPCService extends grpc.UntypedServiceImplementation{
}
/*
export interface IGRPCServer extends grpc.Server{
	addService(service: ServiceDefinition, implementation: UntypedServiceImplementation): void;
}
*/