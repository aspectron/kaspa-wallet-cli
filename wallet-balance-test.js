#!/usr/bin/env node

const { Wallet, kaspaSetup } = require('kaspa-wallet');
const {RPC} = require('kaspa-wallet-grpc-node');

kaspaSetup();

const rpc = new RPC({
    clientConfig:{
        host:"127.0.0.1:16210"
    }
});
//rpc.client.verbose = true;

Wallet.setRPC(rpc)


let dump = (label, text, deco1="-", deco2="=")=>{
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}

const run = async ()=>{

    //let wallet = Wallet.fromMnemonic("live excuse stone acquire remain later core enjoy visual advice body play");
    let wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus");
    dump("mnemonic created", wallet.mnemonic)

    wallet.on("blue-score-changed", (result)=>{
        let {blueScore} = result;
        console.log("blue-score-changed:result, blueScore", result, blueScore)
    })

    wallet.on("balance-update", ()=>{
        console.log("wallet:balance-update", wallet.balance)
    })

    wallet.syncVirtualSelectedParentBlueScore()
    .catch(e=>{
        console.log("syncVirtualSelectedParentBlueScore:error", e)
    })

    
    let debugInfo = await wallet.addressDiscovery(20, true)
    .catch(e=>{
        console.log("addressDiscovery:error", e)
    })

    dump("receiveAddress", wallet.receiveAddress)
    if(!debugInfo)
        return
    /*
    debugInfo.forEach((info, address)=>{
        console.log("debugInfo",  address, info)
    })
    */

    /*
    let response = await wallet.submitTransaction({
        toAddr: "kaspatest:qrhefqj5c80m59d9cdx4ssxw96vguvn9fgy6yc0qtd",
        amount: 1000,
        fee: 400
    }, true).catch(async (error)=>{
        console.log("\n\nerror", error)
    })

    console.log("\n\nResponse", response)
    */

    const addresses = Object.keys(wallet.addressManager.all);
    const utxosChangedCallback = (res)=>{
        console.log("utxosChangedCallback:res", JSON.stringify(res, null, "\t"))
    }
    let UtxoChangedRes = await rpc.subscribeUtxosChanged(addresses, utxosChangedCallback);
    //console.log("addresses", addresses)
    console.log("UtxoChangedRes", UtxoChangedRes)
    console.log("wallet.balance", wallet.balance)

    //rpc.disconnect();
}

Wallet.onReady(()=>{
    run();
});

