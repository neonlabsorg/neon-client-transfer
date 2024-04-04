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

export interface ExtendedAccountInfo extends AccountInfo<Buffer> {
  delegate: PublicKey;
}
