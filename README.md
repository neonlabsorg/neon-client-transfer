# Neon Transfer module for javascript client

---
**NOTE**

Package is not fully tested yet.
For clean working configuration example we have to rebuild connect status buttons, their transfer callbacks and error handling.

---

## Installation and setup

Firstly, install the package

`npm install neon-portal --save`

### For native

After installing you need to pass some required properties, when calling new instance, for properly working. Neon wallet interface based on Metamask. So, besides Solana Phantom wallet (module checks, is wallet objects - window.solana and window.ehtereum - really exists. If not - module will throw an error for you) you need to connect Metamask wallet and get both user addresses, which you need to pass as properties

| Property name                   | Type       |      Description      | is required |
|--------------------------------:|:----------:|:---------------------:|------------:|
| solanaWalletAddress | String | Address from solana wallet | true |
| neonWalletAddress | String | Address of preconfigured for neon network metamask wallet | true |
| connection | Object | connection module of solana web3 framework. You have to provide your own connection, if it exists. Cause of context, if you won't, it should start working for other solana networks.  | false |
| network | String | If you have your own connection, but have no access for it, you can just pass the name of using network. It can be only 'devnet', 'testnet' or 'mainnet-beta'. It provides to 'clusterApiUrl' for transforming into right RPC URL | false |
| onBeforeCreateInstructions | function | Function, which calls on start of init transfer functions. It uses in both transfer functions | false |
| onCreateNeonAccountInstruction | function | Function, which calls on instructions building, if neon account didn't find. It uses in transfer to neon from solana. | false |
| onBeforeSignTransaction | function | Function, which calls before transaction will be sign by solana wallet. It uses in both transfers | false |
| onBeforeNeonSign | function | Function, which calls before metamask will approve transfer. It uses when you transfer from neon to solana. | false |
| onSuccessSign | function | Function, which calls after sign the transfer. When you use it on transfer to neon, function get one argument - solana transaction sign. On transfer to solana it provides two arguments. Solana and Neon signatures. | false |
| onErrorSign | function | Function, which calls, if wallet throw an error after try to sign | false |
