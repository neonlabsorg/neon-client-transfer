import { PublicKey } from '@solana/web3.js';
import { Amount, neonNeonTransaction } from '@neonevm/token-transfer-core';
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { neonTransactionData } from './utils';

export async function neonNeonTransactionEthers(provider: JsonRpcProvider, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit = 5e4): Promise<TransactionRequest> {
  const data = neonTransactionData(solanaWallet);
  const transaction = neonNeonTransaction<TransactionRequest>(from, to, amount, data) as TransactionRequest;
  transaction.gasPrice = await provider.getGasPrice();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasLimit = gasEstimate.gt(gasLimit) ? gasEstimate.add(BigNumber.from(1e4)) : gasLimit;
  return <TransactionRequest>transaction;
}
