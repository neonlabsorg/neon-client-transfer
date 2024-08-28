import { GasToken, GasTokenV2, NeonEmulate, NeonProgramStatus, RPCResponse } from '../models';

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
    return this.proxy<NeonProgramStatus>('neon_getEvmParams', []).then(({ result }) => result);
  }

  async gasTokenList(): Promise<GasToken[]> {
    return this.proxy<GasTokenV2[]>('neon_getGasTokenList', []).then(({ result }) => result);
  }

  async nativeTokenList(): Promise<GasToken[]> {
    return this.proxy<GasTokenV2[]>('neon_getNativeTokenList', []).then(({ result }) => result);
  }
}
