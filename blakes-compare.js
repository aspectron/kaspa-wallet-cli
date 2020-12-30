
var blake2b = require('blake2b-wasm')
var blake2 = require('blake2')
var key = new Uint8Array(32);
blake2b.ready(function () {
  var hash = blake2b(32, key)
    .update(Buffer.from('hello world'))
    .digest('hex')

    var hash1 = blake2.createKeyedHash('blake2b',key, {digestLength: 32})
    .update(Buffer.from('hello world'))
    .digest('hex')

  console.log('Blake2b hash of "hello world" is %s', hash)
  console.log('Blake2 hash of "hello world" is %s', hash1)
})


