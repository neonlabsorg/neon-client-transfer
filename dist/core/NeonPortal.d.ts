import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TransactionConfig } from 'web3-core';
import { InstructionService } from './InstructionService';
import { SPLToken } from '../models';
export declare class NeonPortal extends InstructionService {
    createNeonTransfer(amount: number, splToken: SPLToken, events?: import("../models").InstructionEvents): Promise<void>;
    createSolanaTransfer(amount: number, splToken: SPLToken, events?: import("../models").InstructionEvents): Promise<void>;
    neonTransferTransaction(amount: number, token: SPLToken): Promise<Transaction>;
    createDepositInstruction(solanaPubkey: PublicKey, neonPubkey: PublicKey, depositPubkey: PublicKey, neonWalletAddress: string): Promise<TransactionInstruction>;
    getAuthorityPoolAddress(): Promise<[PublicKey, number]>;
    createWithdrawEthTransactionData(): string;
    ethereumTransaction(amount: number, token: SPLToken): TransactionConfig;
}
