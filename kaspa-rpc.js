#!/usr/bin/env node

const { Command } = require('commander');
const { RPC } = require('@kaspa/grpc-node');

const networks = {
    mainnet: { port: 16110 },
    testnet: { port: 16210 },
    simnet: { port: 16510 },
    devnet: { port: 16610 }
};


class KaspaInterface {

    async main() {

        const init = new Command();
        init
            .allowUnknownOption()
            .option('--testnet')
            .option('--devnet')
            .option('--simnet')
            .option('--port <port>')
            .option('--rpcserver <server>');
        init.parse();
        const options = init.opts();
        let network = 'mainnet';
        Object.entries(options).forEach(([k,v])=>{ 
            if(v === undefined) 
                delete options[k]; 
            else
            if(networks[k])
                network = k;
        });

        let { host } = options;
        if(!host)
            host = `127.0.0.1:${networks[network].port}`;

        const rpc = new RPC({ clientConfig:{ host } })
        rpc.client.verbose = true;
        const proto = rpc.client.proto;
        const methods = proto.KaspadMessage.type.field
            .filter(({name})=>/request/i.test(name));

        const program = new Command();

        let dump = (label, text, deco1="-", deco2="=")=>{
            console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
        }

        program
            .version('0.0.1','--version')
            .description('Kaspa gRPC client')
            .option('--testnet','use testnet network')
            .option('--devnet','use devnet network')
            .option('--simnet','use simnet network')
            ;

        program
            .command('run')
            .description('Run gRPC "run -m <method> -j <json_data>" ')
            .option('-m, --method <method>', "rpc request, default will be 'getBlockDagInfoRequest' ")
            .option('-j, --json <json>', "rpc request args as json string, default will be '{}' ")
            .action(async (cmd, options) => {
                let {json='{}', method=''} = cmd;
                //console.log("cmd", cmd)
                if(!method){
                    console.log("Invalid method")
                    rpc.disconnect();
                }

                //console.log("method, json_data:", method, json_data)
                let args = JSON.parse(json)
                console.log("method, args:", method, args)

                console.log("\nCalling:", method)
                console.log("Arguments:\n", JSON.stringify(args, null, "  "))
                let result = await rpc.request(method, args)
                .catch(error=>{
                    console.log("Error:", error)
                })
                console.log("Result:\n", JSON.stringify(result, null, "  "))
                rpc.disconnect();
            })

        methods.forEach(method=>{
            const {name, typeName} = method;

            const fn = name.replace(/Request$/,'');
            //console.log("method", method, proto[typeName])
            let fields = proto[typeName].type.field;
            //console.log("fields", fields)

            let cmd = program.command(fn).description(`gRPC call ${fn}`)
            fields.forEach(f=>{
                cmd.option(`--${f.name} <${f.name}>`, `Request argument ${f.name} of ${f.type}, default will be (${f.defaultValue}) `)
            })

            cmd.action(async (cmd, options) => {

                let args = {};

                fields.forEach(f=>{
                    if(cmd[f.name] !== undefined){
                        args[f.name] = cmd[f.name] || 1;
                    }
                })

                console.log("\nCalling:", name)
                console.log("Arguments:\n", JSON.stringify(args, null, "  "))
                let result = await rpc.request(name, args)
                .catch(error=>{
                    console.log("Error:", error)
                })
                console.log("Result:\n", result)
                rpc.disconnect();
            })
        })

        program.parse(process.argv);
    }
}

(async()=>{
    const ki = new KaspaInterface();
    await ki.main();
})();