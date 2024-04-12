import { BigNumber } from '@ethersproject/bignumber';
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

export type Amount = number | bigint | string | BigNumber;

export type NeonAddress = `0x${string}` | string;

export type ExtendedAccountInfo = Omit<AccountInfo<Buffer>, 'owner' | 'data' | 'rentEpoch'> & {
  owner: string;
  data: string;
  rent_epoch: number;
};

export interface SolanaOverrides {
  solana_overrides: Record<string, ExtendedAccountInfo>;
}
