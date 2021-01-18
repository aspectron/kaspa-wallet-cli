Kaspa Wallet (CLI)
==================

Kaspa Wallet command-line interface build on top of [Kaspa Wallet](https://github.com/aspectron/kaspa-wallet) library.

This command-line wallet is compatible with [KDX](https://kdx.app)

Cloning Kaspa Wallet
--------------------

```
git clone git@github.com:aspectron/kaspa-wallet-cli
cd kaspa-wallet-cli
npm install
```

Running Kaspa Wallet
--------------------

```
$ node wallet
Usage: wallet [options] [command]

Kaspa Wallet client

Options:
  --version                      output the version number
  --log <level>                  set log level error, warn, info, verbose, debug
  --verbose                      log wallet activity
  --debug                        debug wallet activity
  --testnet                      use testnet network
  --devnet                       use devnet network
  --simnet                       use simnet network
  --rpc <address>                use custom RPC address <host:port>
  --folder <path>                use custom folder for wallet file storage
  --file <filename>              use custom wallet filename
  --help                         display help for command

Commands:
  monitor                        monitor wallet activity
  balance                        display wallet balance
  send <address> <amount> [fee]  send funds to an address
  create [options]               Create Kaspa wallet
  help [command]                 display help for command

```



gRPC Interface Utility
----------------------

Kaspa Wallet provides a test utility `rpc.js` allowing you to send RPC commands to `kaspad` from the terminal:

```
$ node rpc
Usage: rpc [options] [command]

Kaspa gRPC client

Options:
  --version                                         output the version number
  --testnet                                         use testnet network
  --devnet                                          use devnet network
  --simnet                                          use simnet network
  -h, --help                                        display help for command

Commands:
  run [options]                                     Run gRPC "run -m <method> -j <json_data>"
  requestBlockLocator [options]                     gRPC call requestBlockLocator
  requestAddresses [options]                        gRPC call requestAddresses
  requestHeaders [options]                          gRPC call requestHeaders
  requestNextHeaders                                gRPC call requestNextHeaders
  requestRelayBlocks [options]                      gRPC call requestRelayBlocks
  requestTransactions [options]                     gRPC call requestTransactions
  requestIBDRootUTXOSetAndBlock [options]           gRPC call requestIBDRootUTXOSetAndBlock
  requestIBDBlocks [options]                        gRPC call requestIBDBlocks
  requestIBDRootHash                                gRPC call requestIBDRootHash
  getCurrentNetwork                                 gRPC call getCurrentNetwork
  submitBlock [options]                             gRPC call submitBlock
  getBlockTemplate [options]                        gRPC call getBlockTemplate
  notifyBlockAdded                                  gRPC call notifyBlockAdded
  getPeerAddresses                                  gRPC call getPeerAddresses
  getSelectedTipHash                                gRPC call getSelectedTipHash
  getMempoolEntry [options]                         gRPC call getMempoolEntry
  getConnectedPeerInfo                              gRPC call getConnectedPeerInfo
  addPeer [options]                                 gRPC call addPeer
  submitTransaction [options]                       gRPC call submitTransaction
  notifyVirtualSelectedParentChainChanged           gRPC call notifyVirtualSelectedParentChainChanged
  getBlock [options]                                gRPC call getBlock
  getSubnetwork [options]                           gRPC call getSubnetwork
  getVirtualSelectedParentChainFromBlock [options]  gRPC call getVirtualSelectedParentChainFromBlock
  getBlocks [options]                               gRPC call getBlocks
  getBlockCount                                     gRPC call getBlockCount
  getBlockDagInfo                                   gRPC call getBlockDagInfo
  resolveFinalityConflict [options]                 gRPC call resolveFinalityConflict
  notifyFinalityConflicts                           gRPC call notifyFinalityConflicts
  getMempoolEntries                                 gRPC call getMempoolEntries
  shutDown                                          gRPC call shutDown
  getHeaders [options]                              gRPC call getHeaders
  notifyUtxosChanged [options]                      gRPC call notifyUtxosChanged
  getUtxosByAddresses [options]                     gRPC call getUtxosByAddresses
  getVirtualSelectedParentBlueScore                 gRPC call getVirtualSelectedParentBlueScore
  notifyVirtualSelectedParentBlueScoreChanged       gRPC call notifyVirtualSelectedParentBlueScoreChanged
  help [command]                                    display help for command
  ```

RPC Example
-----------
```
node rpc run -m getTransactionsByAddressesRequest -j '{"addresses":["kaspatest:qr32vna4u8wdamddwaf8853gt52dsauyp59zlcwd5k"], "startingBlockHash":""}'
```

Running Kaspad
--------------

```sh
./kaspad --utxoindex --testnet
./kaspaminer --miningaddr=kaspatest:qq0nvlmn07f6edcdfynt4nu4l4r58rkquuvgt635ac --rpcserver=localhost:16210 --block-delay=5000 --mine-when-not-synced --testnet
```
