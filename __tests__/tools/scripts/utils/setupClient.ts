import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';
import { PHANTOM_PRIVATE } from '../../../tools';

require('dotenv').config({ path: `./__tests__/env/.env` });

export function setupUmiClient() {
  const umi = createUmi(process.env.SOLANA_URL!);
  const wallet = umi.eddsa.createKeypairFromSecretKey(PHANTOM_PRIVATE);
  const userWalletSigner = createSignerFromKeypair(umi, wallet);
  umi.use(signerIdentity(userWalletSigner));
  return { umi, wallet, userWalletSigner };
}
