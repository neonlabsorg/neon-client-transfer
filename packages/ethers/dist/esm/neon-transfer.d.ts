import { PublicKey } from "@solana/web3.js";
import { Amount } from "@neonevm-token-transfer/core";
import { JsonRpcProvider, TransactionRequest } from "@ethersproject/providers";
export declare function neonNeonTransactionWeb3(provider: JsonRpcProvider, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit?: number): Promise<TransactionRequest>;
