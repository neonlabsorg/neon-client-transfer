import { PublicKey } from '@solana/web3.js';
import { JsonRpcProvider } from '@ethersproject/providers';
import {
  GasToken,
  GasTokenData,
  MultiTokenProxy,
  NeonProxyRpcApi,
} from '@neonevm/token-transfer-core';
import HttpProvider from 'web3-providers-http';
import { Web3 } from 'web3';

export async function getMultiTokenProxy(proxyUrl: string): Promise<MultiTokenProxy> {
  const proxyRpc = new NeonProxyRpcApi(proxyUrl);
  const proxyStatus = await proxyRpc.evmParams();
  const tokensList = await proxyRpc.nativeTokenList();
  const evmProgramAddress = new PublicKey(proxyStatus.neonEvmProgramId!);
  return { proxyRpc, proxyStatus, tokensList, evmProgramAddress };
}

export function getWeb3Provider(proxyUrl: string): Web3<any> {
  return new Web3(new HttpProvider(proxyUrl));
}

export function getEthersProvider(proxyUrl: string): JsonRpcProvider {
  return new JsonRpcProvider(proxyUrl);
}

export function getGasToken(tokenList: GasToken[], chainId: number): GasTokenData {
  const gasToken = tokenList.find(i => parseInt(i.tokenChainId, 16) === chainId)!;
  const tokenMintAddress = new PublicKey(gasToken.tokenMint);
  return { gasToken, tokenMintAddress };
}
