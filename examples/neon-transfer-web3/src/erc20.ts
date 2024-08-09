import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  createAssociatedTokenAccountTransaction,
  NeonProxyRpcApi,
  SPLToken
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionWeb3,
  neonTransferMintTransactionWeb3
} from '@neonevm/token-transfer-web3';
import { decode } from 'bs58';
import { HttpProvider } from 'web3-providers-http';
import { Web3 } from 'web3';
import { keccak256 } from 'web3-utils';
import { sendNeonTransaction, sendSolanaTransaction, toSigner } from './utils';

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
const chainId = parseInt(`0xe9ac0ce`);

const neonProxyRpcApi = new NeonProxyRpcApi(proxyUrl);

export async function transferSPLTokenToNeonEvm(token: SPLToken, amount: number): Promise<any> {
  const signer = web3.eth.accounts.privateKeyToAccount(keccak256(solanaWallet.publicKey.toBase58() + neonWallet.address));
  const transaction = await neonTransferMintTransactionWeb3(connection, proxyUrl, neonProxyRpcApi, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, signer, token, amount, chainId);
  const signature = await sendSolanaTransaction(connection, transaction, [toSigner(solanaWallet)]);
  console.log(`transferSPLTokenToNeonEvm`, signature);
}

export async function transferERC20TokenToSolana(token: SPLToken, amount: number): Promise<any> {
  const mint = new PublicKey(token.address_spl);
  const associatedToken = getAssociatedTokenAddressSync(mint, solanaWallet.publicKey);
  try {
    await getAccount(connection, associatedToken);
  } catch (e) {
    const solanaTransaction = createAssociatedTokenAccountTransaction(solanaWallet.publicKey, mint, associatedToken);
    const signature = await sendSolanaTransaction(connection, solanaTransaction, [toSigner(solanaWallet)]);
    console.log(`Create Associated token account`, signature);
  }
  const transaction = await createMintNeonTransactionWeb3(proxyUrl, neonWallet.address, associatedToken, token, amount);
  const hash = await sendNeonTransaction(web3, transaction, neonWallet);
  console.log(`transferERC20TokenToSolana`, hash);
}
