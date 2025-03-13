import type { SPLToken } from '@neonevm/token-transfer-core';
import { NEON_TOKEN_MINT_DECIMALS } from '@neonevm/token-transfer-core';
import type { NetworkUrl } from '@/types';

export const NEON_CHAIN_IDS: {
  id: number;
  name: string;
}[] = [
  { id: 111, name: 'LOCAL' },
  { id: 245022926, name: 'devnet' },
  { id: 245022940, name: 'testnet' },
  { id: 245022934, name: 'mainnet-beta' }
];

export const networkUrls: NetworkUrl[] = [
  {
    id: 245022926,
    token: 'NEON',
    solana: 'https://api.devnet.solana.com',
    neonProxy: 'https://devnet.neonevm.org'
  },
  {
    id: 245022927,
    token: 'SOL',
    solana: 'https://api.devnet.solana.com',
    neonProxy: 'https://devnet.neonevm.org/sol'
  }
];

export const NEON_TOKEN_MODEL: SPLToken = {
  chainId: 0,
  address_spl: '',
  address: '',
  decimals: NEON_TOKEN_MINT_DECIMALS,
  name: 'Neon',
  symbol: 'NEON',
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/main/neon_token_md.png'
};

export const SOL_TOKEN_MODEL: SPLToken = {
  name: 'Solana SOL',
  symbol: 'SOL',
  logoURI:
    'https://raw.githubusercontent.com/neonlabsorg/token-list/master/assets/solana-sol-logo.svg'
} as SPLToken;

export const supportedTokens = ['wSOL', 'USDT', 'USDC'];

export const CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || 'devnet';

export const SOLANA_PRIVATE: string = import.meta.env.VITE_SOLANA_PRIVATE;
export const NEON_PRIVATE: string = `0x${import.meta.env.VITE_NEON_PRIVATE}`;
export const CHAIN_ID: number =
  NEON_CHAIN_IDS.find((chain) => chain.name === CHAIN_NAME)?.id || NEON_CHAIN_IDS[1].id;
