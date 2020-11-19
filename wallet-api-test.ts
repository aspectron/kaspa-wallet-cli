import {WalletApi, Api, Error} from './lib/wallet-api';

let walletApi = new WalletApi({
	appFolder:process.cwd()
});
walletApi.getBlock({blockHash:"xyz", includeBlockVerboseData:true}, (error:Error, result:Api.BlockRes|null|undefined)=>{
	console.log("getBlock:error, result", error, result);
})