
const { Wallet } = require('kaspa-wallet');
const fs = require("fs");
//let largeContent = fs.readFileSync("./test_sample.txt")+"";

Wallet.openFileStorage("Wallet2.dat", "hello 2")
let storage = Wallet.storage;
storage.initLogs();

//storage.clear();
//storage.set("largeContent", largeContent);
storage.set("abc", "12345678");
console.log("12345678 test : ", "12345678"==storage.get("abc"));
//console.log("largeContent", largeContent==storage.get("largeContent"))


Wallet.openFileStorage("Wallet.dat", "hello")
storage = Wallet.storage;
storage.initLogs();
storage.set("abc", "123");
console.log("123 test : ", "123"==storage.get("abc"));

