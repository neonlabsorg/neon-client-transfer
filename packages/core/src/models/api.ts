import {AccountMeta, Connection, PublicKey} from '@solana/web3.js';
import { NeonProxyRpcApi } from '../api';
import {GasToken, SPLToken} from './token';
import { SignTransactionResult } from '../utils';

export const enum ProxyStatus {
  unknown = 'UNKNOWN',
  work = 'WORK',
  stop = 'EMERGENCY'
}

export interface RPCResponse<T> {
  id: number | string;
  jsonrpc: string;
  result: T;
}

export interface SettingsFormState {
  solanaRpcApi: string;
  neonProxyRpcApi: string;
}

export type NeonHeapFrame = string;
export type NeonComputeUnits = string;

export interface NeonProgramStatus {
  neonAccountSeedVersion: number;
  neonMaxEvmStepsInLastIteration: number;
  neonMinEvmStepsInIteration: number;
  neonGasLimitMultiplierWithoutChainId: number;
  neonHolderMessageSize: number;
  neonPaymentToTreasury: number;
  neonStorageEntriesInContractAccount: number;
  neonTreasuryPoolCount: number;
  neonTreasuryPoolSeed: string;
  neonEvmProgramId: string;
}

export interface ChainId {
  id: number;
  name: string;
}

export interface NeonEmulate {
  exitCode: 'succeed';
  result: string;
  numEvmSteps: number;
  gasUsed: number;
  numIterations: number;
  solanaAccounts: SolanaAccount[];
  accounts?: NeonAccounts[];
}

export interface SolanaAccount {
  pubkey: string;
  isWritable: boolean;
  isLegacy: boolean;
}

export interface NeonAccounts {
  account: string;
  contract: string;
}

export interface ClaimInstructionResult<R = SignTransactionResult> {
  neonTransaction?: R;
  neonKeys: AccountMeta[];
  legacyAccounts: SolanaAccount[];
}

export interface MultiTokenProxy {
  proxyRpc: NeonProxyRpcApi;
  proxyStatus: Partial<NeonProgramStatus>;
  tokensList: GasToken[];
  evmProgramAddress: PublicKey;
}

export interface GasTokenData {
  tokenMintAddress: PublicKey;
  gasToken: GasToken;
}

export interface EthersSignedTransaction {
  rawTransaction: string;
}

export interface ClaimInstructionConfig<T> {
  proxyApi: NeonProxyRpcApi;
  neonTransaction: T | any;
  connection: Connection;
  signerAddress: string;
  neonEvmProgram: PublicKey;
  splToken: SPLToken;
  associatedTokenAddress: PublicKey;
  fullAmount: bigint
}

export interface SourceSplAccountConfig {
  connection: Connection;
  signerAddress: string;
  neonEvmProgram: PublicKey;
  splToken: SPLToken;
  fullAmount: bigint;
  associatedTokenAddress: PublicKey;
}

