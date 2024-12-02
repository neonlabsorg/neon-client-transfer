import { PublicKey } from '@solana/web3.js';
import { keccak256 } from 'ethers';

/**
 * Generates a private key for a signer based on the Neon and Solana wallet addresses.
 *
 * @param solanaWallet - The public key of the Solana wallet.
 * @param neonWallet - The address of the Neon wallet (in hexadecimal format).
 * @returns A keccak256 hash as a string representing the generated private key.
 */
export function signerPrivateKey(solanaWallet: PublicKey, neonWallet: string): string {
  return keccak256(Buffer.from(`${neonWallet.slice(2)}${solanaWallet.toBase58()}`, 'utf-8'));
}
