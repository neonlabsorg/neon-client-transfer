/// <reference types="node" />
import { AccountInfo, Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import Web3 from 'web3';
import { Account, TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { NeonProxyRpcApi } from '../api';
import { InstructionEvents, InstructionParams, NeonProgramStatus, SPLToken } from '../models';
export declare class InstructionService {
    solanaWalletAddress: PublicKey;
    neonWalletAddress: string;
    web3: Web3;
    proxyApi: NeonProxyRpcApi;
    proxyStatus: NeonProgramStatus;
    connection: Connection;
    events: InstructionEvents;
    constructor(options: InstructionParams);
    get erc20ForSPLContract(): Contract;
    get neonWrapperContract(): Contract;
    get solana(): any;
    get solanaWalletPubkey(): PublicKey;
    get solanaWalletSigner(): Account;
    get neonAccountAddress(): Promise<[PublicKey, number]>;
    getNeonAccount(neonAssociatedKey: PublicKey): Promise<AccountInfo<Buffer> | null>;
    neonAccountInstruction(): Promise<TransactionInstruction>;
    approveDepositInstruction(solanaPubkey: PublicKey, neonPDAPubkey: PublicKey, token: SPLToken, amount: number): Promise<{
        associatedTokenAddress: PublicKey;
        createApproveInstruction: TransactionInstruction;
    }>;
    _computeWithdrawEthTransactionData(amount: number, splToken: SPLToken): string;
    createApproveSolanaData(solanaWallet: PublicKey, splToken: SPLToken, amount: number): string;
    getEthereumTransactionParams(amount: number, token: SPLToken): TransactionConfig;
    emitFunction: (functionName?: Function, ...args: any[]) => void;
}
