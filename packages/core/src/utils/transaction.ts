import { Transaction, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import { PreparatorySolanaInstruction, SolanaAccountData } from '../models';

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

export function prepareSolanaInstruction(instruction: TransactionInstruction): PreparatorySolanaInstruction {
  const data = bs58.encode(instruction.data);
  const programId = instruction.programId.toBase58();
  const accounts: SolanaAccountData[] = [];
  for (const { pubkey, isSigner, isWritable } of instruction.keys) {
    accounts.push({ address: pubkey.toBase58(), isSigner, isWritable });
  }
  return { programId, data, accounts };
}

export function prepareSolanaInstructions(instructions: TransactionInstruction[]): PreparatorySolanaInstruction[] {
  const result: PreparatorySolanaInstruction[] = [];
  for (const instruction of instructions) {
    result.push(prepareSolanaInstruction(instruction));
  }
  return result;
}
