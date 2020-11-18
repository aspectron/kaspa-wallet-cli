const kaspaNodeModule = require('kaspa-node-module');
const { Wallet, bitcoreKaspaSetup } = kaspaNodeModule.default;
import {log} from './helper';

bitcoreKaspaSetup();

export class WalletApi{

	constructor(server?:any){
		//this.server = any;
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