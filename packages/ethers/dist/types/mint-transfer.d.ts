import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Amount, NeonProgramStatus, SPLToken, NeonProxyRpcApi } from "@neonevm-token-transfer/core";
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
export declare function neonTransferMintTransactionEthers(connection: Connection, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Wallet, splToken: SPLToken, amount: Amount, chainId: number): Promise<any>;
export declare function createMintNeonTransactionEthers(provider: JsonRpcProvider, neonWallet: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount, gasLimit?: number): Promise<TransactionRequest>;
export declare function createWrapAndTransferSOLTransaction(connection: Connection, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Wallet, splToken: SPLToken, amount: number, chainId?: number): Promise<Transaction>;
