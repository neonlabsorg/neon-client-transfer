import { AccountMeta } from '@solana/web3.js';
import { SignedTransaction } from 'web3-core';

export interface ChainId {
  id: number;
  name: string;
}

export interface NeonEmulate {
  exit_status: 'succeed';
  result: string;
  steps_executed: number;
  used_gas: number;
  iterations: number;
  solana_accounts: SolanaAccount[];
  accounts?: NeonAccounts[];
}

export interface SolanaAccount {
  pubkey: string;
  is_writable: boolean;
  is_legacy: boolean;
}

export interface NeonAccounts {
  account: string;
  contract: string;
}

export interface ClaimInstructionResult {
  neonTransaction: SignedTransaction;
  neonKeys: AccountMeta[];
  legacyAccounts: SolanaAccount[];
}
