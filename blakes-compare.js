
var blake2b = require('blake2b-wasm')
var blake2 = require('blake2')
var key = Buffer.from('TransactionSigningHash');
let msg = '010000000100000000000000363807910325bff85a2150a42d62a2aaea2f364c73bed19e886149154ebcfa6c09000000190000000000000076a914784bf4c2562f38fe0c49d1e0538cee4410d37e0988acffffffff000000000200000000000000e803000000000000190000000000000076a914ef948254c1dfba15a5c34d5840ce2e988e32654a88ac88ec052a01000000190000000000000076a91488963bdc0de0775612aea7003b40b34ed97b4de788ac0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000';
blake2b.ready(function () {
  	var hash = blake2b(32, key)
	    .update(Buffer.from(msg, "hex"))
	    .digest('hex')

	var hash1 = blake2.createKeyedHash('blake2b', key, {digestLength: 32})
	    .update(Buffer.from(msg, "hex"))
	    .digest('hex')

	console.log("\nhash of \n%s", msg)
	console.log('Blake2b hash is %s', hash)
	console.log('Blake2  hash is %s', hash1)
})


