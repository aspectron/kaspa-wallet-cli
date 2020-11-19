import {WalletApi, Api, Error} from './lib/wallet-api';

let walletApi = new WalletApi({
	appFolder:process.cwd()
});
walletApi.getBlock({blockHash:"xyz"}, (error:Error, result:Api.BlockRes|null|undefined)=>{
	console.log("getBlock:result", error, result);
})