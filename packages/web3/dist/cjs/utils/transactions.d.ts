import { PublicKey } from '@solana/web3.js';
import { Amount, SPLToken } from '@neonevm-token-transfer/core';
import { Transaction as TransactionConfig } from 'web3-types';
import { GasInterface, GasPriceInterface } from './types';
import { SignTransactionResult, Web3Account } from "web3-eth-accounts";
export declare function claimTransactionData(proxyUrl: string, associatedToken: PublicKey, neonWallet: string, amount: Amount): string;
export declare function neonTransactionData(proxyUrl: string, solanaWallet: PublicKey): string;
export declare function mintNeonTransactionData(proxyUrl: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string;
export declare function wrappedNeonTransactionData(proxyUrl: string, token: SPLToken, amount: Amount): string;
export declare function neonClaimTransactionFromSigner(climeData: string, walletSigner: Web3Account, neonWallet: string, splToken: SPLToken, proxyUrl: string): Promise<SignTransactionResult>;
export declare function getGasAndEstimationGasPrice(proxyUrl: string, transaction: TransactionConfig): Promise<GasInterface & GasPriceInterface>;
export declare function getGasLimit(gas: bigint, gasLimit: bigint): bigint;
