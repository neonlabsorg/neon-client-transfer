import { erc20Abi, NEON_TOKEN_MINT_DECIMALS, SPLToken } from '@neonevm/token-transfer-core';
import {
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
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { Contract, JsonRpcProvider, TransactionRequest, Wallet } from 'ethers';
import { Big } from 'big.js';

export function toSigner({ publicKey, secretKey }: Keypair): Signer {
  return { publicKey, secretKey };
}

export async function sendTransaction(connection: Connection, transaction: Transaction, signers: Signer[],
                                      confirm = false, options?: SendOptions): Promise<TransactionSignature> {
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.sign(...signers);
  const signature = await connection.sendRawTransaction(transaction.serialize(), options);
  if (confirm) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
  }
  return signature;
}

export async function sendNeonTransaction(transaction: TransactionRequest, signer: Wallet): Promise<string> {
  const receipt = await signer.sendTransaction(transaction);
  return receipt.hash;
}

export async function neonBalanceEthers(provider: JsonRpcProvider, address: Wallet): Promise<Big> {
  const balance = await provider.getBalance(address);
  return new Big(balance.toString()).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
}

export async function solanaBalance(connection: Connection, address: PublicKey): Promise<Big> {
  const balance = await connection.getBalance(address);
  return new Big(balance).div(LAMPORTS_PER_SOL);
}

export async function splTokenBalance(connection: Connection, walletPubkey: PublicKey, token: SPLToken): Promise<TokenAmount> {
  const mintAccount = new PublicKey(token.address_spl);
  const assocTokenAccountAddress = await getAssociatedTokenAddress(mintAccount, walletPubkey);
  const response = await connection.getTokenAccountBalance(assocTokenAccountAddress);
  return response?.value;
}

export async function mintTokenBalanceEthers(wallet: Wallet, token: SPLToken, contractAbi: any = erc20Abi, method = 'balanceOf'): Promise<Big> {
  const tokenInstance = new Contract(token.address, contractAbi, wallet);
  if (tokenInstance[method]) {
    const balanceOf = tokenInstance[method];
    const balance: bigint = await balanceOf(wallet.address);
    return new Big(balance.toString()).div(Math.pow(10, token.decimals));
  }
  return Big(0);
}

export function solanaSignature(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function neonSignature(signature: string): string {
  return `https://devnet.neonscan.org/tx/${signature}`;
}

export function stringShort(data: string, len = 30): string {
  const half = Math.round(len / 2);
  return `${data.slice(0, half)}..${data.slice(-half)}`;
}
