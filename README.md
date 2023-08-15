# Neon Transfer Module for JavaScript client

[![workflows](https://github.com/neonlabsorg/neon-client-transfer/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/neonlabsorg/neon-client-transfer/actions)
[![npm](https://img.shields.io/npm/v/neon-portal.svg)](https://www.npmjs.com/package/neon-portal)

---

**NOTE**

The package using on our [NeonPass](https://neonpass.live/) codebase.

---

## Installation and setup

Firstly, install the package:

```sh
yarn add neon-portal
# or
npm install neon-portal
```

### For native

Upon installation, it is essential to provide certain mandatory properties when initializing a new instance to ensure proper functionality. When integrating this into your frontend application, it's necessary to grant Solana/Neon wallets access for signing and sending transactions across Solana and Neon EVM networks.


```javascript
const solanaWallet = `<Your Solana wallet public key>`;
const neonWallet = `<Your Neon wallet public address>`;
```

We employ the `evmParams` method from Neon EVM to obtain specific addresses and constants required for seamless operations.

```javascript
const proxyApi = new NeonProxyRpcApi(urls);
// ...
const neonProxyStatus = await proxyApi.evmParams();
const neonEvmProgram = new PublicKey(neonProxyStatus.NEON_EVM_ID);
const neonTokenMint = new PublicKey(neonProxyStatus.NEON_TOKEN_MINT);
```

Still, for testing you can use `NEON_TRANSFER_CONTRACT_DEVNET` or `NEON_TRANSFER_CONTRACT_MAINNET` constants. This objects contains snapshots with latest `neonProxyStatus` state. 

#### Transfer NEON transactions

To generate a transaction for transferring NEON from Solana to Neon EVM, utilize the functions found in the `neon-transfer.ts` file.

```javascript
const neonToken: SPLToken = {
  ...NEON_TOKEN_MODEL,
  address_spl: proxyStatus.NEON_TOKEN_MINT,
  chainId: CHAIN_ID
};
const transaction = await solanaNEONTransferTransaction(solanaWallet, neonWallet, neonEvmProgram, neonTokenMint, neonToken, amount); // Solana Transaction object
transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash; // Network blockhash
const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight: false }); // method for sign and send transaction to network
```
And for transfer NEON from Neon EVM to Solana, you can using this pattern:

```javascript
const transaction = await neonNeonWeb3Transaction(web3, neonWallet, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet, amount); // Neon EVM Transaction object
const hash = await sendNeonTransaction(web3, transaction, neonWallet); // method for sign and send transaction to network
```

#### Transfer ERC20 transactions

When working with Devnet, Testnet, or Mainnet, different ERC20 tokens are utilized. We have compiled a [token-list](https://github.com/neonlabsorg/token-list) containing the tokens supported and available on Neon EVM. For further information, please refer to our [documentation](https://docs.neonfoundation.io/docs/tokens/token_list).

For transfer ERC20 tokens from Solana to Neon EVM, using this patterns:

```javascript
const token = tokenList[0];
const transaction = await neonTransferMintWeb3Transaction(connection, web3, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, token, amount);
transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight: false });
```

And for transfer ERC20 tokens from Neon EVM to Solana: 

```javascript
const token = tokenList[0];
const mintPubkey = new PublicKey(token.address_spl);
const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet);
const solanaTransaction = createMintSolanaTransaction(solanaWallet, mintPubkey, associatedToken, proxyStatus);
solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
const neonTransaction = await createMintNeonWeb3Transaction(web3, neonWallet.address, associatedToken, token, amount);
const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight: false });
const signedNeonTransaction = await sendNeonTransaction(web3, neonTransaction, neonWallet);
```

Within the Neon Transfer codebase, we employ the `web3.js` library to streamline our code. However, if the situation demands, you can opt for alternatives such as `ethereum.js` or `WalletConnect`.

### For React

To incorporate it into your React App, please refer to our React Demo located in the `examples/react/neon-transfer-react` folder. 

### For Testing

We have provided extra examples within the `src/__tests__/e2e` folder, intended for testing and debugging this library on both the Devnet Solana network and Neon EVM.

Run this command for `e2e` testing Neon Transfer code.

```sh
yarn test
# or
npm run test
```
