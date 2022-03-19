import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWeb3React } from '@web3-react/core'
import MintPortal from '../core/MintPortal'
import NeonPortal from '../core/NeonPortal'

const useNeonTransfer = (events, currentConnection) => {
  const { connection }  = useConnection()
  const { account } = useWeb3React()
  const { publicKey } = useWallet()
  const options = {
    solanaWalletAddress: publicKey,
    neonWalletAddress: account,
    customConnection: currentConnection ? currentConnection : connection
  }
  /* TODO:
    reexport four functions and rename it on 'depositMint / depositNeon / withdrawMint / withdrawNeon'
  */
  const neonPortal = new NeonPortal(options)
  const mintPortal = new MintPortal(options)

  const createNeonTransfer = portal.createNeonTransfer.bind(portal, events)
  const createSolanaTransfer = portal.createSolanaTransfer.bind(portal, events)
  return { createNeonTransfer, createSolanaTransfer }
}
export default useNeonTransfer