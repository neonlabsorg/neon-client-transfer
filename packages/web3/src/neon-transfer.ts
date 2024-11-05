import { Transaction } from 'web3-types';
import { neonNeonTransaction, NeonTransactionParams } from '@neonevm/token-transfer-core';
import { getGasAndEstimationGasPrice, getGasLimit, neonTransactionData } from './utils';
import {JsonRpcProvider} from "ethers";

export async function neonNeonTransactionWeb3({
  from,
  to,
  solanaWallet,
  amount,
  provider,
  gasLimit = 5e4
}: NeonTransactionParams<string>): Promise<Transaction> {
  const data = neonTransactionData(provider, solanaWallet);
  const transaction = neonNeonTransaction<Transaction>(from, to, amount, data) as Transaction;
  const { gasPrice, gas } = await getGasAndEstimationGasPrice(provider, transaction);
  transaction.gasPrice = gasPrice;
  transaction.gas = gas;
  transaction['gasLimit'] = getGasLimit(transaction.gas, BigInt(gasLimit));
  return transaction as Transaction;
}
