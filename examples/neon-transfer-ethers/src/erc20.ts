import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  createAssociatedTokenAccountTransaction,
  NeonProxyRpcApi,
  SPLToken
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionEthers,
  neonTransferMintTransactionEthers
} from '@neonevm/token-transfer-ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { decode } from 'bs58';
import { sendNeonTransactionEthers, sendSolanaTransaction, toSigner } from './utils';

require('dotenv').config({ path: `./.env` });

const NEON_PRIVATE = process.env.NEON_PRIVATE;
const PHANTOM_PRIVATE = process.env.PHANTOM_PRIVATE;

const proxyUrl = `https://devnet.neonevm.org`;
const solanaUrl = `https://api.devnet.solana.com`;

const connection = new Connection(solanaUrl, 'confirmed');
const provider = new JsonRpcProvider(proxyUrl);

const neonWallet = new Wallet(NEON_PRIVATE!, provider);
const solanaWallet = Keypair.fromSecretKey(decode(PHANTOM_PRIVATE!));

const neonEvmProgram = new PublicKey(`eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU`);
const chainId = parseInt(`0xe9ac0ce`);

const neonProxyRpcApi = new NeonProxyRpcApi(proxyUrl);

export async function transferSPLTokenToNeonEvm(token: SPLToken, amount: number): Promise<any> {
  const transaction = await neonTransferMintTransactionEthers(connection, neonProxyRpcApi, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, neonWallet, token, amount, chainId);
  const signature = await sendSolanaTransaction(connection, transaction, [toSigner(solanaWallet)]);
  console.log(signature);
}

export async function transferERC20TokenToSolana(token: SPLToken, amount: number): Promise<any> {
  const mint = new PublicKey(token.address_spl);
  const associatedToken = getAssociatedTokenAddressSync(mint, solanaWallet.publicKey);
  try {
    await getAccount(connection, associatedToken);
  } catch (e) {
    const solanaTransaction = createAssociatedTokenAccountTransaction(solanaWallet.publicKey, mint, associatedToken);
    const signature = sendSolanaTransaction(connection, solanaTransaction, [toSigner(solanaWallet)]);
    console.log(signature);
  }
  const transaction = await createMintNeonTransactionEthers(provider, neonWallet.address, associatedToken, token, amount);
  const hash = await sendNeonTransactionEthers(transaction, neonWallet);
  console.log(hash);
}
