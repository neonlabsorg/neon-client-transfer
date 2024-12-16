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
import { JsonRpcProvider, keccak256, Wallet } from 'ethers';
import bs58 from 'bs58';
import { sendNeonTransactionEthers, sendSolanaTransaction, toSigner } from './utils';

require('dotenv').config({ path: `./.env` });

const NEON_PRIVATE = process.env.NEON_PRIVATE;
const PHANTOM_PRIVATE = process.env.PHANTOM_PRIVATE;

const proxyUrl = `https://devnet.neonevm.org`;
const solanaUrl = `https://api.devnet.solana.com`;

const connection = new Connection(solanaUrl, 'confirmed');
const provider: any = new JsonRpcProvider(proxyUrl);

const neonWallet: any = new Wallet(NEON_PRIVATE!, provider);
const solanaWallet = Keypair.fromSecretKey(bs58.decode(PHANTOM_PRIVATE!));

const neonEvmProgram = new PublicKey(`eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU`);
const chainId = parseInt(`0xe9ac0ce`);

const neonProxyRpcApi = new NeonProxyRpcApi(proxyUrl);

export async function transferSPLTokenToNeonEvm(token: SPLToken, amount: number): Promise<any> {
  const walletSigner = new Wallet(keccak256(Buffer.from(`${neonWallet.address.slice(2)}${solanaWallet.publicKey.toBase58()}`, 'utf-8')), provider);
  const transaction = await neonTransferMintTransactionEthers({
    connection,
    proxyApi: neonProxyRpcApi,
    neonEvmProgram,
    solanaWallet: solanaWallet.publicKey,
    neonWallet: neonWallet.address,
    walletSigner,
    splToken: token,
    amount,
    chainId
  });
  const signature = await sendSolanaTransaction(connection, transaction, [toSigner(solanaWallet)]);
  console.log(signature);
}

export async function transferERC20TokenToSolana(token: SPLToken, amount: number): Promise<any> {
  const mint = new PublicKey(token.address_spl);
  const associatedToken = getAssociatedTokenAddressSync(mint, solanaWallet.publicKey);
  try {
    await getAccount(connection, associatedToken);
  } catch (e) {
    const solanaTransaction = createAssociatedTokenAccountTransaction({
      solanaWallet: solanaWallet.publicKey,
      tokenMint: mint,
      associatedToken
    });
    const signature = sendSolanaTransaction(connection, solanaTransaction, [toSigner(solanaWallet)]);
    console.log(signature);
  }
  const transaction = await createMintNeonTransactionEthers({
    provider,
    neonWallet: neonWallet.address,
    associatedToken,
    splToken: token,
    amount
  });
  const hash = await sendNeonTransactionEthers(transaction, neonWallet);
  console.log(hash);
}
