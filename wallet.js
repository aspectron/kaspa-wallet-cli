#!/usr/bin/env node

const { Command } = require('commander');
const { Wallet, kaspaSetup } = require('kaspa-wallet');
const {RPC} = require('kaspa-wallet-grpc-node');


kaspaSetup();

/*
const rpc = new RPC({
    clientConfig:{
        host:"127.0.0.1:16210"
    }
});

Wallet.setRPC(rpc)
*/


const program = new Command();

let dump = (label, text, deco1="-", deco2="=")=>{
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}

program
    .version('0.0.1')
    .description('Kaspa Wallet client');

program
    .command('create')
    .description('Create Kaspa wallet')
    .requiredOption('-p, --password <password>', "Password for wallet")
    .action(async (cmd, options) => {
        if(!cmd.password){
            console.error("password is required")
            cmd.outputHelp();
            return;
        }
        //console.log(Wallet)
        //console.log(cmd.password)
        const wallet = new Wallet();
        const encryptedMnemonic = await wallet.export(cmd.password);

        dump("mnemonic created", wallet.mnemonic)
        dump("Encrypted Mnemonic", encryptedMnemonic)

        let _wallet = await Wallet.import(cmd.password, encryptedMnemonic)
        dump("wallet imported", _wallet.mnemonic)
    })
/*
program
    .command('run-grpc')
    .description('Run gRPC "run -m <method> -j <json_data>" ')
    .option('-m, --method <method>', "rpc request, default will be 'getBlockDagInfoRequest' ")
    .option('-j, --json <json_data>', "rpc request args as json string, default will be '{}' ")
    .action(async (cmd, options) => {
        let {json_data='{}', method='getBlockDagInfoRequest'} = cmd;
        //console.log("method, json_data:", method, json_data)
        let args = JSON.parse(json_data)
        console.log("method, args:", method, args)

        console.log("\nCalling:", method)
        console.log("Arguments:\n", JSON.stringify(args, null, "  "))
        let result = await rpc.request(method, args);
        console.log("Result:\n", JSON.stringify(result, null, "  "))
        rpc.disconnect();
    })
*/
program.parse(process.argv);
