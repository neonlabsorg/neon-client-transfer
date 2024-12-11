import { useWalletsStore, useWeb3Store } from '@/stores';
import { signerPrivateKey } from '@neonevm/token-transfer-core';
import { Keypair } from '@solana/web3.js';
import { decode } from 'bs58';
import { Wallet, JsonRpcProvider } from 'ethers';

import { SOLANA_PRIVATE, NEON_PRIVATE } from '@/utils';

export default () => {
  const walletStore = useWalletsStore();
  const web3Store = useWeb3Store();

  const ethersProvider = new JsonRpcProvider(web3Store.networkUrl.neonProxy);
  const solanaWallet = Keypair.fromSecretKey(decode(SOLANA_PRIVATE));
  const neonWallet = new Wallet(NEON_PRIVATE, ethersProvider);

  const initSolanaWalletSigner = () => {
    const solanaWalletSigner = new Wallet(
      signerPrivateKey(solanaWallet.publicKey, neonWallet.address),
      ethersProvider
    );

    walletStore.setSolanaWalletSigner(solanaWalletSigner);
  };

  return { initSolanaWalletSigner };
};
