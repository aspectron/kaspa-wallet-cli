"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_api_1 = require("./lib/wallet-api");
let walletApi = new wallet_api_1.WalletApi({
    appFolder: process.cwd()
});
walletApi.getBlock({ blockHash: "xyz", includeBlockVerboseData: true }, (error, result) => {
    console.log("getBlock:error, result", error, result);
});
