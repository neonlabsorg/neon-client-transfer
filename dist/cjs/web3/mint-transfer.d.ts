import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Transaction as TransactionConfig } from 'web3-types';
import { Web3Account } from 'web3-eth-accounts';
import { NeonProxyRpcApi } from '../api';
import { Amount, NeonProgramStatus, SPLToken } from '../models';
export declare function neonTransferMintTransactionWeb3(connection: Connection, proxyUrl: string, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Web3Account, splToken: SPLToken, amount: Amount, chainId: number): Promise<any>;
export declare function createMintNeonTransactionWeb3(proxyUrl: string, neonWallet: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount, gasLimit?: number): Promise<TransactionConfig>;
export declare function createWrapAndTransferSOLTransaction(connection: Connection, proxyUrl: string, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Web3Account, splToken: SPLToken, amount: number, chainId?: number): Promise<Transaction>;
