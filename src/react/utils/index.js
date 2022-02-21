import { InjectedConnector } from '@web3-react/injected-connector'
const ids = {
  'mainnet-beta': 245022934,
  'testnet': 245022940,
  'devnet': 245022926
}
export const injector = new InjectedConnector({
  supportedChainIds: [ ids[process.env.REACT_APP_NETWORK || 'mainnet-beta'] ]
})

export function shortenAddress(address = '', chars = 4) {
  if (!address.length) return ''
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`
}

export function useLocalStorageState(key = '', defaultState = '') {
  const [state, setState] = useState(() => {
    // NOTE: Not sure if this is ok
    const storedState = localStorage.getItem(key);
    if (storedState) {
      return JSON.parse(storedState);
    }
    return defaultState;
  });
}
