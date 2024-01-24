import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Amount, NeonAddress, SPLToken } from '../models';
export declare function solanaNEONTransferTransaction(solanaWallet: PublicKey, neonWallet: NeonAddress, neonEvmProgram: PublicKey, neonTokenMint: PublicKey, token: SPLToken, amount: Amount, chainId?: number, serviceWallet?: PublicKey, rewardAmount?: Amount): Promise<Transaction>;
export declare function createNeonDepositToBalanceInstruction(chainId: number, solanaWallet: PublicKey, tokenAddress: PublicKey, neonWallet: string, neonEvmProgram: PublicKey, tokenMint: PublicKey, serviceWallet?: PublicKey): TransactionInstruction;
export declare function createNeonDepositInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, depositWallet: PublicKey, neonWallet: string, neonEvmProgram: PublicKey, neonTokenMint: PublicKey, serviceWallet?: PublicKey): TransactionInstruction;
export declare function createNeonTransferInstruction(neonTokenMint: PublicKey, solanaWallet: PublicKey, serviceWallet: PublicKey, rewardAmount: Amount): TransactionInstruction;
export declare function wrappedNeonTransaction<T>(from: string, to: string, data: string): T;
export declare function neonNeonTransaction<T>(from: string, to: string, amount: Amount, data: string): T;
