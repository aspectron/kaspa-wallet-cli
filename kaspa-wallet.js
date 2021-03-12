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



	async main() {

		let dump = (label, text, deco1="-", deco2="=")=>{
			console.log(`\n${label}:\n${deco1.repeat(100)}\n${text}\n${deco2.repeat(100)}\n`)
		}

		const logLevels = ['error','warn','info','verbose','debug'];
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
			.description('internal wallet information')
			.action(async (cmd, options) => {

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
					console.log("current address:", wallet.addressManager.receiveAddress.current.address.green);
					console.log(`balance available:`, `${this.KAS(wallet.balance.available)} KAS`.cyan,
					` pending:`, `${this.KAS(wallet.balance.pending)} KAS`.cyan, 
					` total:`, `${this.KAS(wallet.balance.total)} KAS`.cyan);
					console.log("receive addresses used:",wallet.addressManager.receiveAddress.counter);
					console.log("change addresses used: ",wallet.addressManager.changeAddress.counter);
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

		program
	        .command('create-test-txs')
	        .description('create test transactions')
	        .action(async (cmd, options) => {
	        	try {
	        		const wallet = await this.openWallet();
	            	await this.networkSync();
					this.setupLogs(wallet);
					wallet.setLogLevel('none');
					await wallet.sync();

					//let address = 'kaspatest:qq5nca0jufeku4mn6ecv50spa3ydfw686ulfal0a56';
					//let address = wallet.receiveAddress;//'kaspatest:qzdyu998j9ngqk0c6ljhgq92kw3gwccwjg0z4sveqk'
					//let address = "kaspatest:qqgklkypj97yvz52fylh3pfs3qmv9zq245nhu3xfsu"
					let address = wallet.addressManager.receiveAddress.atIndex[0];
					let amount = 0.01;
					let count = 1000;
					return this.createTestTransactions({
						wallet, address, amount, count
					})

					/*
					let txList = [];
					let txListLength = 0;
					let finalTxList = [];
					let transmissionResult = [];
					const changeAddrOverride = wallet.addressManager.changeAddress.atIndex[0];

					
					log.info("changeAddrOverride:"+changeAddrOverride)

					let halfAmount = Number(amount/2) * 1e8;
					let count2X = count*2
					amount = Number(amount) * 1e8;
					let progress = null;
					const barsize = (process.stdout.columns || 120) - 80;
					const hideCursor = true;
					const clearOnComplete = false;

					let createSignedTxs = async({title="TO-ITSELF", count, address, amount})=>{
						log.info(`(${title}) creating signed txs, address:${address}, amount:${amount}`);
						if(progress)
							progress.stop();
						progress = new cliProgress.SingleBar({
							format: `CreateSignedTxs (${title}) [{bar}] ETA: {eta}s | {value} / {total} | Elapsed: {duration_formatted}`,
							hideCursor, clearOnComplete, barsize
						}, cliProgress.Presets.rect);
						progress.start(count, 0, { i : '...', count: '...' });

						//console.log("createSignedTxs started", {count, address, amount})
						let error, list = [], i=0, amounts = [], totalAmount = 0;
						const p = 100/count;
						do{
							
							const data = await wallet.buildTransaction({
								toAddr: address,
								changeAddrOverride,
								amount,
								fee:0, calculateNetworkFee:true, inclusiveFee:0, note:''
							}).catch(err=>{
								let msg = err.error || err.message || err;
								error = (msg+"").replace("Error:", '');
								//if(/Invalid Argument/.test(error))
								//	error = "Please provide address and amount";
								//console.log("buildTransaction:error", error);
								//error = 'Unable to estimate transaction fees';//(err+"").replace("Error:", '')
							})

							if(data){
								let amountAvailable = data.utxos.map(utxo=>utxo.satoshis).reduce((a,b)=>a+b,0);
								totalAmount += amountAvailable;
								amounts.push(amount);
								list.push(data);
							}
							//console.log("data", data)
							//++i;
							//progress.update(i, { i, count });
							progress.increment();
						}while(!(error || list.length >= count));

						//if(list.length >= count)
							progress.stop();
						//console.log("createSignedTxs finished", "count:"+count, "address:"+address, "amount:"+amount, "list.length:"+list.length)
						return list;
					}

					const createReSubmitableTxs = async()=>{
						let requiredTXCount = count2X-txListLength;
						if(requiredTXCount<=0)
							return console.log("createReSubmitableTxs loop finished: txListLength, count", txListLength,  count2X)

						let nextTransmissionFee = 700;
						let amt = halfAmount + nextTransmissionFee;
						let address = changeAddrOverride;//wallet.receiveAddress;

						let list = await createSignedTxs({count:requiredTXCount, address, amount:amt})

						for(let tx of list){
							



							let error=false;
							let txid = await wallet.api.submitTransaction(tx.rpcTX)
							.catch(err=>{
								error = err;
							})
							//console.log("tx.rpcTX", tx.rpcTX)
							if(!error){
								transmissionResult.push({id:tx.id, txid});//, error})
								txList.push(tx);
								txListLength++;
							}else{
								console.error("submitTransaction:", error.error||error.message||error)
							}
						}

						//console.log("createReSubmitableTxs: txListLength, count", txListLength,  count2X)
					}

					const buildFinalTxList = async()=>{
						if(finalTxList.length >= count){
							return done();
						}
						let list = await createSignedTxs({
							title:"FinalTx",
							count:count-finalTxList.length,
							address,
							amount
						})
						
						pushToFinalList(...list)
					}

					const pushToFinalList = (...txs)=>{
						finalTxList.push(...txs)
						//console.log("buildFinalTxList: finalTxList.length, count", finalTxList.length,  count)
						debounce("flush", 500, flushTxsToFile)
						if(finalTxList.length >= count){
							return done();
						}
					}

					const flushTxsToFile = ()=>{
						const utxoIds = [];
						const txs = finalTxList.map(tx=>{
							utxoIds.push(...tx.utxoIds)
							return {
								id:tx.id,
								rpcTX:tx.rpcTX
							}
						})
						fs.writeFileSync(txFilePath, JSON.stringify({txs, utxoIds}, null, "\t"));
					}

					const done = ()=>{
						//log.info("txList", txList)
						//log.info("transmissionResult", transmissionResult)
						//log.info("finalTxList.length", finalTxList.length)
						//log.info("finalTxList", finalTxList)
						flushTxsToFile();

						//submitTxs(txs, ()=>{
							clearDpc();
							this.rpcDisconnect();
						//});
					}

					const submitTxs =(txs, doneCB)=>{
						for(let i=0;i<10;i++)
							log.info("####################################################################")

						let result = [];
						const printResult = (r)=>{
							result.push(r)
							if(result.length == txs.length){
								log.info("TX submit result", result)
								doneCB()
							}
						}
						
						txs.map(tx=>{
							wallet.api.submitTransaction(tx.rpcTX)
							.then(txid=>{
								printResult({id:tx.id, txid});
							})
							.catch(err=>{
								printResult({id:tx.id, error:err.error||err.message||err});
							})
						})
					}
					//debounce("printBalance", 5000, e=>printBalance(wallet.balance))
					let timeTick = false;
					let dpcId;
					const updateTimeTick = ()=>{
						timeTick = true;
						dpcId = dpc(1000, updateTimeTick);
					}

					const clearDpc = ()=>{
						if(dpcId){
							clearDPC(dpcId);
							dpcId = null;
						}
					}

					updateTimeTick();

					const txFilePath = path.join(__dirname, "_txs_.json");
					if(0 && fs.existsSync(txFilePath)){
						let info = fs.readFileSync(txFilePath)+"";
						let {txs, utxoIds} = JSON.parse(info);
						console.log(`tx file loaded: ${txs.length} txs, ${utxoIds.length} utxos`)
						wallet.utxoSet.inUse.push(...utxoIds);
						//submitTxs(txs, ()=>{
							clearDpc();
							this.rpcDisconnect();
						//});
					}
					await createReSubmitableTxs();
					if(txListLength < count2X){
						let txPromise;
						wallet.on("balance-update", async()=>{
							if(timeTick%5 == 0){
								printBalance(wallet.balance)
							}
							if(txPromise)
								return
							if(txListLength < count2X){
								txPromise = createReSubmitableTxs();
							}else{
								txPromise = buildFinalTxList();
							}
							await txPromise;
							txPromise = null;
						})
					}else{
						buildFinalTxList();
					}
					*/
					
				} catch(ex) {
					log.error(ex.toString());
				}
	        })

		program.parse(process.argv);
	}

	createTestTransactions({wallet, address, count, amount}){
		/*
		if(wallet._isOurChangeOverride){
			wallet._isOurChangeOverride = true;
			const changeAddrOverride = wallet.addressManager.changeAddress.atIndex[0];
			const isOurChange = wallet.addressManager.isOurChange.bind(wallet.addressManager)
			wallet.addressManager.isOurChange = (address)=>{
				if(address == changeAddrOverride)
					return false;
				return isOurChange(address);
			}
		}
		*/

		//count = 1000;
		//address = wallet.addressManager.receiveAddress.atIndex[0];
		amount = Number(amount) * 1e8;
		
		const signedTxs = [];



		const txFilePath = path.join(__dirname, "_txs_.json");
		if(fs.existsSync(txFilePath)){
			let info = fs.readFileSync(txFilePath)+"";
			let {txs} = JSON.parse(info);
			let utxoIds = [];
			txs.map(tx=>{
				utxoIds.push(...tx.utxoIds)
			})
			log.info(`tx file loaded: ${txs.length} txs, ${utxoIds.length} utxos`)
			wallet.utxoSet.inUse.push(...utxoIds);
			signedTxs.push(...txs)
		}


		const submitTxResult = [];
		log.info("amount", amount)

		const barsize = 50;//(process.stdout.columns || 120) - 100;
		const hideCursor = false;
		const clearOnComplete = false;
		const progress = new cliProgress.SingleBar({
			format: `CreatingTXs [{bar}] `+
					`ETA: {eta}s | {value} / {total} | Eld: {duration_formatted} | `+
					`{status}`,
			hideCursor, clearOnComplete, barsize
		}, cliProgress.Presets.rect);

		let progressStoped = true;
		const stopProgress = ()=>{
			progressStoped = true;
			progress.stop()
		}
		const startProgress = (total, start, opt)=>{
			if(progressStoped){
				progressStoped = false;
				progress.start(total, start, opt)
			}
			else
				progress.update(start, opt)
		}
		const flushTxsToFile = ()=>{
			fs.writeFileSync(txFilePath, JSON.stringify({txs:signedTxs}, null, "\t"));
		}

		startProgress(count, 0, {status:''});



		let submitTxMap = new Map();
		let utxoId2TXIdMap = new Map();
		const submitTx = async (rpcTX, id)=>{
			let error=false;
			submitTxMap.set(id, rpcTX.transaction.outputs.length-1);
			let txid = await wallet.api.submitTransaction(rpcTX)
			.catch(err=>{
				error = err.error || err.message
				_log("\nerror", err)
			})
			if(error){
				submitTxMap.delete(id);
			}else{
				rpcTX.transaction.outputs.map((o, index)=>{
					let txoId = txid+index;
					utxoId2TXIdMap.set(txoId, id);
				})
			}
			submitTxResult.push({txid, error})
			progress.update(signedTxs.length, {status: txid? "txid:"+txid: error})
			submitTxMap.size && run()
		}

		let stoped = false;
		const done = ()=>{
			if(stoped)
				return
			stoped = true;
			stopProgress();
			//log.info('')
			//log.info("submitTxResult", submitTxResult)
			log.info("signedTxs", signedTxs.length)
			this.rpcDisconnect();
			//process.exit(0)
		}

		let running = 0;
		let status = '';
		const createTx = ()=>{
			if(stoped)
				return
			const nums = count-signedTxs.length;
			startProgress(count, signedTxs.length, {status});
			this._createTestTransactions({
				wallet, address, count:nums, totalCount:count,
				amount,
				signedTxs, _log
			}, ({rpcTX, utxoIds, to, id})=>{
				
				if(to.length > 1){
					progress.update(signedTxs.length, {status: 'submiting TX'})
					submitTx(rpcTX, id);
				}else{
					signedTxs.push({rpcTX, id, utxoIds})
					debounce("flushTxsToFile", 200, flushTxsToFile);
					progress.increment();
					if(signedTxs.length >= count){
						done()
					}
				}
			});
			let outCount = 0;
			submitTxMap.forEach((count)=>{
				outCount += count;
			})
			status = "waitingTxs:"+submitTxMap.size+"("+outCount+") isRunning:"+running;
			let filled = signedTxs.length >= count
			if( !filled && running > 1)
				return createTx();
			running = 0;
			dpc(1, ()=>{
				let {utxos} = wallet.utxoSet.collectUtxos(Number.MAX_SAFE_INTEGER)
				let pendingUtxoCount = wallet.utxoSet.utxos.pending.size
				if(filled || (!submitTxMap.size && running<1 && !pendingUtxoCount && !utxos.length) ){
					_log("calling done.........")
					done();
				}else{
					//_log("utxos:"+utxos.length+", running:"+running)
					run();
				}
			})
		}

		const run = ()=>{
			if(running){
				running++;
				return
			}
			running = 1;
			createTx();
		}

		const _log = (...args)=>{
			if(stoped)
				return
			stopProgress();
			//log.info('');
			log.info(...args);
			startProgress(count, signedTxs.length, {status:''});
		}

		run();

		if(signedTxs.length < count){
			wallet.on("balance-update", ()=>{
				debounce("submitTxMapsize", 500, ()=>{
					if(submitTxMap.size){
						let before = submitTxMap.size;
						let txId, utxoID, utxos = wallet.utxoSet.utxos.confirmed;
						utxos.forEach(utxo=>{
							utxoID = utxo.txId + utxo.outputIndex;
							txId = utxoId2TXIdMap.get(utxoID)
							if(txId)
								submitTxMap.delete(txId);
						})
						_log("waitingTxs update", before+"=>"+submitTxMap.size)
					}

					run();
				})
				run();
			})
		}

	}
	/*
	BYTES : 2+8+151+8+43+8+20+8+8+32
	Txn Version: 2
	number of inputs: 8
	INPUT::::: 151
		previus tx ID:32
		index: 4
		length of signature script: 8
		SignatureScript length: 99
		sequence: 8

	number of outputs: 8
	OUTPUT:::: 43
		value: 8
		Version: 2
		length of script public key: 8
		ScriptPublicKey.Script: 25
	lock time: 8
	subnetworkId: 20
	gas:8
	length of the payload: 8
	Payload: 
	payload hash: 32

	*/

	_createTestTransactions({wallet, _log, address, count, totalCount, amount, signedTxs, maxFee=6000}, CB){
		if(count<1)
			return
		const {kaspacore} = Wallet;
		const changeAddr = wallet.addressManager.changeAddress.atIndex[0];
		let {utxos, utxoIds} = wallet.utxoSet.collectUtxos(Number.MAX_SAFE_INTEGER)
		//utxos.map(u=>{
		//	u.m = Math.round(u.satoshis % amt);
		//})
		utxos = utxos.sort((a, b)=>{
			return a.satoshis-b.satoshis;
		})
		const baseFee = 94;
		const feePerOutput = 43;
		const feePerInput = 151;

		const createToFields = ({inputCount, totalAmount})=>{
			const inputFee = inputCount * feePerInput;
			let fee = baseFee+inputFee+feePerOutput // base + inputs + change output fee
			const oneOutputAmount = amount+feePerOutput;

			let to = [];
			let total = fee;
			do{
				to.push({address, amount})
				fee += feePerOutput;
				total += oneOutputAmount;
			}while(fee<maxFee && total < totalAmount-oneOutputAmount);

			if(to.length>1){//if there are more outputs send it to itself
				to.map(to=>{
					to.address = changeAddr
				})
			}
			return {to, fee};
		}

		const createTx = ({utxos, total})=>{
			
			const utxoIds = [];
			const privKeys = utxos.reduce((prev, cur) => {
				const utxoId = cur.txId + cur.outputIndex;
				utxoIds.push(utxoId);
				return [wallet.addressManager.all[String(cur.address)], ...prev];
			}, []);

			const {to, fee} = createToFields({inputCount:utxos.length, totalAmount:total})


			const tx = new kaspacore.Transaction()
				.from(utxos)
				.to(to)
				.setVersion(0)
				.fee(fee)
				.change(changeAddr)
			tx.sign(privKeys, kaspacore.crypto.Signature.SIGHASH_ALL, 'schnorr');

			const {nLockTime: lockTime, version, id } = tx;
			const inputs = tx.inputs.map(input => {
				//_log("input.script.toBuffer()", input.script.toBuffer().length)
				return {
					previousOutpoint: {
						transactionId: input.prevTxId.toString("hex"),
						index: input.outputIndex
					},
					signatureScript: input.script.toBuffer().toString("hex"),
					sequence: input.sequenceNumber
				};
			})
			const outputs = tx.outputs.map(output => {
				//_log("output.script.toBuffer()", output.script.toBuffer().length)
				return {
					amount: output.satoshis,
					scriptPublicKey: {
						scriptPublicKey: output.script.toBuffer().toString("hex"),
						version: 0
					}
				}
			})

			const rpcTX = {
				transaction: {
					version,
					inputs,
					outputs,
					lockTime,
					payloadHash: '0000000000000000000000000000000000000000000000000000000000000000',
					subnetworkId: wallet.subnetworkId,
					fee
				}
			}

			wallet.utxoSet.inUse.push(...utxoIds)

			//_log("createTx", utxos.length, fee, total, to.length)
			CB({rpcTX, utxoIds, id, to})
		}

		let satoshis = 0;
		let txUTXOs = [];
		let fee = baseFee;
		const amountPlusFee = amount+fee;
		let _amountPlusFee = amountPlusFee;
		//_log("___utxos__ :"+utxos.length)
		for (const u of utxos){
			satoshis += u.satoshis;
			txUTXOs.push(u);
			if(satoshis/_amountPlusFee >= 1){
				//_log("_amountPlusFee1111", txUTXOs.length, satoshis, amountPlusFee)
				createTx({utxos:txUTXOs, fee, total:satoshis})
				_amountPlusFee = amountPlusFee;
				fee = baseFee;
				satoshis = 0;
				txUTXOs = [];
			}else{
				_amountPlusFee += feePerInput;
				fee += feePerInput;
				//_log("_amountPlusFee", txUTXOs.length, satoshis, amountPlusFee)
			}
			if(signedTxs.length>=totalCount)
				break;
			//console.log("u.satoshis", u.n, u.satoshis)
		}
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

			const medianOffset = 45*1000; // allow 45 sec behind median
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
