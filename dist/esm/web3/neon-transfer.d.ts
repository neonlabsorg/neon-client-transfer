import { PublicKey } from '@solana/web3.js';
import { Amount } from '../models';
import { Transaction } from 'web3-types';
export declare function neonNeonTransactionWeb3(proxyUrl: string, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit?: number): Promise<Transaction>;
