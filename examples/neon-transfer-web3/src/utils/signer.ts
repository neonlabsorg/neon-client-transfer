import { Keypair, Signer } from '@solana/web3.js';

export function toSigner({ publicKey, secretKey }: Keypair): Signer {
  return { publicKey, secretKey };
}
