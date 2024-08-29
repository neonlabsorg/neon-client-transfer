import { defineStore } from "pinia";
import { Web3 } from 'web3'
import { HttpProvider } from 'web3-providers-http'
import { NeonProxyRpcApi, NEON_STATUS_DEVNET_SNAPSHOT } from '@neonevm/token-transfer-core';
import { PublicKey as SolanaPublicKey, Connection as SolanaConnection } from "@solana/web3.js";

import { networkUrls, CHAIN_ID } from '@/utils'
import { useWalletsStore } from "@/stores";

import type { NetworkUrl } from '@/types'
import type { NeonProgramStatus } from '@neonevm/token-transfer-core'
import type { PublicKey, Connection, Signer } from "@solana/web3.js";

interface IWeb3Store {
    solanaSigner: Signer,
    isLoading: boolean,
    chainId: number,
    web3Provider: Web3,
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
        web3Provider: {} as Web3,
        networkTokenMint: {} as PublicKey,
        solanaConnection: {} as Connection,
        proxyStatus: {} as NeonProgramStatus,
        apiProxy: {} as NeonProxyRpcApi
    }),
    actions: {
        async initStore() {
            this.isLoading = true
            this.setNetworkUrl()
            this.setWeb3Provider()
            this.setApiProxy()
            this.setSolanaConnection()
            await this.setProxyStatus()
            this.setNeonProgram()
            this.isLoading = false
        },
        setChainId(chainId: number) {
            this.chainId = chainId
        },
        setNetworkUrl(networkUrl?: NetworkUrl) {
            this.networkUrl = networkUrl || networkUrls.find(chain => chain.id === this.chainId) || networkUrls[0]
        },
        setWeb3Provider() {
            this.web3Provider = new Web3(new HttpProvider(this.networkUrl.neonProxy || ''))
        },
        setSolanaConnection() {
            this.solanaConnection = new SolanaConnection(this.networkUrl.solana, 'confirmed')
        },
        setApiProxy() {
            this.apiProxy = new NeonProxyRpcApi(this.networkUrl.neonProxy)
        },
        setSigner () {
            const { solanaWallet } = useWalletsStore()

            this.solanaSigner = { 
                publicKey: solanaWallet.publicKey, 
                secretKey: solanaWallet.secretKey,
            }
        },
        setNeonProgram() {
            this.neonProgram = new SolanaPublicKey(NEON_STATUS_DEVNET_SNAPSHOT.NEON_EVM_ID);
            // this.neonProgram = this.proxyStatus 
            //     ? new SolanaPublicKey(this.proxyStatus?.NEON_EVM_ID!)
            //     : new SolanaPublicKey(NEON_STATUS_DEVNET_SNAPSHOT.NEON_EVM_ID)
        },
        async setProxyStatus() {
            try {
                this.proxyStatus = await this.apiProxy.evmParams()
            } catch(e) {
                console.log(e)
            }
        },
    }
})