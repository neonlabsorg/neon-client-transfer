import { NeonProxyRpcApi } from '../../../api';
import { NeonProgramStatus } from '../../../models';
import { PublicKey } from '@solana/web3.js';
import Web3 from 'web3';
import { TOKEN_LIST_DEVNET_SNAPSHOT } from '../../../data';

export const W3 = require('web3');

export async function getMultiTokenProxy(proxyUrl: string, solanaUrl: string, chainId: number): Promise<{
  proxyRpc: NeonProxyRpcApi;
  proxyStatus: NeonProgramStatus;
  evmProgramAddress: PublicKey;
  tokenMintAddress: PublicKey;
  web3: Web3;
}> {
  const proxyRpc = new NeonProxyRpcApi({ solanaRpcApi: solanaUrl, neonProxyRpcApi: proxyUrl });
  const proxyStatus = await proxyRpc.evmParams();
  const tokensList = (await proxyRpc.nativeTokenList()) || TOKEN_LIST_DEVNET_SNAPSHOT;
  const gasToken = tokensList.find(i => parseInt(i.token_chain_id, 16) === chainId)!;
  const web3 = new W3(new W3.providers.HttpProvider(proxyUrl));
  const evmProgramAddress = new PublicKey(proxyStatus.NEON_EVM_ID);
  const tokenMintAddress = new PublicKey(gasToken.token_mint);
  return { proxyRpc, proxyStatus, web3, evmProgramAddress, tokenMintAddress };
}
