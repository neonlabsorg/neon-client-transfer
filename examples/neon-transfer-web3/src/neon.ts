import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { neonNeonTransactionWeb3 } from '@neonevm/token-transfer-web3';
import {
  NEON_TOKEN_MINT_DECIMALS,
  NEON_TRANSFER_CONTRACT_DEVNET,
  solanaNEONTransferTransaction,
  SPLToken
} from '@neonevm/token-transfer-core';
import { HttpProvider } from 'web3-providers-http';
import { Web3 } from 'web3';
import bs58 from 'bs58';
import { sendNeonTransaction, sendSolanaTransaction, toSigner } from './utils';

require('dotenv').config({ path: `./.env` });

const NEON_PRIVATE = process.env.NEON_PRIVATE;
const PHANTOM_PRIVATE = process.env.PHANTOM_PRIVATE;

const proxyUrl = `https://devnet.neonevm.org`;
const solanaUrl = `https://api.devnet.solana.com`;

const connection = new Connection(solanaUrl, 'confirmed');
const web3 = new Web3(new HttpProvider(proxyUrl));

const neonWallet = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE!);
const solanaWallet = Keypair.fromSecretKey(bs58.decode(PHANTOM_PRIVATE!));

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
  const transaction = await neonNeonTransactionWeb3({
    provider: proxyUrl,
    from: neonWallet.address,
    to: NEON_TRANSFER_CONTRACT_DEVNET,
    solanaWallet: solanaWallet.publicKey,
    amount
  });
  const hash = await sendNeonTransaction(web3, transaction, neonWallet);
  console.log(`transferNeonToSolana`, hash);
}

export async function transferNeonToNeon(amount: number): Promise<any> {
  const transaction = await solanaNEONTransferTransaction({
    solanaWallet: solanaWallet.publicKey,
    neonWallet: neonWallet.address,
    neonEvmProgram,
    neonTokenMint,
    token: neonToken,
    amount,
    chainId
  });
  transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  const signature = await sendSolanaTransaction(connection, transaction, [toSigner(solanaWallet)]);
  console.log(`transferNeonToNeon`, signature);
}
