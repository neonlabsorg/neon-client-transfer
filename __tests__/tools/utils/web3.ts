import {
  AccountInfo,
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
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token';
import {
  erc20Abi,
  NEON_TOKEN_MINT_DECIMALS,
  solanaTransactionLog,
  SPLToken
} from '@neonevm/token-transfer-core';
import { ReturnFormat } from '@neonevm/token-transfer-web3';
import { ContractAbi, DEFAULT_RETURN_FORMAT, Transaction as TransactionConfig } from 'web3-types';
import { Web3Account } from 'web3-eth-accounts';
import { Contract } from 'web3-eth-contract';
import { Web3Context } from 'web3-core';
import { Big } from 'big.js';
import { getBalance } from 'web3-eth';
import { Web3 } from 'web3';
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

export async function sendNeonTransaction(web3: Web3, transaction: TransactionConfig, account: Web3Account): Promise<string> {
  const signedTrx = await web3.eth.accounts.signTransaction(transaction, account.privateKey);
  return new Promise<string>((resolve, reject) => {
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
  const assocTokenAccountAddress = getAssociatedTokenAddressSync(mintAccount, walletPubkey);

  const response = await connection.getTokenAccountBalance(assocTokenAccountAddress);
  return response?.value;
}

export async function mintTokenBalance(proxyUrl: string, account: string, token: SPLToken, contractAbi: ContractAbi = erc20Abi as ContractAbi): Promise<number> {
  const tokenInstance = new Contract(contractAbi, token.address, new Web3Context(proxyUrl));
  //@ts-ignore
  const balance: bigint = await tokenInstance.methods.balanceOf(account).call();
  return Number(balance) / Math.pow(10, token.decimals);
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

export function neonSignature(comment: string, signature: string): void {
  console.log(`${comment}: ${signature}; url: https://devnet.neonscan.org/tx/${signature}`);
}

export async function createSplAccount(connection: Connection, signer: Signer, token: SPLToken): Promise<AccountInfo<Buffer>> {
  const solanaWallet = signer.publicKey;
  const tokenMint = new PublicKey(token.address_spl);
  const tokenAccount = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  let account = await connection.getAccountInfo(tokenAccount);
  if (!account) {
    const transaction = new Transaction();
    transaction.add(createAssociatedTokenAccountInstruction(solanaWallet, tokenAccount, solanaWallet, tokenMint));
    transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
    const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight: false });
    solanaSignature(`SPL Account created`, signature);
    await delay(2e3);
  }
  account = await connection.getAccountInfo(tokenAccount);
  return account!;
}

export function solanaWalletSigner(web3: Web3, pk: string): Web3Account {
  return web3.eth.accounts.privateKeyToAccount(pk);
}
