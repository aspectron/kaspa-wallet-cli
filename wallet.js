#!/usr/bin/env node

const { Command } = require('commander');
const { Wallet, initKaspaFramework } = require('kaspa-wallet');
const { RPC } = require('kaspa-grpc-node');
const Decimal = require('decimal.js');

const program = new Command();

class KaspaWalletCli {

    constructor() {
        this.log = 'info';
    }

    async init() {
        await initKaspaFramework();


    }

    get options() {
        return program.opts();
    }

    get network() {
        const { options } = this;
        const aliases = Object.keys(Wallet.networkAliases);
        for(let n of aliases)
            if(options[n]) return Wallet.networkAliases[n];
        return 'kaspa';
    }

    get rpc() {
        if(this.rpc_)
            return this.rpc_;
        const { network } = this;
        const { port } = Wallet.networkTypes[network];
        const { options } = this;
        const host = options.rpc || `127.0.0.1:${port}`;
        this.rpc_ = new RPC({ clientConfig:{ host } });
        return this.rpc_;
    }

    async main() {

        // console.log(Wallet.networkTypes);
        // process.exit(0);
        // const rpc = new RPC({
        //     clientConfig:{
        //         host:"127.0.0.1:16210"
        //     }
        // });
        // Wallet.setRPC(rpc)



        let dump = (label, text, deco1="-", deco2="=")=>{
            console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
        }

        program
            .version('0.0.1', '--version')
            .description('Kaspa Wallet client')
            .helpOption('--help','display help for command')
//            .option('--json','display help for command')
            .option('--log <level>','set log level [info, debug]') // TODO - propagate to Wallet.ts etc.
            .option('--testnet','use testnet network')
            .option('--devnet','use testnet network')
            .option('--simnet','use testnet network')
            .option('--rpc <address>','use custom RPC address <host:port>')
            .option('--folder <path>','use custom folder for wallet file storage') // TODO
            .option('--file <filename>','use custom wallet filename') // TODO
            // .option('--help','display help for command')
            ;

        program
            .command('test')
            .description('internal testing')
            .action(async (cmd, options) => {
                console.log('current network:',this.network);
            });


        program
            .command('monitor')
            .description('monitor wallet activity')
            .action(async (cmd, options) => {
                // console.log('network:',this.network);
                const { network, rpc } = this;
                this.wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });

                this.wallet.on("balance-update", (detail)=>{
                    const { balance, available, pending } = detail;
                    console.log(`Balance Update:`, detail);
                })

                let seq = 0;
                this.wallet.on("utxo-change", (detail)=>{
                    console.log(`UTXO Change:`,'added:', detail.added.entries(), 'removed:', detail.removed.entries());
                    // let {added,removed} = detail;
                    // added = [...added.values()].flat();
                    // removed = [...removed.values()].flat();
                })
   
            });

        program
            .command('send <address> <amount> [fee]')
            .description('send funds to an address', {
                address : 'kaspa network address',
                amount : 'amount in KSP',
                fee : 'transaction priority fee'
            })
            .action(async (address, amount, fee) => {
                // console.log({address,amount,fees});
                try {
                    amount = new Decimal(amount);
                } catch(ex) {
                    console.log(`Error parsing amount: ${amount}`);
                    console.log(ex.toString());
                    return;
                }
                if(fee) {
                    try {
                        fee = new Decimal(fee);
                    } catch(ex) {
                        console.log(`Error parsing fees: ${fee}`);
                        console.log(ex.toString());
                        return;
                    }
                }

                const { network, rpc } = this;
                this.wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });
                let response = await this.wallet.submitTransaction({
                    toAddr: address,
                    amount,
                    fee,
                }, true);

                console.log(response);

            });

        program
            .command('info')
            .description('monitor wallet activity')
            .action(async (cmd, options) => {
            })


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

                let { network } = this;

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
    }
}

(async()=>{
    const cli = new KaspaWalletCli();
    await cli.init();
    await cli.main();
})();
