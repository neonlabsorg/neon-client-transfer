import { PublicKey } from '@solana/web3.js';
import { Amount, neonNeonTransaction, NeonTransactionParams } from '@neonevm/token-transfer-core';
import { JsonRpcProvider, TransactionRequest } from 'ethers';
import { neonTransactionData } from './utils';

export async function neonNeonTransactionEthers(params: NeonTransactionParams<JsonRpcProvider>): Promise<TransactionRequest> {
  const { from, to, solanaWallet, amount, provider, gasLimit } = params;
  const effectiveGasLimit = gasLimit ?? 5e4;
  const data = neonTransactionData(solanaWallet);
  const transaction = neonNeonTransaction<TransactionRequest>(from, to, amount, data);
  const feeData = await provider.getFeeData();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasPrice = feeData.gasPrice;
  transaction.gasLimit = gasEstimate > BigInt(effectiveGasLimit) ? gasEstimate + BigInt(1e4) : BigInt(effectiveGasLimit);
  return transaction;
}
