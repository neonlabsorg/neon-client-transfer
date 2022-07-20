import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useWeb3React } from "@web3-react/core"
import { NeonPortal, MintPortal } from "../core/index"
import { NEON_TOKEN_MINT } from "../constants"

export const useNeonTransfer = (events, currentConnection) => {
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

  const _getInstance = (addr = "") => (NEON_TOKEN_MINT === addr ? neonPortal : mintPortal)

  const getEthereumTransactionParams = (amount, splToken) => {
    const portal = _getInstance(splToken.address_spl)

    return portal.getEthereumTransactionParams.call(portal, amount, splToken)
  }

  const deposit = (amount, splToken) => {
    const portal = _getInstance(splToken.address_spl)

    return portal.createNeonTransfer.call(portal, events, amount, splToken)
  }

  const withdraw = (amount, splToken) => {
    const portal = _getInstance(splToken.address_spl)

    return portal.createSolanaTransfer.call(portal, events, amount, splToken)
  }

  return { deposit, withdraw, getEthereumTransactionParams }
}
