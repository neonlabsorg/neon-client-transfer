import { useWeb3React as useWeb3ReactCore } from '@web3-react/core'
import {useMemo} from 'react'
export const ChainId = {
  111: 'LOCAL',
  245022926: 'devnet',
  245022940: 'testnet',
  245022934: 'mainnet-beta'
}

export function useNetworkType() {
  const {library, active} = useWeb3ReactCore()
  const {network, chainId} = useMemo(() => {
    let network = '',
    chainId = Number(library?.currentProvider?.networkVersion)
    if (active) {
      network =  library?.currentProvider && library.currentProvider.networkVersion ? ChainId[library.currentProvider.networkVersion] : 'disconnected'
    } else {
      network = 'disconnected'
    }
    return {network, chainId}
  }, [active, library?.currentProvider])
  return {network, chainId}
}
