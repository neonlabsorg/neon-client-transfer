import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token';
import {
  AccountInfo,
  Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SendOptions,
  Signer,
  TokenAmount,
  Transaction,
  TransactionSignature
} from '@solana/web3.js';
import { solanaTransactionLog, SPLToken } from '@neonevm/token-transfer-core';
import { Big } from 'big.js';
import { delay } from './delay';

export function toSigner({ publicKey, secretKey }: Keypair): Signer {
  return { publicKey, secretKey };
}

export async function sendSolanaTransaction(connection: Connection, transaction: Transaction, signers: Signer[],
                                            confirm = false, options?: SendOptions): Promise<TransactionSignature> {
  transaction.sign(...signers);
  solanaTransactionLog(transaction);
  const signature = await connection.sendRawTransaction(transaction.serialize(), options);
  if (confirm) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
  }
  return signature;
}

export async function solanaBalance(connection: Connection, address: PublicKey): Promise<Big> {
  const balance = await connection.getBalance(address);
  return new Big(balance).div(LAMPORTS_PER_SOL);
}

export async function splTokenBalance(connection: Connection, walletPubkey: PublicKey, token: SPLToken): Promise<TokenAmount | null> {
  const mintAccount = new PublicKey(token.address_spl);
  const assocTokenAccountAddress = getAssociatedTokenAddressSync(mintAccount, walletPubkey);
  const account = await connection?.getAccountInfo(assocTokenAccountAddress);
  if (!account) {
    return null;
  }
  const response = await connection?.getTokenAccountBalance(assocTokenAccountAddress);
  return response?.value;
}

export async function createAssociatedTokenAccount(connection: Connection, signer: Signer, token: SPLToken): Promise<AccountInfo<Buffer>> {
  const solanaWallet = signer.publicKey;
  const tokenMint = new PublicKey(token.address_spl);
  const tokenAccount = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  let account = await connection.getAccountInfo(tokenAccount);
  if (!account) {
    const transaction = new Transaction();
    transaction.add(createAssociatedTokenAccountInstruction(solanaWallet, tokenAccount, solanaWallet, tokenMint));
    transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight: false });
    solanaSignature(`Token Account created`, signature);
    await delay(2e3);
    account = await connection.getAccountInfo(tokenAccount);
  }
  return account!;
}

export function solanaSignature(comment: string, signature: string, url: string = `https://api.devnet.solana.com`): void {
  let params: { [key: string]: string } = { cluster: 'custom', customUrl: url };
  switch (url) {
    case 'https://api.devnet.solana.com':
      params = { cluster: 'devnet' };
      break;
    case 'https://api.mainnet-beta.solana.com':
      params = { cluster: 'mainnet-beta' };
      break;
    case 'https://api.testnet.solana.com':
      params = { cluster: 'testnet' };
      break;
  }
  const urlParams = new URLSearchParams(params);
  console.log(`${comment}: ${signature}; url: https://explorer.solana.com/tx/${signature}?${urlParams.toString()}`);
}

export async function solanaAirdrop(connection: Connection, publicKey: PublicKey, lamports: number, commitment: Commitment = 'finalized'): Promise<number> {
  let balance = await connection.getBalance(publicKey);
  if (balance < lamports) {
    const signature = await connection.requestAirdrop(publicKey, lamports);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitment);
  }
  return await connection.getBalance(publicKey);
}
