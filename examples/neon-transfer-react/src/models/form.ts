import Big from 'big.js';

export interface TransferDirection {
  direction: 'solana' | 'neon';
  from: string;
  to: string;
}

export interface TokenBalance {
  neon: Big;
  solana: Big;
}

export interface TransferSignature {
  neon?: string;
  solana?: string;
}

export type TransactionFunction = () => Promise<any>;

export type SplTokenSymbol = 'NEON' | 'SOL' | 'wSOL' | 'DEFAULT';

export type TransactionFunctionsMap = {
  DEFAULT: TransactionFunction;
} & Partial<Record<Exclude<SplTokenSymbol, 'DEFAULT'>, TransactionFunction>>;
