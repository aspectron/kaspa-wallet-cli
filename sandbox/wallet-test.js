#!/usr/bin/env node

const { Wallet, initKaspaFramework } = require('kaspa-wallet');

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
    let wallet = Wallet.fromMnemonic("live excuse stone acquire remain later core enjoy visual advice body play", { network, rpc }, {syncOnce:true});
    //kaspadev:qpfp3umjvnx40vrqtyy0drsn08942dkjhcsqh73eav

    //Wallet C
    //let wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });
    //kaspadev:qpuyhaxz2chn3lsvf8g7q5uvaezpp5m7pygf2jzn8d

    dump("mnemonic created", wallet.mnemonic)

    wallet.setLogLevel('info');

    wallet.on("blue-score-changed", (result)=>{
        let {blueScore} = result;
        console.log("blue-score-changed:result, blueScore", result, blueScore)
    })

    wallet.on("balance-update", (result)=>{
        console.log("balance-update:result", result)
    })

    console.log("sync........... started")
    await wallet.sync();
    console.log("sync........... complete")
    return
    
    let response = await wallet.submitTransaction({
        //toAddr: "kaspadev:qpfp3umjvnx40vrqtyy0drsn08942dkjhcsqh73eav", //Wallet B
        //toAddr: "kaspadev:qzpf5d3w7vwgfvu8zy993xupj2yewwfngg439f58nn",  //Wallet B
        //toAddr: "kaspadev:qpuyhaxz2chn3lsvf8g7q5uvaezpp5m7pygf2jzn8d", //Wallet C
        //toAddr: "kaspadev:qrhe3f7js0rusmmmzqwh7d277xfklc2h55e4my9fxz", //Wallet C
        toAddr: "kaspadev:qpef0h00dcne5dmah0lmyzgplrn4cqh9rq3qcr8uqc", //Wallet B
        amount: 200000000
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
