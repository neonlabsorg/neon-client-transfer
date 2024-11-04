import { PublicKey } from '@solana/web3.js';
import { Transaction } from 'web3-types';
import { Amount, neonNeonTransaction, NeonTransactionParams } from '@neonevm/token-transfer-core';
import { getGasAndEstimationGasPrice, getGasLimit, neonTransactionData } from './utils';

export async function neonNeonTransactionWeb3(params: NeonTransactionParams<string>): Promise<Transaction> {
  const { provider, from, to, solanaWallet, amount, gasLimit } = params;
  const effectiveGasLimit = gasLimit ?? 5e4;
  const data = neonTransactionData(provider, solanaWallet);
  const transaction = neonNeonTransaction<Transaction>(from, to, amount, data) as Transaction;
  const { gasPrice, gas } = await getGasAndEstimationGasPrice(provider, transaction);
  transaction.gasPrice = gasPrice;
  transaction.gas = gas;
  transaction['gasLimit'] = getGasLimit(transaction.gas, BigInt(effectiveGasLimit));
  return transaction as Transaction;
}
