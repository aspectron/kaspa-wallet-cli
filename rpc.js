#!/usr/bin/env node

const { Command } = require('commander');
const {RPC} = require('kaspa-wallet-grpc-node');

const rpc = new RPC({
    clientConfig:{
        host:"127.0.0.1:16210"
    }
})
rpc.client.verbose = true;
const proto = rpc.client.proto;
const methods = proto.KaspadMessage.type.field
    .filter(({name})=>/request/i.test(name));


const program = new Command();

let dump = (label, text, deco1="-", deco2="=")=>{
    console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
}

program
    .version('0.0.1')
    .description('Kaspa gRPC Test client');

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
    //console.log("method", method, proto[typeName])
    let fields = proto[typeName].type.field;
    //console.log("fields", fields)

    let cmd = program.command(name).description(`gRPC call ${name}`)
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