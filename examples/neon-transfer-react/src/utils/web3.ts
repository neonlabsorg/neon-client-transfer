import { Transaction as NeonTransaction, Web3 } from 'web3';
import { erc20Abi, NEON_TOKEN_MINT_DECIMALS, SPLToken } from '@neonevm/token-transfer-core';
import { ReturnFormat } from '@neonevm/token-transfer-web3';
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
import { ContractAbi, DEFAULT_RETURN_FORMAT } from 'web3-types';
import { Contract } from 'web3-eth-contract';
import { Web3Context } from 'web3-core';
import { getBalance } from 'web3-eth';
import { HttpProvider } from 'web3-providers-http';
import { Web3Account } from 'web3-eth-accounts';
import { Big } from 'big.js';

export function toSigner({ publicKey, secretKey }: Keypair): Signer {
  return { publicKey, secretKey };
}

export async function sendTransaction(connection: Connection, transaction: Transaction, signers: Signer[],
                                      confirm = false, options?: SendOptions): Promise<TransactionSignature> {
  transaction.sign(...signers);
  const signature = await connection.sendRawTransaction(transaction.serialize(), options);
  if (confirm) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
  }
  return signature;
}

export async function sendSignedTransaction(web3: Web3, transaction: NeonTransaction, account: Web3Account): Promise<string> {
  const signedTrx = await web3.eth.accounts.signTransaction(transaction, account.privateKey);
  return new Promise((resolve, reject) => {
    if (signedTrx?.rawTransaction) {
      const txResult = web3.eth.sendSignedTransaction(signedTrx.rawTransaction);
      txResult.on('transactionHash', (hash: string) => resolve(hash));
      txResult.on('error', (error: Error) => reject(error));
    } else {
      reject('Unknown transaction');
    }
  });
}

export async function neonBalance(proxyUrl: string, address: string): Promise<Big> {
  const balance = await getBalance(new Web3Context(proxyUrl), address, undefined, DEFAULT_RETURN_FORMAT as ReturnFormat);
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

export async function mintTokenBalance(proxyUrl: string, account: string, token: SPLToken, contractAbi: ContractAbi = erc20Abi as ContractAbi): Promise<Big> {
  const tokenInstance = new Contract(contractAbi, token.address, new Web3Context(proxyUrl));
  const balance: number = await tokenInstance.methods.balanceOf(account).call();
  return new Big(balance).div(Math.pow(10, token.decimals));
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

export function getWeb3Provider(proxyUrl: string): Web3<any> {
  return new Web3(new HttpProvider(proxyUrl));
}

export function solanaWalletSigner(web3: Web3, pk: string): Web3Account {
  return web3.eth.accounts.privateKeyToAccount(pk);
}
