# Neon Token Transfer library for JavaScript clients

[![workflows](https://github.com/neonlabsorg/neon-client-transfer/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/neonlabsorg/neon-client-transfer/actions)
[![npm](https://img.shields.io/npm/v/@neonevm/token-transfer.svg)](https://www.npmjs.com/package/@neonevm/token-transfer)

---

## TL;DR

This package uses our [NeonPass](https://neonpass.live/) codebase.

- [React demo](https://codesandbox.io/p/devbox/gnytck) available.

---

## Installation and setup

Firstly, install the package:

```sh
yarn add @neonevm/token-transfer-core
# or
npm install @neonevm/token-transfer-core
```

For using with `ethers.js` we recommend additional using `@neonevm/token-transfer-ethers`

```sh
yarn add @neonevm/token-transfer-ethers
# or
npm install @neonevm/token-transfer-ethers
```

## **📌 Quick Navigation**

- **🔹 Native Token Transactions**
  - [Solana → Neon EVM (NEON)](#transfer-solana-neon-transactions)
  - [Neon EVM → Solana (NEON)](#transfer-neon-solana-transactions)
  - [Solana → Neon EVM (SOL)](#transfer-sol-to-neon-evm)
- **🔹 ERC20 Token Transactions**
  - [Solana → Neon EVM (ERC20)](#transfer-erc20-solana-neon-transactions)
  - [Neon EVM → Solana (ERC20)](#transfer-erc20-neon-solana-transactions)

---


### For native token transfer

Upon installation, it is essential to provide certain mandatory properties when initializing a new instance to ensure proper functionality. When integrating this into your frontend application, it's necessary to grant Solana/Neon wallets access for signing and sending transactions across Solana and Neon EVM networks.

```javascript
const solanaWallet = `<Your Solana wallet public key>`;
const neonWallet = `<Your Neon wallet public address>`;
```

We employ the `evmParams` method from Neon EVM to obtain specific addresses and constants required for seamless operations.

Additional for Multi-token gas fee, we added new method (`nativeTokenList`) for getting native token for special NeonEvm chain.

```javascript
const neonNeonEvmUrl = `https://devnet.neonevm.org`;
const solNeonEvmUrl = `https://devnet.neonevm.org/solana/sol`;
const solanaUrl = `https://api.devnet.solana.com`;
const neonProxyApi = new NeonProxyRpcApi(neonNeonEvmUrl);
const solProxyApi = new NeonProxyRpcApi(solNeonEvmUrl);
// nativeTokenList returns the native token list for every chain network, first will be NEON, second SOL
const [neonNativeToken, solNativeToken] = await neonProxyApi.nativeTokenList(); // get native tokens for chain networks
const neonProxyStatus = await neonProxyApi.evmParams(); // get evm params config
const solProxyStatus = await solProxyApi.evmParams();

// for NEON token native network
const neonChainId = Number(neonNativeToken.tokenChainId);
const neonTokenMint = new PublicKey(neonNativeToken.tokenMint);
const neonEvmProgram = new PublicKey(neonProxyStatus.neonEvmProgramId);

// for SOL token native network
const solChainId = Number(solNativeToken.tokenChainId);
const solTokenMint = new PublicKey(solNativeToken.tokenMint);
const solEvmProgram = new PublicKey(solProxyStatus.neonEvmProgramId);
```

Still, for testing, you can use the `NEON_TRANSFER_CONTRACT_DEVNET` or `NEON_TRANSFER_CONTRACT_MAINNET` constants.

These constants represent the Neon Transfer Contracts deployed on their respective networks.

- `NEON_TRANSFER_CONTRACT_DEVNET` is the smart contract deployed on the Neon Devnet. It should be used exclusively for testing and development purposes, allowing you to simulate token transfers without involving real assets.

- `NEON_TRANSFER_CONTRACT_MAINNET` is the smart contract deployed on the Neon Mainnet. This contract is used for real token transfers and should only be used in production environments where transactions have actual economic value.

These objects also contain snapshots of the latest `neonProxyStatus` state, providing up-to-date network status and configuration details for transactions.

You can import the Neon and Solana transfer contract constants from the @neonevm/token-transfer-core package. These constants provide the contract addresses for both devnet (for testing) and mainnet (for real transactions).

```sh
yarn add @neonevm/token-transfer-core
# or
npm install @neonevm/token-transfer-core
```
```javascript
import {
NEON_TRANSFER_CONTRACT_DEVNET,
SOL_TRANSFER_CONTRACT_DEVNET,
NEON_TRANSFER_CONTRACT_MAINNET
} from '@neonevm/token-transfer-core';
```

#### Transfer NEON transactions
<a id='transfer-solana-neon-transactions'></a>
To generate a transaction for transferring **NEON** from **Solana** to **Neon EVM**, utilize the functions found in the `neon-transfer.ts` file.

```javascript
const neonToken: SPLToken = {
  address: '',
  decimals: NEON_TOKEN_MINT_DECIMALS,
  name: 'Neon',
  symbol: 'NEON',
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/main/neon_token_md.png',
  address_spl: neonTokenMint.toBase58(),
  chainId: neonChainId
};
const solToken: SPLToken = {
  name: 'Solana SOL',
  symbol: 'SOL',
  logoURI:
    'https://raw.githubusercontent.com/neonlabsorg/token-list/master/assets/solana-sol-logo.svg',
  address: '1111111111',
  address_spl: solTokenMint.toBase58(),
  chainId: solChainId
};

// for transfer NEON: Solana -> NeonEvm (NEON chain)
const transaction = await solanaNEONTransferTransaction({
  solanaWallet,
  neonWallet,
  neonEvmProgram,
  neonTokenMint,
  token: neonToken,
  amount,
  chainId: neonChainId
}); // Solana Transaction object
transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash; // Network blockhash
const signature = await connection.sendRawTransaction(transaction.serialize()); // method for sign and send transaction to network

// for transfer SOL: Solana -> NeonEvm (SOL chain)
const transaction = await solanaSOLTransferTransaction({
  connection,
  solanaWallet,
  neonWallet,
  neonEvmProgram: solEvmProgram,
  neonTokenMint: solTokenMint,
  splToken: solToken,
  amount,
  chainId: solChainId
}); // Solana Transaction object
transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash; // Network blockhash
const signature = await connection.sendRawTransaction(transaction.serialize()); // method for sign and send transaction to network
```

<a id='transfer-neon-solana-transactions'></a>
And for transfer **NEON** from **Neon EVM** to **Solana**, you should know token contract address, you can find it in [this file](https://github.com/neonlabsorg/neon-client-transfer/blob/master/src/data/constants.ts).

```javascript
const tokenContract = NEON_TRANSFER_CONTRACT_DEVNET; // or SOL_TRANSFER_CONTRACT_DEVNET
const transaction = await neonNeonTransactionEthers({
  provider,
  from: neonWallet.address,
  to: tokenContract,
  solanaWallet,
  amount
}); // Neon EVM Transaction object
const signedTrx = await neonWallet.signTransaction(transaction);
if (signedTrx?.rawTransaction) {
  const txResult = neonWallet.sendSignedTransaction(signedTrx.rawTransaction);
  txResult.on('transactionHash', (hash: string) => console.log(hash));
  txResult.on('error', (error: Error) => console.error(error));
}
```

#### **Transfer SOL to Neon EVM**

This process:
- **Wraps SOL into wSOL**
- **Transfers wSOL from Solana to Neon EVM**
- **Ensures that the transaction is confirmed before proceeding**

To wrap **SOL** to **wSOL** and transfer **wSOL** from **Solana** to **Neon EVM**, use the following:

```javascript
const amount = 1;
const id = faucet.tokens.find(i => i.symbol === 'wSOL');
const wSOL = faucet.tokens[id];

const proxyRpc = new NeonProxyRpcApi(proxyUrl);
const provider = new JsonRpcProvider(proxyUrl);
const signerPrivateKey = keccak256(Buffer.from(`${neonWallet.address.slice(2)}${solanaWallet.publicKey.toBase58()}`, 'utf-8'));

const associatedToken = getAssociatedTokenAddressSync(new PublicKey(wSOL.address_spl), solanaWallet.publicKey);

const solanaWalletSigner = walletSigner(provider, signerPrivateKey);
const transaction = await createWrapAndTransferSOLTransaction({
  connection,
  proxyApi: proxyRpc,
  neonEvmProgram,
  solanaWallet: solanaWallet.publicKey,
  neonWallet: neonWallet.address,
  walletSigner: solanaWalletSigner,
  splToken: wSOL,
  amount,
  chainId: neonChainId
});
transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
```

---

#### Transfer ERC20 transactions

When working with Devnet, Testnet, or Mainnet, different ERC20 tokens are utilized. We have compiled a [token-list](https://github.com/neonlabsorg/token-list) containing the tokens supported and available on Neon EVM. For further information, please refer to our [documentation](https://docs.neonfoundation.io/docs/tokens/token_list).
<a id='transfer-erc20-solana-neon-transactions'></a>
For transfer **ERC20** tokens from **Solana** to **Neon EVM**, using this patterns:

```javascript
import tokenList from 'token-list/tokenlist.json';

const proxyUrl = `https://devnet.neonevm.org`;
const tokens = tokenList.tokens.filter((token) => token.chainId === CHAIN_ID);
const token = tokens[0];
//The wallet signer from ethers.js, used for signing the transaction.
const walletSigner = new Wallet(
  keccak256(
    Buffer.from(`${neonWallet.address.slice(2)}${solanaWallet.publicKey.toBase58()}`, 'utf-8')
  ),
  new JsonRpcProvider(proxyUrl)
);

const transaction = await neonTransferMintTransactionEthers({
  connection,
  proxyApi,
  neonEvmProgram /* or solEvmProgram*/,
  solanaWallet,
  neonWallet: neonWallet.address,
  walletSigner,
  splToken: token,
  amount,
  chainId: neonChainId /*or solChainId*/
});
transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
const signature = await connection.sendRawTransaction(transaction.serialize());
```

<a id='transfer-erc20-neon-solana-transactions'></a>
And for transfer **ERC20** tokens from **Neon EVM** to **Solana**:

```javascript
import tokenList from 'token-list/tokenlist.json';

const tokens = tokenList.tokens.filter((token) => token.chainId === CHAIN_ID);
const mintPubkey = new PublicKey(token.address_spl);
const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet);
const solanaTransaction = createAssociatedTokenAccountTransaction({
  solanaWallet,
  tokenMint: mintPubkey,
  associatedToken,
  neonHeapFrame: proxyStatus.NEON_HEAP_FRAME
});
solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
const neonTransaction = await createMintNeonTransactionEthers({
  provider,
  neonWallet: neonWallet.address,
  associatedToken,
  splToken: token,
  amount
});
const solanaSignature = await connection.sendRawTransaction(transaction.serialize());
const neonSignature = await neonWallet.signTransaction(transaction);
const txResult = neonWallet.sendSignedTransaction(neonSignature.rawTransaction);
```

Within the Neon Transfer codebase, we employ the [web3.js](https://web3js.readthedocs.io/en/v1.10.0/) library to streamline our code. However, if the situation demands, you can opt for alternatives such as [ethers.js](https://docs.ethers.org/v6/) or [WalletConnect](https://walletconnect.com/).

### For React

To incorporate it into your React App, please refer to our React Demo located in the `examples/react/neon-transfer-react` folder. Or see [live demo](https://codesandbox.io/s/neon-transfer-demo-z93nlj).

### For Testing

We have provided extra examples within the `src/__tests__/e2e` folder, intended for testing and debugging this library on both the Devnet Solana network and Neon EVM.

Run this command for `e2e` testing Neon Transfer code.

```sh
yarn test
# or
npm run test
```

### Building Docs

We can run TypeDoc with packages mode to generate a single docs folder in the root of the project.

```sh
# We need to build before building the docs so that `foo` can reference types from `bar`
# TypeDoc can't use TypeScript's build mode to do this for us because build mode may skip
# a project that needs documenting, or include packages that shouldn't be included in the docs
yarn build
# or
npm run build
```

Now you can run docs generation script.

```sh
yarn docs
# or
npm run docs
```


