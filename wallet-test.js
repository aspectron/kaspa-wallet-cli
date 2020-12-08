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


    let debugInfo = await wallet.addressDiscovery(20, true)
    .catch(e=>{
        console.log("addressDiscovery:error", e)
    })

    dump("address", wallet.receiveAddress)

    //let {utxoIds, utxos} = wallet.utxoSet.selectUtxos(1000);
    //console.log("utxos", utxos);
    //let utxo = utxos[0];
    //if(utxo){
        //let info = debugInfo.get(utxo.txId);
        //console.log("txid --> utxos,address", utxo.txId)
        //console.log(info);
        /*
        let req = {
            ids:[{bytes: Buffer.from(utxo.txId, 'hex').toString("base64")}]
        }
        console.log("requestTransactions:req", JSON.stringify({"requestTransactions":req}))
        let response = await rpc.request("requestTransactions", req).catch(e=>{
            console.log("requestTransactions:error", e)
        })

        console.log("\nrequestTransactions:response", response)
        */
    //}

    let response = await wallet.submitTransaction({
        toAddr: "kaspatest:qrhefqj5c80m59d9cdx4ssxw96vguvn9fgy6yc0qtd",
        amount: 1000,
        fee: 400
    }, true).catch(async (error)=>{
        console.log("\n\nerror", error)
    })

    console.log("\n\nResponse", response)

    rpc.disconnect();
}

//run();

const testNotification = async(name="BlockAdded")=>{
    let callback = (response)=>{
        console.log(`${name}Notification`, response)
    }
    let response = await rpc[`subscribe${name}`](callback)
    .catch(e=>{
        console.log(`notify${name}Request:error`, e)
    })

    console.log(`notify${name}Response`, response);
}


testNotification();
