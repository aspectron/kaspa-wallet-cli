#!/usr/bin/env node

const { Command } = require('commander');
const kaspaNodeModule = require('kaspa-node-module');
const { Wallet, bitcoreKaspaSetup } = kaspaNodeModule.default;
const program = new Command();

bitcoreKaspaSetup();

let dump = (label, text, deco1="-", deco2="=")=>{
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}

program
    .version('0.0.1')
    .description('Kaspa Wallet client');

program
    .command('create')
    .description('Create Kaspa wallet')
    .option('-p, --password <password>', "Password for wallet")
    .action(async (cmd, options) => {
        //console.log(Wallet)
        // console.log(cmd.password)
        const wallet = new Wallet();
        const encryptedMnemonic = await wallet.export(cmd.password);

        dump("mnemonic created", wallet.mnemonic)
        dump("Encrypted Mnemonic", encryptedMnemonic)

        let _wallet = await Wallet.import(cmd.password, encryptedMnemonic)
        dump("wallet imported", _wallet.mnemonic)
    })

program.parse(process.argv);
