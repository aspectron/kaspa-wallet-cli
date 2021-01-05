
const { Wallet } = require('kaspa-wallet');
const fs = require("fs");
//let largeContent = fs.readFileSync("./test_sample.txt")+"";
const storage = Wallet.getStorage();
storage.initLogs();
Wallet.setStorageType("FILE");
//Wallet.setStorageFileName("Wallet2.dat");
//Wallet.setStoragePassword("hello 123#1");
Wallet.openFileStorage("Wallet2.dat", "hello 123#1")

//storage.clear();
//storage.set("largeContent", largeContent);
storage.set("abc", "12345678");
console.log("12345678 test : ", "12345678"==storage.get("abc"));
//console.log("largeContent", largeContent==storage.get("largeContent"))


//Wallet.setStorageFileName("Wallet.dat");
//Wallet.setStoragePassword("hello 123#");
Wallet.openFileStorage("Wallet.dat", "hello 123#")
storage.set("abc", "123");
console.log("123 test : ", "123"==storage.get("abc"));

