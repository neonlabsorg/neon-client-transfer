import { defineStore } from 'pinia';
import { JsonRpcProvider } from 'ethers';
import type { NeonProgramStatus } from '@neonevm/token-transfer-core';
import { NEON_STATUS_DEVNET_SNAPSHOT, NeonProxyRpcApi } from '@neonevm/token-transfer-core';
import type { Connection, PublicKey, Signer } from '@solana/web3.js';
import { Connection as SolanaConnection, PublicKey as SolanaPublicKey } from '@solana/web3.js';

import { CHAIN_ID, networkUrls } from '@/utils';
import { useWalletsStore } from '@/stores';

import type { NetworkUrl } from '@/types';

interface IWeb3Store {
  solanaSigner: Signer,
  isLoading: boolean,
  chainId: number,
  ethersProvider: JsonRpcProvider,
  networkTokenMint: PublicKey,
  solanaConnection: Connection,
  networkUrl: NetworkUrl,
  neonProgram: PublicKey,
  proxyStatus: NeonProgramStatus,
  apiProxy: NeonProxyRpcApi,
}

export const useWeb3Store = defineStore('web3', {
  state: (): IWeb3Store => ({
    isLoading: false,
    solanaSigner: {} as Signer,
    chainId: CHAIN_ID,
    networkUrl: {} as NetworkUrl,
    neonProgram: {} as PublicKey,
    ethersProvider: {} as JsonRpcProvider,
    networkTokenMint: {} as PublicKey,
    solanaConnection: {} as Connection,
    proxyStatus: {} as NeonProgramStatus,
    apiProxy: {} as NeonProxyRpcApi
  }),
  actions: {
    async initStore() {
      this.isLoading = true;
      this.setNetworkUrl();
      this.setWeb3Provider();
      this.setApiProxy();
      this.setSolanaConnection();
      await this.setProxyStatus();
      this.setNeonProgram();
      this.isLoading = false;
    },
    setChainId(chainId: number) {
      this.chainId = chainId;
    },
    setNetworkUrl(networkUrl?: NetworkUrl) {
      this.networkUrl = networkUrl || networkUrls.find(chain => chain.id === this.chainId) || networkUrls[0];

    },
    setWeb3Provider() {
      this.ethersProvider = new JsonRpcProvider(this.networkUrl.neonProxy);
    },
    setSolanaConnection() {
      this.solanaConnection = new SolanaConnection(this.networkUrl.solana, 'confirmed');
    },
    setApiProxy() {
      this.apiProxy = new NeonProxyRpcApi(this.networkUrl.neonProxy);
    },
    setSigner() {
      const { solanaWallet } = useWalletsStore();

      this.solanaSigner = {
        publicKey: solanaWallet.publicKey,
        secretKey: solanaWallet.secretKey
      };
    },
    setNeonProgram() {
      this.neonProgram = this.proxyStatus
        ? new SolanaPublicKey(this.proxyStatus?.neonEvmProgramId!)
        : new SolanaPublicKey(NEON_STATUS_DEVNET_SNAPSHOT.neonEvmProgramId);
    },
    async setProxyStatus() {
      try {
        this.proxyStatus = await this.apiProxy.evmParams();
      } catch (e) {
        console.log(e);
      }
    }
  }
});
