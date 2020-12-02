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


const testTx = async ()=>{
    const rpcTX = {
        transaction: {
            version: 1,
            inputs: [{
                previousOutpoint:{
                    transactionId: {
                        bytes: '3bqgv2DseZ57Hrkoh/1E+mXPultaOHEbQOdtcddzZ8s='//'ddbaa0bf60ec799e7b1eb92887fd44fa65cfba5b5a38711b40e76d71d77367cb'
                    },
                    index: 0
                },
                signatureScript: '412befdab4c42f1500831352453be6cc96378469185271a3036badec7104bf92bff21fe33a7788db2b03e3a27e85bfe73c49e22d291ba621b291c6ec85a3f63240012102fb0935d9b1dd83b8fbd7285b1cca492f5da7b7b31ca785f62a399baa9ed6b3ac',
                sequence: 4294967295
            }],
            outputs: [{
                value: 1,
                scriptPubKey: '76a914ef948254c1dfba15a5c34d5840ce2e988e32654a88ac'
            },{
                value: 4999998999,
                scriptPubKey: '76a91430b9f24c57cf7e3b74ce00470e4b5d3948b138ae88ac'
            }],
            lockTime: 0,
            subnetworkId:{
                bytes:"MDAwMDAwMDAwMDAwMDAwMDAwMDA="
            }
        }
    }

    //let json = {"submitTransactionRequest":{"transaction":{"version":1,"inputs":[{"previousOutpoint":{"transactionId":{"bytes":"3bqgv2DseZ57Hrkoh/1E+mXPultaOHEbQOdtcddzZ8s="},"index":0},"signatureScript":"412befdab4c42f1500831352453be6cc96378469185271a3036badec7104bf92bff21fe33a7788db2b03e3a27e85bfe73c49e22d291ba621b291c6ec85a3f63240012102fb0935d9b1dd83b8fbd7285b1cca492f5da7b7b31ca785f62a399baa9ed6b3ac","sequence":4294967295}],"outputs":[{"value":1,"scriptPubKey":"76a914ef948254c1dfba15a5c34d5840ce2e988e32654a88ac"},{"value":4999998999,"scriptPubKey":"76a91430b9f24c57cf7e3b74ce00470e4b5d3948b138ae88ac"}],"lockTime":0}}}
    console.log("rpcTX", JSON.stringify(rpcTX));

    let responce  = await rpc.request("submitTransactionRequest", rpcTX)
                    .catch(error=>{
                        console.log("Error:", error)
                    })
    console.log("Responce", responce)
}


//testTx();




let dump = (label, text, deco1="-", deco2="=")=>{
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}

const run = async ()=>{

    //let wallet = Wallet.fromMnemonic("live excuse stone acquire remain later core enjoy visual advice body play");
    let wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus");
    dump("mnemonic created", wallet.mnemonic)
    await wallet.addressDiscovery()
    .catch(e=>{
        console.log("addressDiscovery:error", e)
    })
    let count = 0, response;

    let {utxoIds, utxos} = wallet.utxoSet.selectUtxos(1000);
    console.log("utxos1", utxos);

    ///*

    const sendTx = async()=>{
        //await wallet.addressDiscovery()
        //.catch(e=>{
        //    console.log("addressDiscovery:error", e)
        //})
        //console.log("count:", count)
        //if(count++ > 1000)
        //    throw new Error("count")
        response = await wallet.sendTx({
            toAddr: "kaspatest:qrhefqj5c80m59d9cdx4ssxw96vguvn9fgy6yc0qtd",
            amount: 1000
        }).catch(async (error)=>{
            console.log("\n\nerror", error)
            //if((error+"").indexOf("fully-spent transaction") > -1){
            //    await sendTx();
            //}
        })
    }

    await sendTx();

    console.log("response", response)
    //*/

    rpc.disconnect();
}

run();

