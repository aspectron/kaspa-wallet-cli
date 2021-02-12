Kaspa Wallet (CLI)
==================

Kaspa Wallet command-line interface build on top of [Kaspa Wallet](https://github.com/aspectron/kaspa-wallet) framework.

This command-line wallet is compatible with [KDX](https://kdx.app)


Installing Kaspa Wallet
-----------------------

```
npm install -g @kaspa/wallet-cli
kaspa-wallet
```

Cloning Kaspa Wallet
--------------------
The following applies to development environment only:
```
git clone git@github.com:aspectron/kaspa-wallet-cli
cd kaspa-wallet-cli
npm install
node kaspa-wallet
```

Running Kaspa Wallet
--------------------

```
$ node kaspa-wallet
Usage: kaspa-wallet [options] [command]

Kaspa Wallet client

Options:
  --version                                output the version number
  --log <level>                            set log level error, warn, info, verbose, debug
  --verbose                                log wallet activity
  --debug                                  debug wallet activity
  --testnet                                use testnet network
  --devnet                                 use devnet network
  --simnet                                 use simnet network
  --rpc <address>                          use custom RPC address <host:port>
  --folder <path>                          use custom folder for wallet file storage
  --file <filename>                        use custom wallet filename
  --help                                   display help for command

Commands:
  monitor                                  monitor wallet activity
  balance                                  display wallet balance
  send [options] <address> <amount> [fee]  send funds to an address
  info                                     internal wallet information
  address                                  show wallet address
  create [options]                         create Kaspa wallet
  help [command]                           display help for command
```



gRPC Interface Utility
----------------------

Kaspa Wallet provides a test utility `rpc.js` allowing you to send RPC commands to `kaspad` from the terminal:

```
$ node kaspa-rpc
Usage: kaspa-rpc [options] [command]

Kaspa gRPC client

Options:
  --version                                         output the version number
  --testnet                                         use testnet network
  --devnet                                          use devnet network
  --simnet                                          use simnet network
  --server <server>:<port>                          use custom gRPC server endpoint
  -h, --help                                        display help for command

Commands:
  run [options]                                     Run gRPC "run -m <method> -j <json_data>"
  requestBlockLocator [options]                     gRPC call requestBlockLocator
  requestAddresses [options]                        gRPC call requestAddresses
  requestHeaders [options]                          gRPC call requestHeaders
  requestNextHeaders                                gRPC call requestNextHeaders
  requestRelayBlocks [options]                      gRPC call requestRelayBlocks
  requestTransactions [options]                     gRPC call requestTransactions
  requestPruningPointUTXOSetAndBlock [options]      gRPC call requestPruningPointUTXOSetAndBlock
  requestIBDBlocks [options]                        gRPC call requestIBDBlocks
  requestPruningPointHash                           gRPC call requestPruningPointHash
  requestNextPruningPointUtxoSetChunk               gRPC call requestNextPruningPointUtxoSetChunk
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
  ban [options]                                     gRPC call ban
  unban [options]                                   gRPC call unban
  getInfo                                           gRPC call getInfo
  help [command]                                    display help for command
  ```

RPC Example
-----------
```
node rpc run -m getTransactionsByAddressesRequest -j '{"addresses":["kaspatest:qr32vna4u8wdamddwaf8853gt52dsauyp59zlcwd5k"], "startingBlockHash":""}'
```

Running Kaspad and Mining
-------------------------

```sh
./kaspad --utxoindex --testnet --dnsseed=testnet-dnsseed.daglabs-dev.com
./kaspaminer --miningaddr=kaspatest:qq0nvlmn07f6edcdfynt4nu4l4r58rkquuvgt635ac --rpcserver=localhost:16210 --testnet
```
