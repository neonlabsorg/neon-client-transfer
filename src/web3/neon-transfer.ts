import { PublicKey } from "@solana/web3.js";
import { Amount } from "../models";
import { Transaction } from "web3-types";
import { neonNeonTransaction } from "../core";
import {
  neonTransactionData,
  getGasAndEstimationGasPrice,
  getGasLimit
} from "./utils";

export async function neonNeonTransactionWeb3(proxyUrl: string, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit = 5e4): Promise<Transaction> {
  const data = neonTransactionData(proxyUrl, solanaWallet);
  const transaction = <Transaction>neonNeonTransaction(from, to, amount, data);
  const { gasPrice, gas } = await getGasAndEstimationGasPrice(proxyUrl, transaction);
  transaction.gasPrice = gasPrice;
  transaction.gas = gas;
  transaction['gasLimit'] =  getGasLimit(transaction.gas, BigInt(gasLimit));
  return transaction as Transaction;
}
