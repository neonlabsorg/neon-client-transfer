import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  TransactionSignature
} from '@solana/web3.js';
import { Web3 } from 'web3';
import { Transaction as NeonTransaction } from 'web3-types';
import { Web3Account } from 'web3-eth-accounts';

export function toSigner({ publicKey, secretKey }: Keypair): Signer {
  return { publicKey, secretKey };
}

export async function sendSolanaTransaction(connection: Connection, transaction: Transaction, signers: Signer[],
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

export async function sendNeonTransaction(web3: Web3, transaction: NeonTransaction, account: Web3Account): Promise<string> {
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
