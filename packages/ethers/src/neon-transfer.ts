import { neonNeonTransaction, NeonTransactionParams } from '@neonevm/token-transfer-core';
import { JsonRpcProvider, TransactionRequest } from 'ethers';
import { neonTransactionData } from './utils';

export async function neonNeonTransactionEthers({
  from,
  to,
  solanaWallet,
  amount,
  provider,
  gasLimit = BigInt(5e4)
}: NeonTransactionParams<JsonRpcProvider>): Promise<TransactionRequest> {
  const data = neonTransactionData(solanaWallet);
  const transaction = neonNeonTransaction<TransactionRequest>(from, to, amount, data);
  const feeData = await provider.getFeeData();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasPrice = feeData.gasPrice;
  transaction.gasLimit = gasEstimate > gasLimit? gasEstimate + BigInt(1e4) : gasLimit;
  return transaction;
}
