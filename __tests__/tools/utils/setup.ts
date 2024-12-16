import { SPLToken } from '@neonevm/token-transfer-core';
import bs58 from 'bs58';
import { deployErc20ForSplWrapper, mintSplToken } from '../scripts';
import { customSplToken } from '../artifacts';

export async function setupResourceForSpl(chainId: number, proxyUrl: string, factoryAddress: string): Promise<SPLToken | null> {
  const tokenMint = await mintSplToken();
  const token = { ...customSplToken, chainId };

  if (tokenMint) {
    token.address_spl = tokenMint;

    const ecr20Address = await deployErc20ForSplWrapper(factoryAddress, proxyUrl, tokenMint);
    token.address = ecr20Address ?? '0x';
    return token;
  }
  return null;
}

export function base58ToHex(mint: string): string {
  const bytes = bs58.decode(mint);
  const bytes32Value = Buffer.from(bytes);
  return `0x${bytes32Value.toString('hex')}`;
}
