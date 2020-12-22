/*
let x = "63323666393137373232393136373634343139666161633731626436616532623937653633383565633663633564316638356433666338373739303032396634".match(/.{2}/g);
x = x.map(x=>+x);
let a = Buffer.from(x).toString("hex");
console.log("xxxx", x, a);

*/

const crypto = require("crypto");
const blake2 = require('blake2');
const {BufferReader} = require('bitcore-lib-cash').encoding;
let algo = "blake2b,blake2s,blake2bp,blake2sp".split(",");

let hashes = {};
const key  = Buffer.from("TransactionSigningHash");
algo.map(algo=>{
	hashes[algo] = str=>{
		let buf = Buffer.from(str, "hex");
		return blake2.createKeyedHash(algo, key).update(buf).digest("hex");
	}

	hashes[algo+"32"] = str=>{
		let buf = Buffer.from(str, "hex");
		return blake2.createKeyedHash(algo, key, {digestLength:32}).update(buf).digest("hex");
	}

	hashes[algo+"_dubble"] = str=>{
		return hashes[algo](hashes[algo](str));
	}

	hashes[algo+"_32_dubble"] = str=>{
		return hashes[algo+"32"](hashes[algo+"32"](str));
	}
});

//const sha256_2 = str=>sha256(sha256(str));
//const blake2bHash;

let a = `
$$$$$$$ 01000000
$$$$$$$ 0100000000000000
$$$$$$$ 363807910325bff85a2150a42d62a2aaea2f364c73bed19e886149154ebcfa6c
$$$$$$$ 09000000
$$$$$$$ 1900000000000000
$$$$$$$ 76a914784bf4c2562f38fe0c49d1e0538cee4410d37e0988ac
$$$$$$$ ffffffff00000000
$$$$$$$ 0200000000000000
$$$$$$$ e803000000000000
$$$$$$$ 1900000000000000
$$$$$$$ 76a914ef948254c1dfba15a5c34d5840ce2e988e32654a88ac
$$$$$$$ 88ec052a01000000
$$$$$$$ 1900000000000000
$$$$$$$ 76a91488963bdc0de0775612aea7003b40b34ed97b4de788ac
$$$$$$$ 0000000000000000
$$$$$$$ 0000000000000000000000000000000000000000
$$$$$$$ 0000000000000000
$$$$$$$ 0000000000000000000000000000000000000000000000000000000000000000
$$$$$$$ 0000000000000000
$$$$$$$ 
$$$$$$$ 01000000
`

a = a.trim().replace(/(\$\$\$\$\$\$\$)/g, '').split("\n").map(a=>a.trim()).filter(a=>!!a);

let b = [
  '01000000',
  '0100000000000000',
  '363807910325bff85a2150a42d62a2aaea2f364c73bed19e886149154ebcfa6c',
  '09000000',
  '1900000000000000',
  '76a914784bf4c2562f38fe0c49d1e0538cee4410d37e0988ac',
  'ffffffff00000000',
  '0200000000000000',
  'e803000000000000',
  '1900000000000000',
  '76a914ef948254c1dfba15a5c34d5840ce2e988e32654a88ac',
  '88ec052a01000000',
  '1900000000000000',
  '76a91488963bdc0de0775612aea7003b40b34ed97b4de788ac',
  '0000000000000000',
  '0000000000000000000000000000000000000000',
  '0000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000',
  '01000000'
];

console.log(a, b);

let index = a.findIndex((a, i)=>a!=b[i]);
console.log("mismatch:", index, a[index], b[index])


a = a.join("");
console.log("\n"+a);
//console.log("A123 -> sha256:", sha256("A123"));

//let hash1 = sha256(a);
//let hash2 = sha256_2(a);
//let inverse = '';//new BufferReader(Buffer.from(hash1, "hex")).readReverse();

//let result = "80ca6efa95252d5fadf268c750cf541e45a99519ee83d0750e857735cdf378b0";
const result = "63315b7a7572e9c27d9418ccc6c1b7c78b17c96a3d7d1d3e3e2d0d116cce6c96";
console.log("\nrequired hash:", result)
Object.keys(hashes).map(method=>{
	let hash = hashes[method](a);
	//let reverse = hash.match(/.{2}/g).reverse().join("");
	let reverse = new BufferReader(Buffer.from(hash, "hex")).readReverse().toString("hex");
	console.log(method.padEnd(20), hash, reverse, result==hash, result==reverse)
})





