import { Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

export function solanaTransactionLog(transaction: Transaction): void {
  console.log(transaction.instructions.map(({ programId, keys, data }, index) => {
    return `[${index}] programId: ${programId.toBase58()}
keys:
${keys.map(k => `${k.pubkey.toBase58()} [${k.isSigner ? 'signer' : ''}${k.isSigner && k.isWritable ? ', ' : ''}${k.isWritable ? 'writer' : ''}]`).join('\n')}
data:
${bs58.encode(data)}
0x${Buffer.from(data).toString('hex')}
${JSON.stringify(data)}
------------------------------`;
  }).join('\n\n'));
}
