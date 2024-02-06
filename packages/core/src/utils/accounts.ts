import { PublicKey } from '@solana/web3.js';
import { sha256 } from 'js-sha256';

export function signerPrivateKey(solanaWallet: PublicKey, neonWallet: string): string {
  return `0x${sha256(solanaWallet.toBase58() + neonWallet).toString()}`;
}
