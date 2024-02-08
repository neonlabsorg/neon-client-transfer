import { PublicKey } from '@solana/web3.js';
import { Transaction } from 'web3-types';
import { Amount, neonNeonTransaction } from '@neonevm/token-transfer-core';
import { getGasAndEstimationGasPrice, getGasLimit, neonTransactionData } from './utils';

export async function neonNeonTransactionWeb3(proxyUrl: string, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit = 5e4): Promise<Transaction> {
  const data = neonTransactionData(proxyUrl, solanaWallet);
  const transaction = neonNeonTransaction<Transaction>(from, to, amount, data) as Transaction;
  const { gasPrice, gas } = await getGasAndEstimationGasPrice(proxyUrl, transaction);
  transaction.gasPrice = gasPrice;
  transaction.gas = gas;
  transaction['gasLimit'] = getGasLimit(transaction.gas, BigInt(gasLimit));
  return transaction as Transaction;
}
