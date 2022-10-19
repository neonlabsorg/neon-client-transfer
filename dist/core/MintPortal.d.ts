import { AccountMeta, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Account, SignedTransaction, TransactionReceipt } from 'web3-core';
import { InstructionService } from './InstructionService';
import { SPLToken } from '../models';
export declare class MintPortal extends InstructionService {
    createNeonTransfer(events: import("../models").InstructionEvents | undefined, amount: number, splToken?: {
        chainId: number;
        address_spl: string;
        address: string;
        decimals: number;
        name: string;
        symbol: string;
        logoURI: string;
    }): Promise<void>;
    computeBudgetUtilsInstruction(programId: PublicKey): TransactionInstruction;
    computeBudgetHeapFrameInstruction(programId: PublicKey): TransactionInstruction;
    createClaimInstruction(owner: PublicKey, from: PublicKey, to: string, splToken: SPLToken, emulateSigner: Account, amount: any): Promise<{
        neonKeys: AccountMeta[];
        neonTransaction: SignedTransaction;
        emulateSigner: Account;
        nonce: number;
    }>;
    makeTrExecFromDataIx(neonAddress: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[]): Promise<TransactionInstruction>;
    createCollateralPoolAddress(collateralPoolIndex: number): Promise<PublicKey>;
    createNeonTransaction(neonWallet: string, solanaWallet: PublicKey, splToken: SPLToken, amount: number): Promise<TransactionReceipt>;
    createSolanaTransfer(events?: import("../models").InstructionEvents, amount?: number, splToken?: {
        chainId: number;
        address_spl: string;
        address: string;
        decimals: number;
        name: string;
        symbol: string;
        logoURI: string;
    }): Promise<void>;
    createAssociatedTokenAccountInstruction(associatedProgramId: PublicKey, programId: PublicKey, mint: PublicKey, associatedAccount: PublicKey, owner: PublicKey, payer: PublicKey): TransactionInstruction;
}
