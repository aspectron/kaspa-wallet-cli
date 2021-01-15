#!/usr/bin/env node
/*
const bitcoin = require('bitcoinjs-lib');
let chunks = bitcoin.script.decompile(Buffer.from("41bedd5e5b3079ff715b0ecb86c80d4133b3676665726ac07b34733d1e218f6fe1f28fdbdb327c749783dfd6920738bfdcf2a3c1989a48417fef26cb416002073d012103836c831ff77d759e0b1b2c9d7d9c39eb2b1c01da327b3e48b07e95b7ea3576a2", "hex"));
console.log("chunks", chunks)
*/

const { Wallet, initKaspaFramework } = require('kaspa-wallet');
Wallet.setDebugLevel(0);

const {RPC} = require('kaspa-grpc-node');

const network = 'kaspadev';

const rpc = new RPC({
    clientConfig:{
        host:"127.0.0.1:"+Wallet.networkTypes[network].port
        //host:"127.0.0.1:16110"
    }
});
//rpc.client.verbose = true;



let dump = (label, text, deco1="-", deco2="=")=>{
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}

const run = async ()=>{


    await initKaspaFramework();
    //let wallet  = new Wallet(null, null, {network, rpc })

    //Wallet A
    //let wallet = Wallet.fromMnemonic("noodle confirm peanut camera office frown title century dream vacuum number shed", {network, rpc });
    //kaspadev:qpkanezz2ptk439km3se7tyfxf4v7dn7nuy7ajgan4

    //Wallet B
    //let wallet = Wallet.fromMnemonic("live excuse stone acquire remain later core enjoy visual advice body play", { network, rpc });
    //kaspadev:qpfp3umjvnx40vrqtyy0drsn08942dkjhcsqh73eav

    //Wallet C
    let wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });
    //kaspadev:qpuyhaxz2chn3lsvf8g7q5uvaezpp5m7pygf2jzn8d

    dump("mnemonic created", wallet.mnemonic)

    wallet.on("blue-score-changed", (result)=>{
        let {blueScore} = result;
        console.log("blue-score-changed:result, blueScore", result, blueScore)
    })

    wallet.syncVirtualSelectedParentBlueScore()
    .catch(e=>{
        console.log("syncVirtualSelectedParentBlueScore:error", e)
    })

    //await new Promise((resolve)=>setTimeout(resolve, 10000));
    
    let debugInfo = await wallet.addressDiscovery(20, true)
    .catch(e=>{
        console.log("addressDiscovery:error", e)
    })

    dump("receiveAddress", wallet.receiveAddress)
    if(!debugInfo)
        return

    //console.log("debugInfo", debugInfo)
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
    //return;
    let response = await wallet.submitTransaction({
        //toAddr: "kaspadev:qpfp3umjvnx40vrqtyy0drsn08942dkjhcsqh73eav", //Wallet B
        //toAddr: "kaspadev:qzpf5d3w7vwgfvu8zy993xupj2yewwfngg439f58nn",  //Wallet B
        //toAddr: "kaspadev:qpuyhaxz2chn3lsvf8g7q5uvaezpp5m7pygf2jzn8d", //Wallet C
        toAddr: "kaspadev:qrhe3f7js0rusmmmzqwh7d277xfklc2h55e4my9fxz", //Wallet C
        //toAddr: "kaspadev:qpkanezz2ptk439km3se7tyfxf4v7dn7nuy7ajgan4",
        amount: 25000000000,
        fee: 1086
    }).catch(async (error)=>{
        console.log("\n\nerror", error)
    })

    console.log("\n\nResponse", response)


    //rpc.disconnect();
}


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

run();
//testNotification();
