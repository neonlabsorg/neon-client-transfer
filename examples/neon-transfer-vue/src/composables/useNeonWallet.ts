import { JsonRpcProvider, Wallet } from 'ethers';
import { useWalletsStore, useWeb3Store } from '@/stores';
import { NEON_PRIVATE } from '@/utils';

export default () => {
  const walletStore = useWalletsStore();
  const web3Store = useWeb3Store();
  let neonWallet = {} as Wallet;

  const initNeonWallet = () => {
    const ethersProvider = new JsonRpcProvider(web3Store.networkUrl.neonProxy);
    neonWallet = new Wallet(NEON_PRIVATE, ethersProvider); //This helps to avoid wrapped in Proxy wallet props
    walletStore.setNeonWallet(neonWallet);
  };

  return { initNeonWallet };
};
