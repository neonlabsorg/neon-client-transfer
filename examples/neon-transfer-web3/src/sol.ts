import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { neonNeonTransactionWeb3 } from '@neonevm/token-transfer-web3';
import {
  SOL_TRANSFER_CONTRACT_DEVNET,
  solanaSOLTransferTransaction,
  SPLToken
} from '@neonevm/token-transfer-core';
import { HttpProvider } from 'web3-providers-http';
import { Web3 } from 'web3';
import bs58 from 'bs58';
import { sendNeonTransaction, sendSolanaTransaction, toSigner } from './utils';

require('dotenv').config({ path: `./.env` });

const NEON_PRIVATE = process.env.NEON_PRIVATE;
const PHANTOM_PRIVATE = process.env.PHANTOM_PRIVATE;

const proxyUrl = `https://devnet.neonevm.org/solana/sol`;
const solanaUrl = `https://api.devnet.solana.com`;

const connection = new Connection(solanaUrl, 'confirmed');
const web3 = new Web3(new HttpProvider(proxyUrl));

const neonWallet = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE!);
const solanaWallet = Keypair.fromSecretKey(bs58.decode(PHANTOM_PRIVATE!));

const neonEvmProgram = new PublicKey(`eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU`);
const solTokenMint = new PublicKey(`So11111111111111111111111111111111111111112`);
const chainId = parseInt(`0xe9ac0cf`);

const solToken: SPLToken = {
  chainId,
  address_spl: 'So11111111111111111111111111111111111111112',
  address: '0xc7Fc9b46e479c5Cb42f6C458D1881e55E6B7986c',
  decimals: 9,
  name: 'Wrapped SOL',
  symbol: 'wSOL',
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/master/assets/solana-wsol-logo.svg'
};

export async function transferSolToSolana(amount: number): Promise<any> {
  const transaction = await neonNeonTransactionWeb3({
    provider: proxyUrl,
    from: neonWallet.address,
    to: SOL_TRANSFER_CONTRACT_DEVNET,
    solanaWallet: solanaWallet.publicKey,
    amount
  });
  const hash = await sendNeonTransaction(web3, transaction, neonWallet);
  console.log(`transferSolToSolana`, hash);
}

export async function transferSolToNeon(amount: number): Promise<any> {
  const transaction = await solanaSOLTransferTransaction({
    connection,
    solanaWallet: solanaWallet.publicKey,
    neonWallet: neonWallet.address,
    neonEvmProgram,
    neonTokenMint: solTokenMint,
    splToken: solToken,
    amount,
    chainId
  });
  transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  const signature = await sendSolanaTransaction(connection, transaction, [toSigner(solanaWallet)]);
  console.log(`transferSolToNeon`, signature);
}
