# Neon Token Transfer library for JavaScript clients

[![workflows](https://github.com/neonlabsorg/neon-client-transfer/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/neonlabsorg/neon-client-transfer/actions)
[![npm](https://img.shields.io/npm/v/@neonevm/token-transfer.svg)](https://www.npmjs.com/package/@neonevm/token-transfer)

---

## TL;DR

- This package is built on the [NeonPass](https://neonpass.live/) codebase.
- A [React demo](https://codesandbox.io/p/devbox/gnytck) is available ([see below](#react-demo)).

---

## Installation and setup

1. Install the Core Package:

```sh
yarn add @neonevm/token-transfer-core
# or
npm install @neonevm/token-transfer-core
```

2. To use with `ethers.js` we also recommend installing: `@neonevm/token-transfer-ethers`

```sh
yarn add @neonevm/token-transfer-ethers
# or
npm install @neonevm/token-transfer-ethers
```

## Quick Navigation

**Native Token Transactions**
  - [Solana → Neon EVM (NEON)](#transfer-solana-neon-transactions)
  - [Neon EVM → Solana (NEON)](#transfer-neon-solana-transactions)
  - [Solana → Neon EVM (SOL)](#transfer-sol-to-neon-evm)

**ERC20 Token Transactions**
  - [Solana → Neon EVM (ERC20)](#transfer-erc20-solana-neon-transactions)
  - [Neon EVM → Solana (ERC20)](#transfer-erc20-neon-solana-transactions)

---


### Native token transfers

Once installed, you must provide certain required properties when initializing a new instance. In a frontend application, grant both Solana and Neon EVM wallets the ability to sign and send transactions on their respective networks:

```javascript
const solanaWallet = `<Your Solana wallet public key>`;
const neonWallet = `<Your Neon wallet public address>`;
```

The `evmParams()` method retreives required addresses and constants.

For transactions with  multi-token gas fees `nativeTokenList()` method provides the native token for each NeonEVM chain:

```javascript
import { NeonProxyRpcApi } from '@neonevm/token-transfer-core';
import { PublicKey } from '@solana/web3.js';

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

For testing, you can use the `NEON_TRANSFER_CONTRACT_DEVNET` or `NEON_TRANSFER_CONTRACT_MAINNET` constants.
These constants represent the deployed Neon Transfer Contracts on their respective networks:

- `NEON_TRANSFER_CONTRACT_DEVNET`: Deployed on Neon Devnet (testing only).

- `NEON_TRANSFER_CONTRACT_MAINNET`: Deployed on Neon Mainnet (production use).


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

#### Transferring NEON
<a id='transfer-solana-neon-transactions'></a>
To transfer **NEON** from **Solana** to **Neon EVM**, use the functions in `neon-transfer.ts`. For example:

```javascript
import { 
  NEON_TOKEN_MINT_DECIMALS,
  solanaNEONTransferTransaction,
  solanaSOLTransferTransaction,
  SPLToken 
} from '@neonevm/token-transfer-core';

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
To transfer **NEON** from **Neon EVM** back to **Solana**, you must specify the token contract address:

```javascript
import { SOL_TRANSFER_CONTRACT_DEVNET } from '@neonevm/token-transfer-core'
import { neonNeonTransactionEthers } from '@neonevm/token-transfer-ethers';

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

#### **Transferring SOL to Neon EVM**

This process will:
- **Wrap SOL into wSOL**
- **Transfer wSOL from Solana to Neon EVM**
- **Confirm the transaction before proceeding**

<a id='transfer-sol-to-neon-evm'></a>
To wrap **SOL** to **wSOL** and transfer **wSOL** from **Solana** to **Neon EVM**, use the following:

```javascript
import { NeonProxyRpcApi } from '@neonevm/token-transfer-core';
import { JsonRpcProvider, keccak256, Wallet } from 'ethers';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const proxyUrl = `https://devnet.neonevm.org`;
const amount = 1;
const id = faucet.tokens.find(i => i.symbol === 'wSOL');
const wSOL = faucet.tokens[id];

const proxyRpc = new NeonProxyRpcApi(proxyUrl);
const provider = new JsonRpcProvider(proxyUrl);
const signerPrivateKey = keccak256(Buffer.from(`${neonWallet.address.slice(2)}${solanaWallet.publicKey.toBase58()}`, 'utf-8'));

const associatedToken = getAssociatedTokenAddressSync(new PublicKey(wSOL.address_spl), solanaWallet.publicKey);

const walletSigner = new Wallet(
  keccak256(
    Buffer.from(`${neonWallet.address.slice(2)}${solanaWallet.publicKey.toBase58()}`, 'utf-8')
  ),
  new JsonRpcProvider(proxyUrl)
);

const transaction = await createWrapAndTransferSOLTransaction({
  connection,
  proxyApi: proxyRpc,
  neonEvmProgram,
  solanaWallet: solanaWallet.publicKey,
  neonWallet: neonWallet.address,
  walletSigner,
  splToken: wSOL,
  amount,
  chainId: neonChainId
});
transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
```

---

#### Transferring ERC20 Tokens

When working with Devnet, Testnet, or Mainnet, you may need different ERC20 tokens. We maintain a token list of all supported tokens on Neon EVM ([see our documentation for details](https://docs.neonfoundation.io/docs/tokens/token_list)).

<a id='transfer-erc20-solana-neon-transactions'></a>
To transfer **ERC20** tokens from **Solana** to **Neon EVM**, use the following pattern:

```javascript
import { JsonRpcProvider, keccak256, Wallet } from 'ethers';
import tokenList from 'token-list/tokenlist.json';
import { neonTransferMintTransactionEthers } from '@neonevm/token-transfer-ethers';

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
To transfer **ERC20** tokens from **Neon EVM** to **Solana**:

```javascript
import tokenList from 'token-list/tokenlist.json';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createAssociatedTokenAccountTransaction } from '@neonevm/token-transfer-core';
import { createMintNeonTransactionEthers } from '@neonevm/token-transfer-ethers';


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

### Using with React
<a id='react-demo'></a>
To integrate this library in a React application, see our React demo in `examples/react/neon-transfer-react` folder. A [live demo](https://codesandbox.io/p/devbox/gnytck) is also available.

### Testing

We provide additional end-to-end (e2e) examples in `src/__tests__/e2e` or both the Solana Devnet and Neon EVM. To run the e2e tests:

```sh
yarn test
# or
npm run test
```

### Building Docs

Use TypeDoc in “packages” mode to generate a single `docs` folder at the project root:

```sh
yarn build
# or
npm run build
```

Then run the docs generation script:

```sh
yarn docs
# or
npm run docs
```


