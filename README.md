# kaspa-wallet-cli

```
$ node rpc -h
Usage: rpc [options] [command]

Kaspa gRPC Test client

Options:
  -V, --version                                output the version number
  -h, --help                                   display help for command

Commands:
  run [options]                                Run gRPC "run -m <method> -j <json_data>"
  requestBlockLocator [options]                gRPC call requestBlockLocator
  requestAddresses [options]                   gRPC call requestAddresses
  requestHeaders [options]                     gRPC call requestHeaders
  requestNextHeaders                           gRPC call requestNextHeaders
  requestRelayBlocks [options]                 gRPC call requestRelayBlocks
  requestSelectedTip                           gRPC call requestSelectedTip
  requestTransactions [options]                gRPC call requestTransactions
  requestIBDRootUTXOSetAndBlock [options]      gRPC call requestIBDRootUTXOSetAndBlock
  requestIBDBlocks [options]                   gRPC call requestIBDBlocks
  getCurrentNetworkRequest                     gRPC call getCurrentNetworkRequest
  submitBlockRequest [options]                 gRPC call submitBlockRequest
  getBlockTemplateRequest [options]            gRPC call getBlockTemplateRequest
  notifyBlockAddedRequest                      gRPC call notifyBlockAddedRequest
  getPeerAddressesRequest                      gRPC call getPeerAddressesRequest
  getSelectedTipHashRequest                    gRPC call getSelectedTipHashRequest
  getMempoolEntryRequest [options]             gRPC call getMempoolEntryRequest
  getConnectedPeerInfoRequest                  gRPC call getConnectedPeerInfoRequest
  addPeerRequest [options]                     gRPC call addPeerRequest
  submitTransactionRequest [options]           gRPC call submitTransactionRequest
  notifyChainChangedRequest                    gRPC call notifyChainChangedRequest
  getBlockRequest [options]                    gRPC call getBlockRequest
  getSubnetworkRequest [options]               gRPC call getSubnetworkRequest
  getChainFromBlockRequest [options]           gRPC call getChainFromBlockRequest
  getBlocksRequest [options]                   gRPC call getBlocksRequest
  getBlockCountRequest                         gRPC call getBlockCountRequest
  getBlockDagInfoRequest                       gRPC call getBlockDagInfoRequest
  resolveFinalityConflictRequest [options]     gRPC call resolveFinalityConflictRequest
  notifyFinalityConflictsRequest               gRPC call notifyFinalityConflictsRequest
  getMempoolEntriesRequest                     gRPC call getMempoolEntriesRequest
  shutDownRequest                              gRPC call shutDownRequest
  getHeadersRequest [options]                  gRPC call getHeadersRequest
  notifyTransactionAddedRequest [options]      gRPC call notifyTransactionAddedRequest
  notifyUTXOOfAddressChangedRequest [options]  gRPC call notifyUTXOOfAddressChangedRequest
  getUTXOsByAddressRequest [options]           gRPC call getUTXOsByAddressRequest
  getTransactionsByAddressesRequest [options]  gRPC call getTransactionsByAddressesRequest
  help [command]                               display help for command

  ```

  #### Example

  ```
  node rpc run -m getTransactionsByAddressesRequest -j '{"addresses":["kaspatest:qr32vna4u8wdamddwaf8853gt52dsauyp59zlcwd5k"], "startingBlockHash":""}'
  ```