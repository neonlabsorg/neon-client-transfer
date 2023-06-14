import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TransactionConfig } from 'web3-core';
import { InstructionService } from './InstructionService';
import { Amount, SPLToken } from '../models';
export declare class NeonPortal extends InstructionService {
    createNeonTransfer(amount: number, splToken: SPLToken, events?: import("../models").InstructionEvents): Promise<void>;
    createSolanaTransfer(amount: number, splToken: SPLToken, events?: import("../models").InstructionEvents): Promise<void>;
    neonTransferTransaction(amount: Amount, token: SPLToken): Promise<Transaction>;
    createDepositInstruction(solanaPubkey: PublicKey, neonPubkey: PublicKey, depositPubkey: PublicKey, neonWalletAddress: string): Promise<TransactionInstruction>;
    getAuthorityPoolAddress(): [PublicKey, number];
    createWithdrawEthTransactionData(): string;
    ethereumTransaction(amount: Amount, token: SPLToken, to?: string): TransactionConfig;
    createWithdrawWNeonTransaction(amount: Amount, address: string): string;
    wNeonTransaction(amount: Amount, token: SPLToken): TransactionConfig;
    neonTransaction(amount: Amount, token: SPLToken): TransactionConfig;
}
