#!/usr/bin/env node

const { Command } = require('commander');
const { RPC } = require('@kaspa/grpc-node');
const pkg = require('./package.json');

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
            .option('--server <server>:<port>');
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

        let { server : host } = options;
        if(!host)
            host = `127.0.0.1:${networks[network].port}`;

        const rpc = new RPC({ clientConfig:{ host, disableConnectionCheck : true } })
        rpc.client.verbose = true;
        const proto = rpc.client.proto;
        const methods = proto.KaspadMessage.type.field
            .filter(({name})=>/request/i.test(name));

        const program = new Command();

        let dump = (label, text, deco1="-", deco2="=")=>{
            console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
        }

        program
            //.allowUnknownOption()
            .version(pkg.version,'--version')
            .description('Kaspa gRPC client')
            .option('--testnet','use testnet network')
            .option('--devnet','use devnet network')
            .option('--simnet','use simnet network')
            .option('--server <server>:<port>','use custom gRPC server endpoint');
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

            cmd.option(`--args`,`show help for cmd`, ()=>{
                fields.forEach(f=>{
                    console.log(f);
                })
            })

            cmd.action(async (cmd, options) => {
                // console.log("supplied options",cmd);
                let args = {};

                fields.forEach(f=>{
                    if(cmd[f.name] !== undefined){
                        if(typeof cmd[f.name] == 'boolean')
                            args[f.name] = 1;
                            // args[f.name] = cmd[f.name] || 1;
                        else
                            args[f.name] = JSON.parse(cmd[f.name]);
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