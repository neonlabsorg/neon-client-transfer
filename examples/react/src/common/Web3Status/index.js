import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import { shortenAddress } from '../../utils'
import { injected } from '../../connectors'
const Web3Status = ({className = ''}) => {
  const { account, error, activate, deactivate, active } = useWeb3React()
  async function connect() {
    try {
      await activate(injected)
    } catch (ex) {
      console.log(ex)
    }
  }

  async function disconnect() {
    try {
      deactivate()
    } catch (ex) {
      console.log(ex)
    }
  }
  if (error) {
    return <span>
      {error instanceof UnsupportedChainIdError ? 
      <div className='flex flex-col py-4 px-6 border border-purple-700 mb-6'>
        <div className='text-md mb-3'>{'Wrong Network'}</div>
        <div className='flex flex-col text-sm text-gray-600'>
          {`Choose ${process.env.REACT_APP_NETWORK || 'Neon'} network in your metamask wallet to continue transaction`}
          </div>
      </div>
      : 'Error'}
    </span>
  }
  if (active && account) {
    return <span className={`p-4 text-blue-600 cursor-pointer ${className}`} 
      onClick={disconnect}>{shortenAddress(account)}</span>
  } else {
    return <span className={`p-4 text-blue-600 cursor-pointer ${className}`} onClick={connect}>Connect Wallet</span>
  }

}
export default Web3Status