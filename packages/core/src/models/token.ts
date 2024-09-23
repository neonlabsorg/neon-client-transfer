import {
  AccountInfo,
  PublicKey
} from '@solana/web3.js';

export interface SPLToken {
  address: string;
  address_spl: string;
  chainId: number;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
}

export interface GasToken {
  tokenName: string;
  tokenMint: string;
  tokenChainId: `0x${string}`;
}

export interface GasTokenV2 {
  tokenName: string;
  tokenMint: string;
  tokenChainId: `0x${string}`;
}

export type Amount = number | bigint | string;

export type NeonAddress = `0x${string}` | string;

export type ExtendedAccountInfo = Omit<AccountInfo<Buffer>, 'owner' | 'data' | 'rentEpoch'> & {
  owner: string;
  data: string;
  rentEpoch: number;
};

export interface SolanaOverrides {
  solanaOverrides: Record<string, ExtendedAccountInfo>;
}
