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
  NEON_ACCOUNT_SEED_VERSION: number;
  NEON_EVM_ID: string;
  NEON_EVM_STEPS_LAST_ITERATION_MAX: number;
  NEON_EVM_STEPS_MIN: number;
  NEON_GAS_LIMIT_MULTIPLIER_NO_CHAINID: number;
  NEON_HOLDER_MSG_SIZE: number;
  NEON_OPERATOR_PRIORITY_SLOTS: string;
  NEON_PAYMENT_TO_TREASURE: number;
  NEON_STORAGE_ENTRIES_IN_CONTRACT_ACCOUNT: number;
  NEON_TREASURY_POOL_COUNT: number;
  NEON_TREASURY_POOL_SEED: string;
  NEON_PKG_VERSION?: string;
  NEON_POOL_COUNT?: string;
  NEON_POOL_SEED?: string;
  NEON_REQUEST_UNITS_ADDITIONAL_FEE?: string;
  NEON_REVISION?: string;
  NEON_SEED_VERSION?: string;
  NEON_STATUS_NAME?: string;
  NEON_TOKEN_MINT?: string;
  NEON_TOKEN_MINT_DECIMALS?: string;
  NEON_PAYMENT_TO_DEPOSIT?: string;
  NEON_HEAP_FRAME?: string;
  NEON_ADDITIONAL_FEE?: string;
  NEON_CHAIN_ID?: string;
  NEON_COMPUTE_BUDGET_HEAP_FRAME?: string;
  NEON_COMPUTE_BUDGET_UNITS?: string;
  NEON_COMPUTE_UNITS?: string;
}

export interface NeonProgramStatusV2 {
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

