const kaspaNodeModule = require('kaspa-node-module');
const { Wallet, bitcoreKaspaSetup } = kaspaNodeModule.default;
import {log} from './helper';
import {Api, CB, Error} from './interfaces';
import {GRPCClient} from './grpc-client';
export {Api, CB, Error};

bitcoreKaspaSetup();

export class WalletApi{

	//server: any;
	client: GRPCClient;

	constructor(options:any){
		//this.server = any;
		this.client = new GRPCClient({
			appFolder:options.appFolder
		});
	}

	getBlock(req:Api.BlockReq, cb:CB<Api.BlockRes>){
		this.client.call({
			getBlockRequest:{hash:req.blockHash}
		}, cb)
	}

	async testWallet(password:string){
		const wallet = new Wallet();
        const encryptedMnemonic = await wallet.export(password);

        log("mnemonic created", wallet.mnemonic)
        log("Encrypted Mnemonic", encryptedMnemonic)

        let _wallet = await Wallet.import(password, encryptedMnemonic)
        log("wallet imported", _wallet.mnemonic)
	}
}