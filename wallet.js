#!/usr/bin/env node

const { Command } = require('commander');
const { Wallet, bitcoreKaspaSetup } = require('kaspa-node-module');
const program = new Command();

program
    .version('0.0.1')
    .description('Kaspa Wallet client');

program
    .command('create')
    .description('Create Kaspa wallet')
    .option('-p, --password <password>', "Password for wallet")
    .action(async (cmd, options) => {
        console.log(Wallet)
        // console.log(cmd.password)
        const wallet = new Wallet();
        const encryptedMnemonic = await wallet.export(cmd.password);

        console.log(encryptedMnemonic)
    })

program.parse(process.argv);