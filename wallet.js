#!/usr/bin/env node

const { Command } = require('commander');
const { Wallet, initKaspaFramework, log, Storage, FlowLogger} = require('kaspa-wallet');
const { RPC } = require('kaspa-grpc-node');
const Decimal = require('decimal.js');
const fs = require("fs");

const ReadLine = require('readline');
const Writable = require('stream').Writable;


const program = new Command();
const storage = new Storage({logLevel:'debug'});
const logger = new FlowLogger('WALLET', {
	display : ['level'],
	color: ['level', 'content']
})
const mutableStdout = new Writable({
  write: function(chunk, encoding, callback) {
    if (!this.muted)
      process.stdout.write(chunk, encoding);
    callback();
  }
});

const Prompt = ({question, muted=false, CB, errorCB=null, attempt=2})=>{

	const readLine = ReadLine.createInterface({
		input: process.stdin,
		output: mutableStdout,
		terminal: true
	});


	let count = 0;
	let askQuestion = ()=>{
		mutableStdout.muted = false;
		readLine.question(question, handlePrompt)
		mutableStdout.muted = muted;
	}
	let handlePrompt = (data) => {
		count++;
		if(!data.length){
			if(count>attempt)
				return readLine.close();
			errorCB?.(count)
			return askQuestion()
		}

		readLine.close();
		CB(data)
	}
	askQuestion();
}

class KaspaWalletCli {

	constructor() {
		this.log = 'info';
	}

	async init() {
		await initKaspaFramework();
	}

	get options() {
		if(!this._options) {
			this._options = program.opts();
			Object.entries(this._options).forEach(([k,v])=>{ if(v === undefined) delete this._options[k]; });
		}
		return this._options;
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
		this.rpc_ = new RPC({ clientConfig:{ host, reconnect : false, verbose : false } });
		this.rpc_.onConnectFailure((reason)=>{ log.error(`gRPC - no connection to ${Wallet.networkTypes[network].name} at ${host} (${reason})`); });
		//if(this._options.log == 'info')
		//    this.rpc_.client.verbose = true;
		return this.rpc_;
	}

