import bs58 from 'bs58';
import { ChainId, NEON_TOKEN_MINT_DECIMALS, SPLToken } from '@neonevm/token-transfer-core';

// export const NEON_PRIVATE = '0x7ae72c37b092c82f60b4aa17e8ab476e20d13084570d39d3ea9e17ae3c6f7752';
// export const wNEON_PRIVATE = '0xf91e9d060544ba23a059b62b8626acefd21c51c83192dcb0bbb534eb48e14159';
// export const PHANTOM_PRIVATE = decode('5pxZ7KTce51naAQYm1FaEPGRsSWuzfEX5kk7fvn2m6mjszXSQCTjPtMzetjQDWRgP4u1RrRS8jMX6m6KQDsPEWPf');

// export const NEON_PRIVATE = '0x354f08fdb16103e50bce92571a000cb418b60a4078a7d0a1fbfacd6788de5c7c';
// export const wNEON_PRIVATE = '0xf91e9d060544ba23a059b62b8626acefd21c51c83192dcb0bbb534eb48e14159';
// export const PHANTOM_PRIVATE = decode('3ZbFDfA9Qwy6o3Pcf3Jm4Vj1G8KuQpk7jigpWpefdPWWdxnQoQ8UqeQPKGAZKv2E7b1dKFiC1i3eUwxKAzEAT4k2');

export const NEON_PRIVATE = '0x0513b5249e75fde5f73999895fd624689de43d369f3d49671bfe50daadde5e89';
export const PHANTOM_PRIVATE = bs58.decode('62ugR693aB2KTQY5tJqPM7Xnw9Tr8hrsqD6NnYVzFtxnp9WLUpChGonhW9TZZwnZ8shnhsC1GCD7newabEd2odvP');

export const NEON_CHAIN_IDS: ChainId[] = [
  { id: 111, name: 'LOCAL' },
  { id: 245022926, name: 'devnet' },
  { id: 245022940, name: 'testnet' },
  { id: 245022934, name: 'mainnet-beta' }
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
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/master/assets/solana-sol-logo.svg'
} as SPLToken;

export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const customSplToken: SPLToken = {
  chainId: 111,
  address_spl: '',
  address: '0x',
  decimals: 9,
  name: '$FunGible Token 1',
  symbol: '$FT1',
  logoURI: 'https://raw.githubusercontent.com/neonlabsorg/token-list/master/assets/ethereum-eth-logo.svg'
};
