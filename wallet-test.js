#!/usr/bin/env node
/*
const bitcoin = require('bitcoinjs-lib');
let chunks = bitcoin.script.decompile(Buffer.from("41bedd5e5b3079ff715b0ecb86c80d4133b3676665726ac07b34733d1e218f6fe1f28fdbdb327c749783dfd6920738bfdcf2a3c1989a48417fef26cb416002073d012103836c831ff77d759e0b1b2c9d7d9c39eb2b1c01da327b3e48b07e95b7ea3576a2", "hex"));
console.log("chunks", chunks)
*/

const { Wallet, kaspaSetup } = require('kaspa-wallet');
const {RPC} = require('kaspa-wallet-grpc-node');

kaspaSetup();


const PORTS = {
    mainnet : 16110,
    testnet : 16210,
    simnet : 16510,
    devnet : 16610
}
const NETWORK = 'testnet';

const rpc = new RPC({
    clientConfig:{
        host:"127.0.0.1:"+PORTS[NETWORK]
//        host:"127.0.0.1:16110"
    }
});//rpc.client.verbose = true;

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


    //return

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

Wallet.onReady(()=>{
    run();
});

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


//testNotification();
