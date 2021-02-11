#!/usr/bin/env node

const { Wallet, initKaspaFramework } = require('@kaspa/wallet');

//Wallet.setWorkerLogLevel('none')

const {RPC} = require('@kaspa/grpc-node');

const network = 'kaspatest';

const rpc = new RPC({
    clientConfig:{
        host:"127.0.0.1:"+Wallet.networkTypes[network].port
        //host:"127.0.0.1:16210"
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
    //let wallet = Wallet.fromMnemonic("live excuse stone acquire remain later core enjoy visual advice body play", { network, rpc }, {syncOnce:true, logLevel:'info'});
    //kaspadev:qpfp3umjvnx40vrqtyy0drsn08942dkjhcsqh73eav

    //Wallet C
    //let wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });
    //kaspadev:qpuyhaxz2chn3lsvf8g7q5uvaezpp5m7pygf2jzn8d

    let wallet = Wallet.fromMnemonic("chuckle seek trumpet parrot fuel tilt prosper gate cross truth monkey true", { network, rpc })
    console.log("wallet.uid", wallet.uid);
    
    let mnemonic = await wallet.mnemonic;
    dump("mnemonic created", mnemonic)


    wallet.setLogLevel('info,debug');

    wallet.on("blue-score-changed", (result)=>{
        let {blueScore} = result;
        console.log("blue-score-changed:result, blueScore", result, blueScore)
    })

    wallet.on("balance-update", (result)=>{
        console.log("balance-update:result", result)
    })

    

    //console.log("sync........... started")
    await wallet.sync();
    //console.log("sync........... complete")
    //return
    let receiveAddress = await wallet.receiveAddress;
    dump("receiveAddress", receiveAddress)
    return
    let response = await wallet.estimateTransaction({
        //toAddr: "kaspadev:qpfp3umjvnx40vrqtyy0drsn08942dkjhcsqh73eav", //Wallet B
        //toAddr: "kaspadev:qzpf5d3w7vwgfvu8zy993xupj2yewwfngg439f58nn",  //Wallet B
        //toAddr: "kaspadev:qpuyhaxz2chn3lsvf8g7q5uvaezpp5m7pygf2jzn8d", //Wallet C
        //toAddr: "kaspadev:qrhe3f7js0rusmmmzqwh7d277xfklc2h55e4my9fxz", //Wallet C
        toAddr: "kaspatest:qr2kwyvpgx5s6avsfa9ncs95052djn4jrq882f56w9", //faucet
        amount: 1000*1e8,
        calculateNetworkFee:true
    }, true).catch(async (error)=>{
        console.log("\n\estimateTransaction:error", error)
    })

    console.log("\n\nResponse", response);//.tx.inputs.length)


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