	KAS(v, pad = 0) {
		let [int,frac] = Decimal(v||0).mul(1e-8).toFixed(8).split('.');
		int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",").padStart(pad,' ');
		frac = frac.replace(/0+$/,'');
		return frac ? `${int}.${frac}` : int;
	}


	setupLogs(wallet){
		const level = (this.options.verbose&&'verbose')||(this.options.debug&&'debug')||(this.options.log)||'info';
		wallet.setLogLevel(level);
		log.level = level;
	}

	async openWallet(next){
		let walletMeta = await storage.getWallet();
		if(!walletMeta || !walletMeta.wallet?.mnemonic){
			logger.error("Please create wallet")
			return
		}

		if(walletMeta.encryption=='none'){
			const { network, rpc } = this;
			let wallet = Wallet.fromMnemonic(walletMeta.wallet.mnemonic, { network, rpc });
			return next(wallet);
		}

		this.decryptWallet(walletMeta.wallet.mnemonic, next)
	}

	decryptWallet(mnemonic, next){
		let openWallet = async(password)=>{
			
			let decrypted = await this.decryptMnemonic(password, mnemonic)
			.catch(e=>{

			})
			let {privKey, seedPhrase} = decrypted||{}
			
			if(!privKey){
				logger.info(`Unable to decrypt wallet with "${password}" password`)
				Prompt({
					muted:true,
					question:"Please provide another password: ",
					CB: openWallet,
					errorCB:()=>{
						logger.error("Invalid password");
					}
				})
				return
			}

			const {network, rpc} = this;
			let wallet = new Wallet(privKey, seedPhrase, { network, rpc })
			next(wallet)
		}

		logger.info("To unlock your wallet please provide password")
		Prompt({
			muted:true,
			question:"please provide wallet password: ",
			CB:openWallet,
			errorCB:()=>{
				logger.error("Invalid password");
			}
		})
	}
	async decryptMnemonic(password, encryptedMnemonic){
		//console.log("decrypted", password, encryptedMnemonic)
		let decrypted = await Wallet.passwordHandler.decrypt(password, encryptedMnemonic);
		return JSON.parse(decrypted)
	}

	async main() {

		// temporary mnemonics used for testing
		//const mnemonic = "live excuse stone acquire remain later core enjoy visual advice body play";
		 const mnemonic = "wasp involve attitude matter power weekend two income nephew super way focus";

		let dump = (label, text, deco1="-", deco2="=")=>{
			console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
		}

		const logLevels = ['error','warn','info','verbose','debug'];
		program
			.version('0.0.1', '--version')
			.description('Kaspa Wallet client')
			.helpOption('--help','display help for command')
			.option('--log <level>',`set log level ${logLevels.join(', ')}`, (level)=>{
				if(!logLevels.includes(level))
					throw new Error(`Log level must be one of: ${logLevels.join(', ')}`);
				return level;
			})
			.option('--verbose','log wallet activity')
			.option('--debug','debug wallet activity')
			.option('--testnet','use testnet network')
			.option('--devnet','use devnet network')
			.option('--simnet','use simnet network')
			.option('--rpc <address>','use custom RPC address <host:port>')
			.option('--folder <path>','use custom folder for wallet file storage') // TODO
			.option('--file <filename>','use custom wallet filename') // TODO
			// .option('--help','display help for command')
			;

		// program
		//     .command('test')
		//     .description('internal testing')
		//     .action(async (cmd, options) => {
		//         console.log('current network:',this.network);
		//     });

		program
			.command('monitor')
			.description('monitor wallet activity')
			.action(async (cmd, options) => {
				const { network, rpc } = this;
				log.info(`connecting to kaspa ${Wallet.networkTypes[network].name}`);
				this.wallet = Wallet.fromMnemonic(mnemonic, { network, rpc });
				this.setupLogs(this.wallet);
				await this.wallet.sync();
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
			.command('balance')
			.description('display wallet balance')
			.action(async (cmd, options) => {
				const { network, rpc } = this;
				log.info(`connecting to kaspa ${Wallet.networkTypes[network].name}`);
				this.wallet = Wallet.fromMnemonic(mnemonic, { network, rpc });
				//this.wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });
				this.setupLogs(this.wallet);
				await this.wallet.sync(true);
				const { balance } = this.wallet;
				console.log('');
				console.log(`Wallet balance`+(network=='kaspa'?'':` (${Wallet.networkTypes[network].name}):`));
				console.log('');
				console.log(`    Available: ${this.KAS(balance.available,12)} KAS`);
				console.log(`      Pending: ${this.KAS(balance.pending,12)} KAS`);
				console.log(`        Total: ${this.KAS(balance.total,12)} KAS`);
				// console.log(this.wallet.balance);
				rpc.disconnect();
			});


		program
			.command('send <address> <amount> [fee]')
			.description('send funds to an address', {
				address : 'kaspa network address',
				amount : 'amount in KAS',
				fee : 'transaction priority fee'
			})
			.action(async (address, amount, fee) => {
				// console.log({address,amount,fees});
				try {
					amount = new Decimal(amount).mul(1e8).toNumber();
				} catch(ex) {
					console.log(`Error parsing amount: ${amount}`);
					console.log(ex.toString());
					return;
				}
				if(fee) {
					try {
						fee = new Decimal(fee).mul(1e8).toNumber();
					} catch(ex) {
						console.log(`Error parsing fees: ${fee}`);
						console.log(ex.toString());
						return;
					}
				}

				const { network, rpc } = this;
				log.info(`connecting to kaspa ${Wallet.networkTypes[network].name}`);
				this.wallet = Wallet.fromMnemonic(mnemonic, { network, rpc });
				this.setupLogs(this.wallet)
				try {
					let response = await this.wallet.submitTransaction({
						toAddr: address,
						amount,
						fee,
					}, true);
					console.log(response);
				} catch(ex) {
					//console.log(ex);
					log.error(ex.toString());
				}

				rpc.disconnect();
			});

		program
			.command('info')
			.description('internal wallet information')
			.action(async (cmd, options) => {

				const { network, rpc } = this;
				log.info(`connecting to kaspa ${Wallet.networkTypes[network].name}`);
				this.wallet = Wallet.fromMnemonic(mnemonic, { network, rpc });
				//this.wallet = Wallet.fromMnemonic("wasp involve attitude matter power weekend two income nephew super way focus", { network, rpc });
				this.setupLogs(this.wallet);
				await this.wallet.sync(true);
				const { balance } = this.wallet;

				console.log(this.wallet);
				// console.log(this.wallet.utxoSet);
				console.log(this.wallet.addressManager);

				rpc.disconnect();
			})

		program
			.command('address')
			.description('Show wallet address')
			.action(async(cmd, options) => {

				let next = async(wallet)=>{
					console.log('getting address for', this.network);
					this.wallet = wallet;
					this.setupLogs(this.wallet);
					await this.wallet.sync(true);
					logger.info(this.wallet.receiveAddress);
					this.rpc.disconnect();
				}

				
				this.openWallet(next);
			})

		program
			.command('create')
			.description('Create Kaspa wallet')
			.option('--password <password>', "Password for wallet, optional if creating unlocked wallet")
			//.option('-u, --unlocked', "Create unlocked wallet")
			.option('--force', "Required for unlocked wallet creation")
			.action(async (cmd, options) => {
				const {password, unlocked, force} = cmd;

				const next = async(password)=>{
					let { network } = this;

					const wallet = new Wallet(null, null, { network });
					this.setupLogs(wallet)
					if(!password){
						dump("mnemonic created", wallet.mnemonic)
						storage.createWallet(wallet.mnemonic, {encryption:"none"})
					}else{
						const encryptedMnemonic = await wallet.export(password);
						dump("Encrypted Mnemonic", encryptedMnemonic)
						storage.createWallet(encryptedMnemonic)
					}
				}

				if(!force && !password){
					logger.error("please provide a password with --password=*** or --force to create a wallet that is not encrypted.")
					Prompt({
						muted:true,
						question:"please provide a password ",
						CB:next,
						errorCB:()=>{
							logger.error("Invalid password");
						}
					})
				}else{
					next(password);
				}
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
