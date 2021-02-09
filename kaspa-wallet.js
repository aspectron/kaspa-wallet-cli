#! /usr/bin/env node

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

	openWallet() {
		return new Promise(async (resolve, reject) => {
			let walletMeta = await storage.getWallet();
			if(!walletMeta || !walletMeta.wallet?.mnemonic){
				return reject("Please create wallet")
			}

			if(walletMeta.encryption=='none'){
				const { network, rpc } = this;
				let wallet = Wallet.fromMnemonic(walletMeta.wallet.mnemonic, { network, rpc });
				return resolve(wallet);
			}

			this.decryptWallet(walletMeta.wallet.mnemonic).then(resolve, reject);
		})
	}

	decryptWallet(mnemonic){
		return new Promise(async (resolve,reject) => {
			const openWallet_ = async(password)=>{

				let decrypted = await this.decryptMnemonic(password, mnemonic)
				.catch(e=>{
					logger.error(e);
				})
				let {privKey, seedPhrase} = decrypted||{}

				if(!privKey){
					logger.info(`Unable to decrypt wallet with "${password}" password`)
					Prompt({
						muted:true,
						question:"Please provide another password: ",
						CB: openWallet_,
						errorCB:()=>{
							//logger.error("Invalid password");
							reject('invalid password');
						}
					})
					return;
				}

				const {network, rpc} = this;
				let wallet = new Wallet(privKey, seedPhrase, { network, rpc })
				resolve(wallet);
			}

			logger.info("To unlock your wallet please provide password")
			Prompt({
				muted:true,
				question:"please provide wallet password: ",
				CB:openWallet_,
				errorCB:()=>{
					//logger.error("Invalid password");
					reject('invalid password');
				}
			})
		})
	}
	async decryptMnemonic(password, encryptedMnemonic){
		//console.log("decrypted", password, encryptedMnemonic)
		let decrypted = await Wallet.passwordHandler.decrypt(password, encryptedMnemonic);
		return JSON.parse(decrypted)
	}

	async main() {

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

				try {
					const wallet = await this.openWallet();
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
					});
				} catch(ex) {
					logger.error(ex.toString());
				}
			});

		program
			.command('balance')
			.description('display wallet balance')
			.action(async (cmd, options) => {
				try {
					const wallet = await this.openWallet();
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
				} catch(ex) {
					logger.error(ex.toString());
				}
			});


		program
			.command('send <address> <amount> [fee]')
			.option('--no-network-fee','disable automatic inclusion of network/data fee')
			.description('send funds to an address', {
				address : 'kaspa network address',
				amount : 'amount in KAS',
				fee : 'transaction priority fee'
			})
			.action(async (address, amount, fee, options) => {
				const { networkFee } = options;

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

				try {
					const wallet = await this.openWallet();
					this.setupLogs(this.wallet)
					try {
						let response = await this.wallet.submitTransaction({
							toAddr: address,
							amount,
							fee,
							calculateNetworkFee : networkFee
						}, true);
						console.log(response);
					} catch(ex) {
						//console.log(ex);
						log.error(ex.toString());
					}

					rpc.disconnect();
				} catch(ex) {
					logger.error(ex.toString());
				}

			});

		program
			.command('info')
			.description('internal wallet information')
			.action(async (cmd, options) => {

				try {
					const wallet = await this.openWallet();
					this.setupLogs(this.wallet);
					await this.wallet.sync(true);
					const { balance } = this.wallet;

					//console.log(this.wallet);
					//console.log(this.wallet.utxoSet);
					//console.log(this.wallet.addressManager);

					rpc.disconnect();
				} catch(ex) {
					logger.error(ex.toString());
				}

			});

		program
			.command('address')
			.description('show wallet address')
			.action(async(cmd, options) => {

				try {
					const wallet = await this.openWallet();
					console.log('getting address for', this.network);
					this.wallet = wallet;
					this.setupLogs(this.wallet);
					await this.wallet.sync(true);
					logger.info(this.wallet.receiveAddress);
					this.rpc.disconnect();
				} catch(ex) {
					logger.error(ex.toString());
				}
			})

		program
			.command('create')
			.description('create Kaspa wallet')
			.option('--password <password>', "Password for wallet, optional if creating unlocked wallet")
			//.option('-u, --unlocked', "Create unlocked wallet")
			.option('--force', "Required for unlocked wallet creation")
			//.option('--show-mnemonic', "Output created mnemonic to console")
			.action(async (cmd, options) => {
				const {password, unlocked, force} = cmd;

				const next = async(password)=>{
					let { network } = this;
					
					console.log('');
					const wallet = new Wallet(null, null, { network });
					this.setupLogs(wallet)
					if(!password){
						if(this.options.verbose)
							dump("created unsafe mnemonic (not encrypted!)", wallet.mnemonic);
						storage.createWallet(wallet.mnemonic, {encryption:"none", generator: "cli"})
					}else{
						const encryptedMnemonic = await wallet.export(password);
						if(this.options.verbose)
							dump("creating encrypted mnemonic", encryptedMnemonic);
						storage.createWallet(encryptedMnemonic, { generator : "cli"})
					}

					console.log('---')
					console.log('Your wallet is stored in',storage.db.walletFile.yellow);
					console.log('Your transaction data will be stored in',storage.db.txFile.yellow);
					console.log('YOU MUST BACKUP THIS FILE!'.red)
					console.log('BEWARE: If this file is deleted, or you forget your password,');
					console.log('        ...it will not be possible to recover your funds!')
					console.log('---')
				}

				const createPass = (prev)=> {
					Prompt({
						muted:true,
						question:`please ${prev?'re-enter':'enter'} your password: `,
						CB:(pass)=>{
							if(!pass) {
								console.log('\n');
								logger.error('invalid password');
								return;
							}
							if(!prev)
								return createPass(pass);
							else
							if(pass == prev)
								return next(pass);
							else {
								console.log('\n');
								logger.error('passwords do not match')
								return;
							}
						},
						errorCB:()=>{
							logger.error("invalid password");
						}
					})
				}

				if(!force && !password){
					console.log("You can provide a password with --password=*** or use '--force' option to create a wallet that is not encrypted.")
					console.log("...requesting password entry from console");
					createPass();
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