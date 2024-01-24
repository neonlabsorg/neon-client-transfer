import { PublicKey } from '@solana/web3.js';
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import { Amount } from '../models';
export declare function neonNeonTransactionWeb3(provider: JsonRpcProvider, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit?: number): Promise<TransactionRequest>;
