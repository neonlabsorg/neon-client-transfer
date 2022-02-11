import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWeb3React } from '@web3-react/core'
import NeonPortal from '../NeonPortal'

export const useNeonTransfer = (events) => {
  const connection = useConnection()
  const { account } = useWeb3React()
  const { publicKey } = useWallet()
  let portal = new NeonPortal({
    solanaWalletAddress: publicKey,
    neonWalletAddress: account,
    customConnection: connection,
    ...events
  })
  const createNeonTransfer = portal.createNeonTransfer.bind(portal)
  const createSolanaTransfer = portal.createSolanaTransfer.bind(portal)
  return { createNeonTransfer, createSolanaTransfer }
}

export default useNeonTransfer