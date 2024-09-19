import { PublicKey } from '@solana/web3.js';
import { keccak256 } from 'ethers';

export function signerPrivateKey(solanaWallet: PublicKey, neonWallet: string): string {
  return keccak256(Buffer.from(`${neonWallet.slice(2)}${solanaWallet.toBase58()}`, 'utf-8'));
}
