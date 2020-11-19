"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletApi = void 0;
const kaspaNodeModule = require('kaspa-node-module');
const { Wallet, bitcoreKaspaSetup } = kaspaNodeModule.default;
const helper_1 = require("./helper");
const grpc_client_1 = require("./grpc-client");
bitcoreKaspaSetup();
class WalletApi {
    constructor(options) {
        //this.server = any;
        this.client = new grpc_client_1.GRPCClient({
            appFolder: options.appFolder
        });
    }
    getBlock(req, cb) {
        this.client.call({
            getBlockRequest: { hash: req.blockHash }
        }, cb);
    }
    testWallet(password) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = new Wallet();
            const encryptedMnemonic = yield wallet.export(password);
            helper_1.log("mnemonic created", wallet.mnemonic);
            helper_1.log("Encrypted Mnemonic", encryptedMnemonic);
            let _wallet = yield Wallet.import(password, encryptedMnemonic);
            helper_1.log("wallet imported", _wallet.mnemonic);
        });
    }
}
exports.WalletApi = WalletApi;
