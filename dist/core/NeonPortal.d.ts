import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TransactionConfig } from 'web3-core';
import { InstructionService } from './InstructionService';
import { SPLToken } from '../models';
export declare class NeonPortal extends InstructionService {
    createNeonTransfer(events: import("../models").InstructionEvents | undefined, amount: number | undefined, token: SPLToken): Promise<void>;
    createDepositInstruction(solanaPubkey: PublicKey, neonPubkey: PublicKey, depositPubkey: PublicKey, neonWalletAddress: string): Promise<TransactionInstruction>;
    getAuthorityPoolAddress(): Promise<[PublicKey, number]>;
    createSolanaTransfer(events?: import("../models").InstructionEvents, amount?: number, splToken?: {
        chainId: number;
        address_spl: string;
        address: string;
        decimals: number;
        name: string;
        symbol: string;
        logoURI: string;
    }): Promise<void>;
    createWithdrawEthTransactionData(): string;
    getEthereumTransactionParams(amount: number, token: SPLToken): TransactionConfig;
}
