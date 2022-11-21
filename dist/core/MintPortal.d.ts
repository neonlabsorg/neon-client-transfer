import { AccountMeta, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Account, SignedTransaction, TransactionReceipt } from 'web3-core';
import { InstructionService } from './InstructionService';
import { SPLToken } from '../models';
export declare class MintPortal extends InstructionService {
    createNeonTransfer(amount: number, splToken: SPLToken, events?: import("../models").InstructionEvents): Promise<void>;
    createSolanaTransfer(amount: number, splToken: SPLToken, events?: import("../models").InstructionEvents): Promise<void>;
    neonTransferTransaction(amount: number, splToken: SPLToken): Promise<Transaction>;
    computeBudgetUtilsInstruction(programId: PublicKey): TransactionInstruction;
    computeBudgetHeapFrameInstruction(programId: PublicKey): TransactionInstruction;
    createClaimInstruction(owner: PublicKey, from: PublicKey, to: string, splToken: SPLToken, emulateSigner: Account, amount: any): Promise<{
        neonKeys: AccountMeta[];
        neonTransaction: SignedTransaction;
        emulateSigner: Account;
        nonce: number;
    }>;
    makeTrExecFromDataIx(neonAddress: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[]): Promise<TransactionInstruction>;
    getCollateralPoolAddress(collateralPoolIndex: number): Promise<[PublicKey, number]>;
    createNeonTransaction(neonWallet: string, solanaWallet: PublicKey, splToken: SPLToken, amount: number): Promise<TransactionReceipt>;
    solanaTransferTransaction(walletPubkey: PublicKey, mintPubkey: PublicKey, associatedTokenPubkey: PublicKey): Promise<Transaction>;
    createAssociatedTokenAccountInstruction(associatedProgramId: PublicKey, programId: PublicKey, mint: PublicKey, associatedAccount: PublicKey, owner: PublicKey, payer: PublicKey): TransactionInstruction;
}
