import { InjectedConnector } from '@web3-react/injected-connector'
const ids = {
  'mainnet-beta': 245022934,
  'testnet': 245022940,
  'devnet': 245022926
}
export const injected = new InjectedConnector({
  supportedChainIds: [ ids[process.env.REACT_APP_NETWORK || 'mainnet-beta'] ]
})