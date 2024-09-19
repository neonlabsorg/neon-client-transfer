import { PublicKey } from '@solana/web3.js';
import { Amount, neonNeonTransaction } from '@neonevm/token-transfer-core';
import { JsonRpcProvider, TransactionRequest } from 'ethers';
import { neonTransactionData } from './utils';

export async function neonNeonTransactionEthers(provider: JsonRpcProvider, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit = 5e4): Promise<TransactionRequest> {
  const data = neonTransactionData(solanaWallet);
  const transaction = neonNeonTransaction<TransactionRequest>(from, to, amount, data);
  const feeData = await provider.getFeeData();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasPrice = feeData.gasPrice;
  transaction.gasLimit = gasEstimate > BigInt(gasLimit) ? gasEstimate + BigInt(1e4) : BigInt(gasLimit);
  return transaction;
}
