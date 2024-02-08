import { PublicKey } from '@solana/web3.js';
import { keccak256 } from 'web3-utils';

export function signerPrivateKey(solanaWallet: PublicKey, neonWallet: string): string {
  return keccak256(solanaWallet.toBase58() + neonWallet);
}
