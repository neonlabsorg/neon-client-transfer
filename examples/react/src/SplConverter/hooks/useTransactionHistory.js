import { useWeb3React } from '@web3-react/core';
import { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react';

const useTransactionHistory = () => {
  const { publicKey } = useWallet()
  const { account } = useWeb3React()
  const [viewNotify, setViewNotify] = useState(true)
  const [transactions, setTransactions] = useState([])
  useEffect(() => {
    const transactionsString = localStorage.getItem('transactions')
    if (!transactionsString) localStorage.setItem('transactions', '[]')
    try {
      const arr = JSON.parse(transactionsString || '[]')
      setTransactions(arr)
    } catch (err) {
      console.warn('error parsing transaction history roll')
    }
  }, [])
  const addTransaction = (transaction = {from: '', to: ''}) => {
    if (transaction.from && transaction.to) {
      const updatedTransactions = transactions.concat([transaction])
      setTransactions(updatedTransactions)
      localStorage.setItem('transactions', JSON.stringify(updatedTransactions))
      if (viewNotify) setViewNotify(false)
    }
  }
  const isFirstTransaction = useMemo(() => {
    if (!account && !publicKey) return false
    if ((publicKey || account) && !transactions.length) return true
    let status = true
    transactions.forEach(transaction => {
      Object.keys(transaction).forEach(dirKey => {
        let addr = transaction[dirKey]
        if (account === addr || (publicKey && publicKey.toBase58() === addr)) status = false
      })
    })
    return status
  }, [account, publicKey, transactions])

  return {addTransaction, isFirstTransaction, viewNotify, setViewNotify}
}

export default useTransactionHistory