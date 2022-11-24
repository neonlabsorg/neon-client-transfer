import {
  Connection,
  Keypair,
  SendOptions,
  Signer,
  Transaction,
  TransactionSignature
} from '@solana/web3.js';

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
