import { PublicKey } from '@solana/web3.js';
import { NeonProxyRpcApi } from '../../../api';
import { GasToken, GasTokenData, MultiTokenProxy } from '../../../models';
import { TOKEN_LIST_DEVNET_SNAPSHOT } from '../../../data';
import Web3 from 'web3';
import HttpProvider from "web3-providers-http";
import { JsonRpcProvider } from '@ethersproject/providers';

export async function getMultiTokenProxy(proxyUrl: string, solanaUrl: string): Promise<MultiTokenProxy> {
  const proxyRpc = new NeonProxyRpcApi({ solanaRpcApi: solanaUrl, neonProxyRpcApi: proxyUrl });
  const proxyStatus = await proxyRpc.evmParams();
  const tokensList = (await proxyRpc.nativeTokenList()) || TOKEN_LIST_DEVNET_SNAPSHOT;
  const evmProgramAddress = new PublicKey(proxyStatus.NEON_EVM_ID);
  return { proxyRpc, proxyStatus, tokensList, evmProgramAddress };
}

export function getWeb3Provider(proxyUrl: string): Web3<any> {
  return new Web3(new HttpProvider(proxyUrl));
}

export function getEthersProvider(proxyUrl: string): JsonRpcProvider {
  return new JsonRpcProvider(proxyUrl);
}

export function getGasToken(tokenList: GasToken[], chainId: number): GasTokenData {
  const gasToken = tokenList.find(i => parseInt(i.token_chain_id, 16) === chainId)!;
  const tokenMintAddress = new PublicKey(gasToken.token_mint);
  return { gasToken, tokenMintAddress };
}
