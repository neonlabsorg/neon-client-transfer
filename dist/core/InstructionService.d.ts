/// <reference types="node" />
import { AccountInfo, Connection, PublicKey, SendOptions, TransactionInstruction } from '@solana/web3.js';
import Web3 from 'web3';
import { Account, TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { NeonProxyRpcApi } from '../api';
import { InstructionEvents, InstructionParams, NeonProgramStatus, SPLToken } from '../models';
import { Buffer } from 'buffer';
export declare class InstructionService {
    solanaWalletAddress: PublicKey;
    neonWalletAddress: string;
    web3: Web3;
    proxyApi: NeonProxyRpcApi;
    proxyStatus: NeonProgramStatus;
    connection: Connection;
    events: InstructionEvents;
    solanaOptions: SendOptions;
    constructor(options: InstructionParams);
    get erc20ForSPLContract(): Contract;
    get neonWrapperContract(): Contract;
    get solana(): any;
    get solanaWalletPubkey(): PublicKey;
    get solanaWalletSigner(): Account;
    neonAccountAddress(neonWallet: string): Promise<[PublicKey, number]>;
    getNeonAccount(neonAssociatedKey: PublicKey): Promise<AccountInfo<Buffer> | null>;
    createAccountV3Instruction(solanaWallet: PublicKey, neonWalletPDA: PublicKey, neonWallet: string): TransactionInstruction;
    getAssociatedTokenAddress(mintPubkey: PublicKey, walletPubkey: PublicKey): Promise<PublicKey>;
    approveDepositInstruction(walletPubkey: PublicKey, neonPDAPubkey: PublicKey, associatedTokenPubkey: PublicKey, amount: number | bigint): TransactionInstruction;
    createApproveSolanaData(solanaWallet: PublicKey, splToken: SPLToken, amount: number | bigint | string): string;
    ethereumTransaction(amount: number | bigint | string, token: SPLToken): TransactionConfig;
    emitFunction: (functionName?: Function, ...args: any[]) => void;
}
