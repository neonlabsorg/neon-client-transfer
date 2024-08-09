import { defineStore } from "pinia";
import { Web3 } from 'web3'
import { HttpProvider } from 'web3-providers-http'
import { networkUrls, CHAIN_ID } from '@/utils'

import type { NetworkUrl } from '@/types'

interface IWeb3Store {
    chainId: number,
    web3Provider: Web3,
    networkUrl: NetworkUrl,
}

export const useWeb3Store = defineStore('web3', {
    state: (): IWeb3Store => ({
        chainId: CHAIN_ID,
        networkUrl: {} as NetworkUrl,
        web3Provider: {} as Web3,
    }),
    actions: {
        initStore() {
            this.setNetworkUrl()
            this.setWeb3Provider()
        },
        setChainId(chainId: number) {
            this.chainId = chainId
        },
        setNetworkUrl(networkUrl?: NetworkUrl) {
            this.networkUrl = networkUrl || networkUrls.find(chain => chain.id === this.chainId) || networkUrls[0]
        },
        setWeb3Provider() {
            this.web3Provider = new Web3(new HttpProvider(this.networkUrl.neonProxy || ''))
        }
    }
})