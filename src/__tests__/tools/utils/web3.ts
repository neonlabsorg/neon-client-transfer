import {
  Connection,
  Keypair,
  PublicKey,
  SendOptions,
  Signer,
  TokenAmount,
  Transaction,
  TransactionSignature
} from '@solana/web3.js';
import Web3 from 'web3';
import { Account, TransactionConfig } from 'web3-core';
import Big from 'big.js';
import { erc20Abi, NEON_TOKEN_MINT_DECIMALS } from '../../../data';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { SPLToken } from '../../../models';
import { AbiItem } from 'web3-utils';

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


export async function sendSignedTransaction(web3: Web3, transaction: TransactionConfig, account: Account): Promise<string> {
  const signedTrx = await web3.eth.accounts.signTransaction(transaction, account.privateKey);
  return new Promise((resolve, reject) => {
    if (signedTrx?.rawTransaction) {
      web3.eth.sendSignedTransaction(signedTrx.rawTransaction, (error, hash) => {
        if (error) {
          reject(error);
        } else {
          resolve(hash);
        }
      });
    } else {
      reject('Unknown transaction');
    }
  });
}

export async function neonBalance(web3: Web3, address: string): Promise<Big> {
  const balance = await web3.eth.getBalance(address);
  return new Big(balance).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
}

export async function splTokenBalance(connection: Connection, walletPubkey: PublicKey, token: SPLToken): Promise<TokenAmount> {
  const mintAccount = new PublicKey(token.address_spl);
  const assocTokenAccountAddress = await getAssociatedTokenAddress(mintAccount, walletPubkey);
  const response = await connection.getTokenAccountBalance(assocTokenAccountAddress);
  return response?.value;
}

export async function mintTokenBalance(web3: Web3, account: string, token: SPLToken, contractAbi: AbiItem[] = erc20Abi as AbiItem[]): Promise<any> {
  const tokenInstance = new web3.eth.Contract(contractAbi, token.address);
  const balance = await tokenInstance.methods.balanceOf(account).call();
  return balance / Math.pow(10, token.decimals);
}
