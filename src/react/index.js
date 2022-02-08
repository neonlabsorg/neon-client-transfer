import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWeb3React } from '@web3-react/core'
import Transferrer from '../Transferrer'

const useNeonTransfer = (events) => {
  const { connection } = useConnection()
  const { account } = useWeb3React()
  const { publicKey } = useWallet()
  const transferrer = useRef()
  transferrer.current = new Transferrer({
    solanaWalletAddress: publicKey,
    neonWalletAddress: account,
    customConnection: connection,
    ...events
  })
  useEffect(() => {
    transferrer.current = new Transferrer({
      solanaWalletAddress: publicKey,
      neonWalletAddress: account,
      customConnection: connection,
      ...events
    })
  }, [publicKey, account, connection])
  const { initNeonTransfer, initSolanaTransfer, getNeonAccount } = transferrer.current
  return { initNeonTransfer, initSolanaTransfer, getNeonAccount }
}

export default useNeonTransfer