import { ChainId } from '../models';
import { SPLToken } from '../../../models';
import { NEON_TOKEN_MINT, NEON_TOKEN_MINT_DECIMALS } from '../../../data';

export const NEON_PRIVATE = '0x638621c19b71ea185159e5e4815a401b498446ff590f658d4fec1300521c97f5';
export const PHANTOM_PRIVATE = Uint8Array.from([
  88, 21, 69, 229, 135, 206, 172, 83, 56, 235, 253, 14, 158, 127, 2, 159, 198, 197, 164, 72, 163, 238,
  141, 130, 142, 113, 182, 157, 182, 123, 239, 71, 68, 249, 1, 38, 31, 201, 153, 57, 172, 81, 91, 99,
  61, 30, 164, 200, 58, 28, 97, 126, 4, 182, 86, 24, 163, 121, 77, 25, 112, 205, 66, 199
]);

export const NEON_CHAIN_IDS: ChainId[] = [
  { id: 111, name: 'LOCAL' },
  { id: 245022926, name: 'devnet' },
  { id: 245022940, name: 'testnet' },
  { id: 245022934, name: 'mainnet-beta' }
];

export const NEON_TOKEN_MODEL: SPLToken = {
  chainId: 0,
  address_spl: NEON_TOKEN_MINT,
  address: '',
  decimals: NEON_TOKEN_MINT_DECIMALS,
  name: 'Neon',
  symbol: 'NEON',
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/main/neon_token_md.png'
};
