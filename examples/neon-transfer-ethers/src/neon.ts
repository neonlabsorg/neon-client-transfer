import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { JsonRpcProvider, Wallet } from 'ethers';
import {
  NEON_TOKEN_MINT_DECIMALS,
  NEON_TRANSFER_CONTRACT_DEVNET,
  solanaNEONTransferTransaction,
  SPLToken
} from '@neonevm/token-transfer-core';
import { neonNeonTransactionEthers } from '@neonevm/token-transfer-ethers';
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
const neonTokenMint = new PublicKey(`89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g`);
const chainId = parseInt(`0xe9ac0ce`);

const neonToken: SPLToken = {
  chainId,
  address_spl: '89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g',
  address: '',
  decimals: NEON_TOKEN_MINT_DECIMALS,
  name: 'Neon',
  symbol: 'NEON',
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/main/neon_token_md.png'
};

export async function transferNeonToSolana(amount: number): Promise<any> {
  const transaction = await neonNeonTransactionEthers(provider, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
  const hash = await sendNeonTransactionEthers(transaction, neonWallet);
  console.log(hash);
}

export async function transferNeonToNeon(amount: number): Promise<any> {
  const transaction = await solanaNEONTransferTransaction(solanaWallet.publicKey, neonWallet.address, neonEvmProgram, neonTokenMint, neonToken, amount, chainId);
  transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  const signature = await sendSolanaTransaction(connection, transaction, [toSigner(solanaWallet)]);
  console.log(signature);
}
