import { SPLToken } from '@neonevm/token-transfer-core';
import { mintSplToken } from "../scripts/mintSplToken";

export async function setupResourceForSpl(chainId: number): Promise<SPLToken | null> {
  const tokenMint = await mintSplToken();
  const token = {
    "chainId": chainId,
    "address_spl": "",
    "address": "0x",
    "decimals": 9,
    "name": "$FunGible Token 1",
    "symbol": "$FT1",
    "logoURI": "https://raw.githubusercontent.com/neonlabsorg/token-list/master/assets/ethereum-eth-logo.svg"
  } as SPLToken;

  if(tokenMint) {
    token.address_spl = tokenMint;
    //TODO: deploy ERC20ForSpl wrapper
    return token;
  }
  return null;
}
