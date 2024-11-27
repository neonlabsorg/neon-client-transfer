import { AccountInfo } from '@solana/web3.js';

/**
 *  Represents a **SPL Token** used within Solana and Neon ecosystems.
 */
export interface SPLToken {
  /**
   *  The ERC20 address of the token contract in the Neon EVM.
   */
  address: string;

  /**
   *  The token's address on the Solana chain.
   */
  address_spl: string;

  /**
   *  The chain ID where the token is deployed.
   */
  chainId: number;

  /**
   *  The number of decimals used for token representation.
   */
  decimals: number;

  /**
   *  The URI for the token's logo image.
   */
  logoURI: string;

  /**
   *  The name of the token (e.g., "NEON").
   */
  name: string;

  /**
   *  The symbol of the token (e.g., "NEON").
   */
  symbol: string;
}

/**
 *  Represents a **Gas Token** used to pay for transaction fees.
 */
export interface GasToken {
  /**
   *  The name of the token (e.g., "SOL").
   */
  tokenName: string;

  /**
   *  The mint address of the token used for gas payments.
   */
  tokenMint: string;

  /**
   *  The chain ID of the network where the gas token is used, represented as a hexadecimal string.
   */
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
