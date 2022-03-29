import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWeb3React } from "@web3-react/core"
import MintPortal from "../core/MintPortal"
import NeonPortal from "../core/NeonPortal"
import { NEON_TOKEN_MINT } from "../constants"

const useNeonTransfer = (events, currentConnection) => {
  const { connection } = useConnection()
  const { account } = useWeb3React()
  const { publicKey } = useWallet()
  const options = {
    solanaWalletAddress: publicKey,
    neonWalletAddress: account,
    customConnection: currentConnection || connection,
  }

  const neonPortal = new NeonPortal(options)
  const mintPortal = new MintPortal(options)

  const deposit = (amount, splToken) => {
    if (NEON_TOKEN_MINT === splToken.address_spl) {
      neonPortal.createNeonTransfer.call(neonPortal, events, amount, splToken)
    } else {
      mintPortal.createNeonTransfer.call(mintPortal, events, amount, splToken)
    }
  }

  const withdraw = (amount, splToken) => {
    if (NEON_TOKEN_MINT === splToken.address_spl) {
      neonPortal.createSolanaTransfer.call(neonPortal, events, amount, splToken)
    } else {
      mintPortal.createSolanaTransfer.call(mintPortal, events, amount, splToken)
    }
  }

  return { deposit, withdraw }
}

export default useNeonTransfer
