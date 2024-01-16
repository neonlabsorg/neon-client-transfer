import { PublicKey } from "@solana/web3.js";
import { Amount } from "../models";
import { neonNeonTransaction } from "../core";
import { neonTransactionData } from "./utils";
import { JsonRpcProvider, TransactionRequest } from "@ethersproject/providers";
import { BigNumber } from "@ethersproject/bignumber";

export async function neonNeonTransactionWeb3(provider: JsonRpcProvider, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit = 5e4): Promise<TransactionRequest> {
  const data = neonTransactionData(solanaWallet);
  const transaction = <TransactionRequest>neonNeonTransaction(from, to, amount, data);
  transaction.gasPrice = await provider.getGasPrice();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasLimit = gasEstimate.gt(gasLimit) ? gasEstimate.add(BigNumber.from(1e4)) : gasLimit;
  return <TransactionRequest>transaction;
}
