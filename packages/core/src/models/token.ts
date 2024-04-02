import { BigNumber } from '@ethersproject/bignumber';

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
