import { Big } from 'big.js';

export type NetworkUrl = {
  id: number;
  token: string;
  solana: string;
  neonProxy: string;
};

export type TransferSignature = {
  neon?: string;
  solana?: string;
};

export interface TransferDirection {
  direction: 'solana' | 'neon';
  from: string;
  to: string;
}

export interface TokenBalance {
  neon: Big | undefined;
  solana: Big | undefined;
}
