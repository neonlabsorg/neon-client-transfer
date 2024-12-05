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

/**
 * Represents the status and configuration of the Neon EVM Program.
 */
export interface NeonProgramStatus {
  /**
   * The version of the Neon account seed. Used to track different versions of the account format.
   */
  neonAccountSeedVersion: number;

  /**
   * The maximum number of EVM steps allowed in the last iteration of a transaction.
   */
  neonMaxEvmStepsInLastIteration: number;

  /**
   * The minimum number of EVM steps allowed in each iteration of a transaction.
   */
  neonMinEvmStepsInIteration: number;

  /**
   * The gas limit multiplier applied when the chain ID is not specified.
   */
  neonGasLimitMultiplierWithoutChainId: number;

  /**
   * The size of the holder message, used to store temporary data during a transaction.
   */
  neonHolderMessageSize: number;

  /**
   * The amount of payment made to the treasury for a transaction.
   */
  neonPaymentToTreasury: number;

  /**
   * The number of storage entries allowed in a contract account.
   */
  neonStorageEntriesInContractAccount: number;

  /**
   * The count of treasury pools used in the Neon program.
   */
  neonTreasuryPoolCount: number;

  /**
   * The seed used for generating treasury pool addresses.
   */
  neonTreasuryPoolSeed: string;

  /**
   * The program ID of the Neon EVM program deployed on the blockchain.
   */
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

