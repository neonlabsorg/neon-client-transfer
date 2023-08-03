import { AccountMeta, Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Account, SignedTransaction, TransactionConfig } from 'web3-core';
import Web3 from 'web3';
import { Amount, NeonProgramStatus, SPLToken } from '../models';
import { NeonProxyRpcApi } from '../api';
export declare function neonTransferMintWeb3Transaction(connection: Connection, web3: Web3, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, splToken: SPLToken, amount: Amount): Promise<any>;
export declare function neonTransferMintTransaction(connection: Connection, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, emulateSigner: Account, neonKeys: AccountMeta[], neonTransaction: SignedTransaction, splToken: SPLToken, amount: bigint): Promise<Transaction>;
export declare function createComputeBudgetUtilsInstruction(programId: PublicKey, proxyStatus: NeonProgramStatus): TransactionInstruction;
export declare function createComputeBudgetHeapFrameInstruction(programId: PublicKey, proxyStatus: NeonProgramStatus): TransactionInstruction;
export declare function createApproveDepositInstruction(walletPubkey: PublicKey, neonPDAPubkey: PublicKey, associatedTokenPubkey: PublicKey, amount: number | bigint): TransactionInstruction;
export declare function createAccountV3Instruction(solanaWallet: PublicKey, neonWalletPDA: PublicKey, neonEvmProgram: PublicKey, neonWallet: string): TransactionInstruction;
export declare function climeTransactionData(web3: Web3, associatedTokenAddress: PublicKey, neonWallet: string, amount: Amount): string;
export declare function neonClaimTransactionFromSigner(climeData: string, walletSigner: Account, neonWallet: string, splToken: SPLToken): Promise<SignedTransaction>;
export declare function createClaimInstruction(proxyApi: NeonProxyRpcApi, signedTransaction: SignedTransaction): Promise<{
    neonKeys: AccountMeta[];
    neonTransaction: SignedTransaction;
}>;
export declare function createExecFromDataInstruction(solanaWallet: PublicKey, neonWalletPDA: PublicKey, neonEvmProgram: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[], proxyStatus: NeonProgramStatus): TransactionInstruction;
export declare function createMintNeonWeb3Transaction(web3: Web3, neonWallet: string, solanaWallet: PublicKey, splToken: SPLToken, amount: Amount, gasLimit?: number): Promise<TransactionConfig>;
export declare function mintNeonTransactionData(web3: Web3, solanaWallet: PublicKey, splToken: SPLToken, amount: Amount): string;
export declare function createMintNeonTransaction(neonWallet: string, splToken: SPLToken, data: string): TransactionConfig;
export declare function createERC20SolanaTransaction(walletPubkey: PublicKey, mintPubkey: PublicKey, associatedTokenPubkey: PublicKey, proxyStatus: NeonProgramStatus): Transaction;
export declare function createAssociatedTokenAccountInstruction(tokenMint: PublicKey, associatedAccount: PublicKey, owner: PublicKey, payer: PublicKey, associatedProgramId?: PublicKey, programId?: PublicKey): TransactionInstruction;
export declare function createWrapSOLTransaction(connection: Connection, solanaWallet: PublicKey, amount: Amount, splToken: SPLToken): Promise<Transaction>;
export declare function createUnwrapSOLTransaction(connection: Connection, solanaWallet: PublicKey, splToken: SPLToken): Promise<Transaction>;