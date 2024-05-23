import { GasToken, GasTokenV2, NeonEmulate, NeonProgramStatusV2, NeonProgramStatus, RPCResponse } from '../models';

export class NeonProxyRpcApi {
  neonProxyRpcUrl = '';

  constructor(url: string) {
    this.neonProxyRpcUrl = url ?? '';
  }

  async rpc<T>(url: string, method: string, params: unknown[] = []): Promise<RPCResponse<T>> {
    const id = Date.now();
    const body = { id, jsonrpc: '2.0', method, params };
    console.log('POST', url, JSON.stringify(body));
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(body)
    });
    return await response.json();
  }

  async proxy<T>(method: string, params: unknown[] = []): Promise<RPCResponse<T>> {
    return this.rpc<T>(this.neonProxyRpcUrl, method, params);
  }

  async neonEmulate(params: string[] = []): Promise<NeonEmulate> {
    return this.proxy<NeonEmulate>('neon_emulate', params).then(d => d.result);
  }

  async evmParams(): Promise<Partial<NeonProgramStatus>> {
    return this.proxy<NeonProgramStatusV2>('neon_getEvmParams', []).then(d => {
      //Use data mapper
      return {
        NEON_ACCOUNT_SEED_VERSION: d.result.neonAccountSeedVersion,
        NEON_EVM_ID: d.result.neonEvmProgramId,
        NEON_EVM_STEPS_LAST_ITERATION_MAX: d.result.neonMaxEvmStepsInLastIteration,
        NEON_EVM_STEPS_MIN: d.result.neonMinEvmStepsInIteration,
        NEON_GAS_LIMIT_MULTIPLIER_NO_CHAINID: d.result.neonGasLimitMultiplierWithoutChainId,
        NEON_HOLDER_MSG_SIZE: d.result.neonHolderMessageSize,
        NEON_PAYMENT_TO_TREASURE: d.result.neonPaymentToTreasury,
        NEON_STORAGE_ENTRIES_IN_CONTRACT_ACCOUNT: d.result.neonStorageEntriesInContractAccount,
        NEON_TREASURY_POOL_COUNT: d.result.neonTreasuryPoolCount,
        NEON_TREASURY_POOL_SEED: d.result.neonTreasuryPoolSeed,
      }
    });
  }

  async gasTokenList(): Promise<GasToken[]> {
    return this.proxy<GasTokenV2[]>('neon_getGasTokenList', []).then(d => {
      return d.result.map((d) => {
        return {
          tokenName: d.tokenName,
          tokenMint: d.tokenMint,
          tokenChainId: d.tokenChainID,
        };
      });
    });
  }

  async nativeTokenList(): Promise<GasToken[]> {
    return this.proxy<GasTokenV2[]>('neon_getNativeTokenList', []).then(d => {
      return d.result.map((d) => {
        return {
          tokenName: d.tokenName,
          tokenMint: d.tokenMint,
          tokenChainId: d.tokenChainID,
        };
      });
    });
  }
}
