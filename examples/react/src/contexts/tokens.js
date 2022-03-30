import { useWallet } from "@solana/wallet-adapter-react";
import { useWeb3React } from "@web3-react/core";
import { useEffect, useState, useMemo, createContext, useContext } from "react";
import { useNetworkType } from "../SplConverter/hooks";
import { useConnection } from "./connection";
import { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from '@solana/web3.js'
import ERC20_ABI from '../SplConverter/hooks/abi/erc20.json'

export const TokensContext = createContext({
  list: [],
  tokenErrors: {},
  pending: false,
  tokenManagerOpened: false,
  setTokenManagerOpened: () => {},
  updateTokenList: () => {}
});

export function TokensProvider({ children = undefined}) {
  const {chainId} = useNetworkType()
  const {publicKey} = useWallet()
  const {library, account} = useWeb3React()
  const connection = useConnection()
  const [list, setTokenList] = useState([])
  const [pending, setPending] = useState(false)
  const [tokenManagerOpened, setTokenManagerOpened] = useState(false)
  const [tokenErrors, setTokenErrors] = useState({})

  const [error, setError] = useState('')
  const setNewTokenError = (symbol, message) => {
    tokenErrors[symbol] = message
    setTokenErrors({...tokenErrors})
  }

  const [balances, setBalances] = useState({})
  const addBalance = (symbol, balance) => {
    balances[symbol] = balance
    setBalances({...balances})
  }

  const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const filteringChainId = useMemo(() => {
    if (Number.isNaN(chainId)) return 111
    return chainId
  }, [chainId])


  const getSplBalance = async (token) => {
    const pubkey = new PublicKey(token.address_spl)
    const assocTokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      pubkey,
      publicKey
    )
    const completed = await Promise.all([
      connection.getTokenAccountBalance(assocTokenAccountAddress),
      timeout(500)
    ]).catch(e => {
      console.warn(e)
      setNewTokenError(token.symbol, e.message)
      return [0, undefined]
    })
    const balanceData = completed[0]
    if (balanceData === 0) return 0
    if (balanceData && balanceData.value && balanceData.value.uiAmount) {
      return balanceData.value.uiAmount
    }
    return 0
  }

  const getEthBalance = async (token) => {
    const tokenInstance = new library.eth.Contract(ERC20_ABI, token.address)
    let balance = await tokenInstance.methods.balanceOf(account).call()
    balance = balance / Math.pow(10, token.decimals)
    return balance
  }

  const requestListBalances = async () => {
    for (const item of list) {
      let sol, eth
      try {
        if (publicKey) {
          sol = await getSplBalance(item)
        } else {
          sol = undefined
        }
        if (account) {
          eth = await getEthBalance(item)
        } else {
          eth = undefined
        }
        setTimeout(() => addBalance(item.symbol, {sol, eth}))
      } catch (e) {
        console.warn(e)
      }
    }
  }

  const mergeTokenList = async (source = []) => {
    if (list.length) {
      setTokenList([])
      setTokenErrors({})
    }
    const newList = source.filter((item) => item.chainId === filteringChainId)
    setTokenList(newList)
    setTimeout(async () => {
      await requestListBalances()
    })
  }
  const updateTokenList = () => {
    setPending(true)
    fetch(`https://raw.githubusercontent.com/neonlabsorg/token-list/main/tokenlist.json`)
    .then((resp) => {
      if (resp.ok) {
        resp.json().then(data => {
          mergeTokenList(data.tokens)
        })
          .catch((err) => setError(err.message))
      }
    })
    .catch(err => {
      setError(`Failed to fetch neon transfer token list: ${err.message}`)
    }).finally(() => setPending(false))
  }


  useEffect(() => {
    updateTokenList()
    
  // eslint-disable-next-line
  }, [chainId, account, publicKey])

  

  return <TokensContext.Provider
    value={{list, pending, error, tokenErrors, balances, tokenManagerOpened, setTokenManagerOpened, updateTokenList}}>
    {children}
  </TokensContext.Provider>
}

export function useTokensContext() {
  return useContext(TokensContext)
}