#! /usr/bin/env node

const cliProgress = require('cli-progress');
const { Command } = require('commander');
const { Wallet, initKaspaFramework, log : walletLogger, Storage, FlowLogger} = require('@kaspa/wallet');
const { RPC } = require('@kaspa/grpc-node');
const { delay, dpc, debounce, clearDPC } = require('@aspectron/flow-async');
const Decimal = require('decimal.js');
const fs = require("fs");
const path = require("path");
const ReadLine = require('readline');
const Writable = require('stream').Writable;
const qrcode = require('qrcode-terminal');
const program = new Command();
const storage = new Storage({logLevel:'debug'});
const pkg = require('./package.json');
const log = new FlowLogger('KaspaWallet', {
	display : ['level','time','name'],
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
		this.testTxsFilePath = path.join(__dirname, "_txs_.json");
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
		this.rpc_.onConnectFailure((reason)=>{
			const msg = `gRPC - no connection to ${Wallet.networkTypes[network].name} at ${host} (${reason})`;
			if(this.isNetworkSync) {
				switch(this.syncState) {
					case 'connect': {
						log.error(msg);
					} break;
					case 'init':
					case 'wait': {
						console.log('');
						log.error(msg);
						process.exit(1);
					} break;
					default: {
						console.log('');
						log.error(msg);
						this.resetNetworkSync = true;
					} break;
				}
			}
		});
		//if(this._options.log == 'info')
		//    this.rpc_.client.verbose = true;
		return this.rpc_;
	}

	get rpcIsActive() { return !!this.rpc_; }

	KAS(v, pad = 0) {
		let [int,frac] = Decimal(v||0).mul(1e-8).toFixed(8).split('.');
		int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",").padStart(pad,' ');
		frac = frac.replace(/0+$/,'');
		return frac ? `${int}.${frac}` : int;
	}


	setupLogs(wallet){
		const level = (this.options.verbose&&'verbose')||(this.options.debug&&'debug')||(this.options.log)||'info';
		wallet.setLogLevel(level);
		walletLogger.level = level;
	}

	openWallet(addressDiscoveryExtent=1000) {
		return new Promise(async (resolve, reject) => {
			let walletMeta = await storage.getWallet();
			if(!walletMeta || !walletMeta.wallet?.mnemonic){
				return reject("Please create wallet")
			}

			if(walletMeta.encryption=='none'){
				const { network, rpc } = this;
				let wallet = Wallet.fromMnemonic(walletMeta.wallet.mnemonic, { network, rpc }, {addressDiscoveryExtent});
				return resolve(wallet);
			}

			this.decryptWallet(walletMeta.wallet.mnemonic).then(resolve, reject);
		})
	}

	decryptWallet(mnemonic){
		return new Promise(async (resolve,reject) => {
			let attempts = 0;
			let max_attempts = 5;
			const openWallet_ = async(password)=>{
				
				attempts++;
				let decrypted = await this.decryptMnemonic(password, mnemonic)
				.catch(e=>{
					// logger.error(e);
				})
				let {privKey, seedPhrase} = decrypted||{}

				if(!privKey){
					console.log(`Unable to decrypt wallet - invalid password`.red);
					if(attempts > max_attempts) {
						console.log(`Unable to decrypt wallet - too many attempts, giving up`.red);
						process.exit(1);
					}
					Prompt({
						muted:true,
						question:`Please enter password (${attempts}${[,'st','nd','rd','th','th'][attempts]} attempt): `.yellow,
						CB: openWallet_,
						errorCB:()=>{
							//logger.error("Invalid password");
							reject('invalid password');
						}
					})
					return;
				}

				process.stdout.write('\n');
				const {network, rpc} = this;
				let wallet = new Wallet(privKey, seedPhrase, { network, rpc });
				resolve(wallet);
			}

			attempts++;
			console.log("To unlock your wallet please provide your wallet password");
			Prompt({
				muted:true,
				question:"please enter password: ".yellow,
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
	async encryptMnemonic(password, mnemonic){
		let encrypted = await Wallet.passwordHandler.encrypt(password, mnemonic);
		return encrypted
	}



	async main() {

		let dump = (label, text, deco1="-", deco2="=")=>{
			console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
		}

		const logLevels = ['error','warn','info','verbose','debug', 'utxodebug'];
		program
			.version(pkg.version, '--version')
			.description(`Kaspa Wallet CLI v${pkg.version}`)
			.helpOption('--help','display help for command')
			.option('--no-sync','disable network sync for all operations')
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

		program
		    .command('sync')
		    .description('sync wallet with the network')
		    .action(async (cmd, options) => {

				if(!this.options.sync) {
					log.error('you can not use --no-sync flag when running network sync');
					return;
				}
				await this.networkSync();
				if(this.rpcIsActive)
					this.rpc.disconnect();
		        // console.log('current network:',this.network);
		    });

		program
			.command('monitor')
			.description('monitor wallet activity')
			.action(async (cmd, options) => {

				try {
					const wallet = await this.openWallet();
					await this.networkSync();
					this.setupLogs(wallet);
					await wallet.sync();
					wallet.on("balance-update", (detail)=>{
						const { total, available, pending } = detail;
						console.log(`Balance Update: available:`,`${this.KAS(available)}`.cyan, `pending:`,`${this.KAS(pending)}`.cyan, `total:`,`${this.KAS(total)}`.cyan);
						console.log(``);
					})

					let seq = 0;
					wallet.on("utxo-change", (detail)=>{
						//console.log(`UTXO Change:`,'added:', detail.added.entries(), 'removed:', detail.removed.entries());
						detail.added.forEach((v, k)=>{
							console.log("UTXOs added");
							console.log("  address:",k.green);
							v.forEach(entry=>{
								console.log("  transactionId:", `${entry.transactionId} #${entry.index}`.green);
								console.log("  scriptPublicKey:", entry.scriptPublicKey.scriptPublicKey, "version:", entry.scriptPublicKey.version);
								console.log("  blockBlueScore:", entry.blockBlueScore.cyan,"isCoinbase:", entry.isCoinbase);
								console.log("  amount:", this.KAS(entry.amount).cyan,'KAS');
								console.log(``);
							})	
						})

						detail.removed.forEach((v, k)=>{
							console.log("UTXO Change removed".magenta);
							console.log("  address:",k.green);
							v.forEach(entry=>{
								console.log("  transactionId:", `${entry.transactionId} #${entry.index}`.green);
							})	
							console.log(``);
						})
						// let {added,removed} = detail;
						// added = [...added.values()].flat();
						// removed = [...removed.values()].flat();
					});
				} catch(ex) {
					log.error(ex.toString());
				}
			});


		const printBalance = (balance)=>{
			console.log('');
			console.log(`Wallet balance`+(this.network=='kaspa'?'':` (${Wallet.networkTypes[this.network].name}):`));
			console.log('');
			console.log(`    Available: ${this.KAS(balance.available,12)} KAS`);
			console.log(`      Pending: ${this.KAS(balance.pending,12)} KAS`);
			console.log(`        Total: ${this.KAS(balance.total,12)} KAS`);
			console.log('');
		}

		program
			.command('balance')
			.description('display wallet balance')
			.action(async (cmd, options) => {
				try {
					const wallet = await this.openWallet();
					await this.networkSync();
					this.setupLogs(wallet);
					await wallet.sync(true);
					const { balance } = wallet;
					printBalance(balance)
					// console.log(wallet.balance);
					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
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
					await this.networkSync();
					this.setupLogs(wallet)
					try {
						let response = await wallet.submitTransaction({
							toAddr: address,
							amount,
							fee,
							calculateNetworkFee : networkFee
						}, true);
						console.log('');
						console.log("Transaction successful".green);
						console.log('');
						console.log(`Wallet balance`+(this.network=='kaspa'?'':` (${Wallet.networkTypes[this.network].name}):`));
						console.log('');
						console.log(`    Available: ${this.KAS(wallet.balance.available,12)} KAS`);
						console.log(`      Pending: ${this.KAS(wallet.balance.pending,12)} KAS`);
						console.log(`        Total: ${this.KAS(wallet.balance.total,12)} KAS`);
					} catch(ex) {
						//console.log(ex);
						log.error(ex.toString());
					}

					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
				}

			});

		program
			.command('info')
			.option("--show-change-address", "show change address")
			.option("--show-all-addresses", "show all (receive and change) addresses")
			.description('internal wallet information')
			.action(async (cmd, options) => {
				let {showChangeAddress, showAllAddresses} = cmd;
				try {

					const wallet = await this.openWallet();
					await this.networkSync();
					this.setupLogs(wallet);
					await wallet.sync(true);
					const { balance } = wallet;
					//console.log(wallet);
					console.log("");
					console.log("network:", wallet.network.yellow);
					console.log("blue score:", wallet.blueScore.cyan);
					console.log("---");
					console.log("current receive address:", wallet.addressManager.receiveAddress.current.address.green);
					if(showChangeAddress){
						if(wallet.addressManager.changeAddress.counter == 0)
							wallet.addressManager.changeAddress.next();
						console.log("current change address:", wallet.addressManager.changeAddress.current.address.green);
					}
					console.log(`balance available:`, `${this.KAS(wallet.balance.available)} KAS`.cyan,
					` pending:`, `${this.KAS(wallet.balance.pending)} KAS`.cyan, 
					` total:`, `${this.KAS(wallet.balance.total)} KAS`.cyan);
					console.log("receive addresses used:",wallet.addressManager.receiveAddress.counter);
					console.log("change addresses used: ",wallet.addressManager.changeAddress.counter);
					
					if(showAllAddresses){
						let listAddresses = (info)=>{
							Object.entries(info.atIndex).forEach(([k, v])=>{
								console.log(`	#${k}:`,v.green);
							})
						}
						console.log("Receive addresses:");
						listAddresses(wallet.addressManager.receiveAddress)
						console.log("Change addresses:");
						listAddresses(wallet.addressManager.changeAddress)
					}
					
					console.log("UTXO storage: ");
					Object.entries(wallet.utxoSet.utxoStorage).forEach(([k, v])=>{
						console.log("  address:",k.green, " UTXOs:",v.length);
					})
					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
				}

			});

		program
			.command('transactions')
			.description('list wallet transactions')
			.action(async (cmd, options) => {

				try {

					const wallet = await this.openWallet();
					await this.networkSync();
					this.setupLogs(wallet);
					await wallet.sync(true);
					const { balance } = wallet;
					//console.log(wallet);
					log.warn('Please note - this is a beta feature that displays UTXOs only');
					log.warn('Historical transaction information will be available in the next release');
					Object.entries(wallet.utxoSet.utxoStorage).forEach(([address, UTXOs])=>{
						console.log(`${address}:`);
						UTXOs.sort((a,b) => { return a.blockBlueScore - b.blockBlueScore; });
						let width = 0;
						UTXOs.forEach((utxo) => {
							let kas = `${this.KAS(utxo.amount)}`;
							if(kas.length > width)
								width = kas.length;
						})
						UTXOs.forEach((utxo) => {
							console.log(` +${this.KAS(utxo.amount, width+1)}`,`KAS`,`txid:`, `${utxo.transactionId} #${utxo.index}`.green,'Blue Score:', utxo.blockBlueScore.cyan);
						})
					})
					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
				}

			});


		program
			.command('address')
			.description('show wallet address')
			.action(async(cmd, options) => {

				try {
					const wallet = await this.openWallet();
					console.log('getting address for', this.network);
					this.setupLogs(wallet);
					await wallet.sync(true);
					console.log('');
					console.log('You current wallet receive address is:');
					console.log('');
					console.log(wallet.receiveAddress);
					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
				}
			})
		program
			.command('addresses <count> [search-address]')
			.option("--json", "output as json format")
			.option("-s --start <start>", "output as json format")
			.description('show wallet addresses', {
				"search-address": "Search address",
				"start":"Starting index"
			})
			.action(async(count, search, cmd) => {

				try {
					let {json=false, start=0} = cmd;
					//console.log("cmd", "search address:'"+search+"'")
					const wallet = await this.openWallet();
					console.log('getting addresses for', this.network);
					this.setupLogs(wallet);
					//await wallet.sync(true);
					console.log('');
					console.log('');
					
					let listAddresses = (info)=>{

						if (json){
							let list = [];
							Object.entries(info.atIndex).forEach(([k, v])=>{
								//console.log(`	#${k}:`,v.green);
								list.push(v);
							})

							console.log("\n"+JSON.stringify(list, null, "\t"));

						}else{
							Object.entries(info.atIndex).forEach(([k, v])=>{
								console.log(`	#${k}:`,v.green);
							})
						}
					}
					start = +start;
					console.log("start:"+start, "count:"+count)
					if (search){
						console.log("Searching...", search)
						for (let i=start; i< count; i++){
							if (i % 200 == 0){
								console.log("index...", i);
							}
							let address = wallet.addressManager.changeAddress.next();
							if (address == search){
								console.log("found at change index:", i);
								break;
							}
							address =  wallet.addressManager.receiveAddress.next();
							if (address == search){
								console.log("found at receive index:", i);
								break;
							}
						}
					}else{
						for (let i=start; i< count; i++){
							wallet.addressManager.changeAddress.next();
							wallet.addressManager.receiveAddress.next();
						}
					}
					if (!search){
						console.log("Receive addresses:");
						listAddresses(wallet.addressManager.receiveAddress)
						console.log("Change addresses:");
						listAddresses(wallet.addressManager.changeAddress)
					}

					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
				}
			})
		program
			.command('qrcode')
			.description('show wallet address qrcode')
			.option('--amount <amount>', "amount of KAS included in qr code request")
			.action(async(cmd, options) => {
				const { amount } = cmd;
				try {
					const wallet = await this.openWallet();
					console.log('getting address for', this.network);
					this.setupLogs(wallet);
					await wallet.sync(true);
					let url = wallet.receiveAddress;
					
					if(amount) {
						let v = parseInt(amount);
						if(!isNaN(v) && v > 0)
							url += `?=amount=${v}`;
					}
					console.log('');
					console.log('');
					console.log(wallet.receiveAddress);
					qrcode.generate(url);
					console.log('');
					this.rpc.disconnect();
				} catch(ex) {
					log.error(ex.toString());
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
								log.error('invalid password');
								return;
							}
							if(!prev)
								return createPass(pass);
							else
							if(pass == prev)
								return next(pass);
							else {
								console.log('\n');
								log.error('passwords do not match')
								return;
							}
						},
						errorCB:()=>{
							log.error("invalid password");
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

		program
	        .command('permanently-decrypt')
	        .description('decrypt wallet permanently')
	        .action(async (cmd, options) => {
	        	try {
	        		const wallet = await this.openWallet();
	        		storage.saveWallet(wallet.mnemonic, {encryption:"none", generator: "cli"})
	        	}catch(ex) {
					log.error(ex.toString());
				}
				this.rpc.disconnect();
	        })
	    program
	        .command('permanently-encrypt')
	        .description('encrypt wallet permanently')
	        .action(async (cmd, options) => {
	        	const done = ()=>{
	        		this.rpc.disconnect();
	        	}
	        	const askForPass = ({title="Please enter password to encrypt: ", password}, CB)=>{
	        		Prompt({
						muted:true,
						question:title.yellow,
						CB:(pass)=>{
							if(password){
								if(password != pass){
									log.error("\nPassword dont match");
									askForPass({title, password}, CB)
									return
								}
							}else{
								if(pass.length<8){
									log.error("Invalid password");
									done()
									return
								}
							}
							CB(pass)
						},
						errorCB:()=>{
							log.error("Invalid password");
							done()
							//reject('invalid password');
						}
					})
	        	}
	        	try {
	        		const wallet = await this.openWallet();
	        		askForPass({}, (password)=>{
	        			askForPass({title:"Confirm password to encrypt: ", password}, async (confirmPassword)=>{
		        			log.info('')
							let encryptedMnemonic = await wallet.export(password)
							//console.log("wallet.mnemonic", wallet.mnemonic, "encryptedMnemonic:"+encryptedMnemonic)
							if(!encryptedMnemonic){
								log.error("Could not encrypt wallet");
								done()
								return 
							}
							storage.saveWallet(encryptedMnemonic, {encryption:"default", generator: "cli"})
		        		})
	        		})
	        	}catch(ex) {
					log.error(ex.toString());
				}
				done();
	        })
	    program
	        .command('compound')
	        .description('compound transactions by re-sending funds to itself')
	        .action(async (cmd, options) => {
	        	try {
	        		const wallet = await this.openWallet();
	        		await this.networkSync();
					this.setupLogs(wallet);
					await wallet.sync();
	        		let response = await wallet.compoundUTXOs()
	        		log.info("compound transactions response", response)
	        	}catch(ex) {
					log.error(ex.toString());
				}
				this.rpc.disconnect();
	        })

			program.parse(process.argv);

	}

	rpcDisconnect(){
		dpc(1000, ()=>{
			this.rpc.disconnect()
		})
	}


	getDuration(ts) {
		if(!ts)
			return '--:--:--';
		let delta = Math.round(ts / 1000);
		let sec_ = (delta % 60);
		let min_ = Math.floor(delta / 60 % 60);
		let hrs_ = Math.floor(delta / 60 / 60 % 24);
		let days = Math.floor(delta / 60 / 60 / 24);

		let sec = (sec_<10?'0':'')+sec_;
		let min = (min_<10?'0':'')+min_;
		let hrs = (hrs_<10?'0':'')+hrs_;

		if(days && days >= 1) {
			return `${days.toFixed(0)} day${days>1?'s':''} ${hrs}h ${min}m ${sec}s`;
		} else {
			let t = '';
			if(hrs_)
				t += hrs+'h ';
			if(hrs_ || min_) {
				t += min+'m ';
				t += sec+'s ';
			}
			else {
				t += sec_.toFixed(1)+' seconds';
			}
			return t;
		}
	}

	networkSync(){

		if(this.options.sync === false)
			return Promise.resolve();

		return new Promise(async (resolve, reject)=>{

			this.isNetworkSync = true;
			this.syncState = 'connect';
			const nsTs0 = Date.now();
			const barsize = (process.stdout.columns || 120) - 66;
			const hideCursor = true;
			const clearOnComplete = true;

			const headerSpan = 5000;

			try {
				await this.rpc.connect();
			} catch(ex) {
				log.error(ex.toString());
				process.exit(1);
			}

			this.syncState = 'init';
			log.info(`sync ... starting network sync`);

			let progress = null;

			const syncWait = () => {
				if(progress)
					progress.stop();
				progress = new cliProgress.SingleBar({
					format: 'DAG sync - waiting [{bar}] Headers: {headerCount} Blocks: {blockCount} Elapsed: {duration_formatted}',
					hideCursor, clearOnComplete, barsize
				}, cliProgress.Presets.rect);
				progress.start(headerSpan, 0, { headerCount : '...', blockCount: '...' });
			}

			const syncHeaders = () => {
				if(progress)
					progress.stop();
				progress = new cliProgress.SingleBar({
					format: 'DAG sync - headers [{bar}] Headers: {headerCount} - elapsed: {duration_formatted}',
					hideCursor, clearOnComplete, barsize
				}, cliProgress.Presets.rect);
				progress.start(headerSpan, 0);
			}

			const syncBlocks = () => {
				if(progress)
					progress.stop();
				progress = new cliProgress.SingleBar({
					format: 'DAG sync - blocks [{bar}] {percentage}% | ETA: {eta}s - elapsed: {duration_formatted}',
					hideCursor, clearOnComplete, barsize
				}, cliProgress.Presets.rect);
				progress.start(100, 0);
			}

			const medianOffset = (30+45)*1000; // allow 45 sec behind median
			const medianShift = Math.ceil(263*0.5*1000+medianOffset);
			let firstBlockCount;
			let firstHeaderCount;
			let firstMedianTime;

			let ready = false;
			while(!ready){
				let bdi = await this.rpc.client.call('getBlockDagInfoRequest').catch((ex)=>{
					console.log('');
					log.error(ex.toString());
					log.error('giving up...');
					process.exit(1);
				});

				if(this.resetNetworkSync) {
					this.resetNetworkSync = false;
					if(progress)
						progress.stop();
					progress = null;
					this.syncState = 'init';
				}

				//let vspbs = await this.rpc.client.call('getVirtualSelectedParentBlueScoreRequest');
				const pastMedianTime = parseInt(bdi.pastMedianTime);// + (75*1000);
				const blockCount = parseInt(bdi.blockCount);
				const headerCount = parseInt(bdi.headerCount);
				//const { blueScore } = parseInt(vspbs.blueScore);
				//console.log("\nheaderCount:"+headerCount, "blockCount:"+blockCount, "pastMedianTime:"+ new Date(pastMedianTime))


				switch(this.syncState) {
					case 'init': {
						firstBlockCount = blockCount;
						firstHeaderCount = headerCount;
						syncWait();
						this.syncState = 'wait';
					} break;

					case 'wait': {
						if(firstBlockCount != blockCount) {
							this.syncState = 'blocks';
							syncBlocks();
							firstMedianTime = pastMedianTime;
							continue;
						}
						else
						if(firstHeaderCount != headerCount) {
							this.syncState = 'headers';
							syncHeaders();
							continue;
						}
						else {
							progress.update(0, { blockCount, headerCount });
						}
					} break;

					case 'headers': {
						progress.update(headerCount % headerSpan, { headerCount, blockCount });
						if(firstBlockCount != blockCount) {
							this.syncState = 'blocks';
							syncBlocks();
							firstMedianTime = pastMedianTime;
							continue;
						}

					} break;

					case 'blocks': {
						const ts = (new Date()).getTime();
						const total = ts - firstMedianTime - medianShift;
						const range = pastMedianTime - firstMedianTime;
						let delta = range / total;
						// console.log({shift:ts-pastMedianTime,delta,ts,total:total/1000,range:range/1000,pastMedianTime,firstMedianTime,diff:(ts-pastMedianTime-medianShift)/1000,firstVsLast:(pastMedianTime-firstMedianTime)/1000});
						if(pastMedianTime+medianShift >= ts) { //} || delta > 0.999) {
							progress.update(100, { headerCount, blockCount });
							await delay(256);
							progress.stop();
							ready = true;
							// console.log("...network ");
							continue;
						}

						const percentage = delta*100;
						progress.update(Math.round(percentage), { headerCount, blockCount });

					} break;
				}

				await delay(1000);
			}

			const nsDelta = Date.now()-nsTs0;
			log.info(`sync ... finished (network sync done in ${this.getDuration(nsDelta)})`);
			this.isNetworkSync = false;
			resolve();
		})
	}
}



(async()=>{
	const cli = new KaspaWalletCli();
	await cli.init();
	await cli.main();
})();
