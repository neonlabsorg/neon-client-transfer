import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  TransactionSignature
} from '@solana/web3.js';
import { TransactionRequest } from '@ethersproject/providers';
import { Signer as NeonSigner } from '@ethersproject/abstract-signer';

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


export async function sendNeonTransactionEthers(transaction: TransactionRequest, signer: NeonSigner): Promise<string> {
  const receipt = await signer.sendTransaction(transaction);
  return receipt.hash;
}
