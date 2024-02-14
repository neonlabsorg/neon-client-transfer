import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMintNeonTransactionWeb3,
  neonTransferMintTransactionWeb3
} from '@neonevm/token-transfer-web3';
import {
  createAssociatedTokenAccountTransaction,
  NeonProxyRpcApi, solanaTransactionLog,
  SPLToken
} from '@neonevm/token-transfer-core';
import { HttpProvider } from 'web3-providers-http';
import { decode } from 'bs58';
import { Web3 } from 'web3';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { keccak256 } from 'web3-utils';
import { toSigner } from './utils';

require('dotenv').config({ path: `./.env` });

const NEON_PRIVATE = process.env.NEON_PRIVATE;
const PHANTOM_PRIVATE = process.env.PHANTOM_PRIVATE;

const proxyUrl = `https://devnet.neonevm.org`;
const solanaUrl = `https://api.devnet.solana.com`;

const connection = new Connection(solanaUrl, 'confirmed');
const web3 = new Web3(new HttpProvider(proxyUrl));

const neonWallet = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE!);
const solanaWallet = Keypair.fromSecretKey(decode(PHANTOM_PRIVATE!));

const neonEvmProgram = new PublicKey(`eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU`);
const neonTokenMint = new PublicKey(`89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g`);
const chainId = parseInt(`0xe9ac0ce`);

const neonProxyRpcApi = new NeonProxyRpcApi(proxyUrl);

export async function transferSPLTokenToNeonEvm(token: SPLToken, amount: number): Promise<any> {
  const signer = web3.eth.accounts.privateKeyToAccount(keccak256(solanaWallet.publicKey.toBase58() + neonWallet.address));
  const transaction = await neonTransferMintTransactionWeb3(connection, proxyUrl, neonProxyRpcApi, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, signer, token, amount, chainId);
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.sign(toSigner(solanaWallet));
  solanaTransactionLog(transaction);
  const signature = await connection.sendRawTransaction(transaction.serialize());
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
  console.log(signature);
}

export async function transferERC20TokenToSolana(token: SPLToken, amount: number): Promise<any> {
  const mint = new PublicKey(token.address_spl);
  const associatedToken = getAssociatedTokenAddressSync(mint, solanaWallet.publicKey);
  try {
    await getAccount(connection, associatedToken);
  } catch (e) {
    const solanaTransaction = createAssociatedTokenAccountTransaction(solanaWallet.publicKey, mint, associatedToken);
    solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    solanaTransaction.sign(toSigner(solanaWallet));
    solanaTransactionLog(solanaTransaction);
    const signature = await connection.sendRawTransaction(solanaTransaction.serialize());
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
    console.log(signature);
  }
  const transaction = await createMintNeonTransactionWeb3(proxyUrl, neonWallet.address, associatedToken, token, amount);
  const signedTrx = await web3.eth.accounts.signTransaction(transaction, neonWallet.privateKey);
  if (signedTrx?.rawTransaction) {
    const txResult = web3.eth.sendSignedTransaction(signedTrx.rawTransaction);
    txResult.on('transactionHash', (hash: string) => console.log(hash));
    txResult.on('error', (error: Error) => console.error(error));
  }
}
