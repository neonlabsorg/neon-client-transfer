import { Connection, Keypair } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { PHANTOM_PRIVATE } from '../../../tools';

require('dotenv').config({ path: `./__tests__/env/.env` });

const SOLANA_URL = process.env.SOLANA_URL;
const keyPair = Keypair.fromSecretKey(PHANTOM_PRIVATE);

export function setupUmiClient(endpoint: string = SOLANA_URL, solanaWallet: Keypair = keyPair) {
  const umi = createUmi(endpoint);
  const wallet = umi.eddsa.createKeypairFromSecretKey(solanaWallet.secretKey);
  const userWalletSigner = createSignerFromKeypair(umi, wallet);
  umi.use(signerIdentity(userWalletSigner));
  return { umi, wallet, userWalletSigner };
}
