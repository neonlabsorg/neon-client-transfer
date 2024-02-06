import { PublicKey } from "@solana/web3.js";
import { Transaction } from "web3-types";
import { Amount } from "@neonevm-token-transfer/core";
export declare function neonNeonTransactionWeb3(proxyUrl: string, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit?: number): Promise<Transaction>;
