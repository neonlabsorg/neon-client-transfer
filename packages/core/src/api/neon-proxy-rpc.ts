import { GasToken, GasTokenV2, NeonEmulate, NeonProgramStatus, RPCResponse } from '../models';

export class NeonProxyRpcApi {
  /**
   * The URL of the Neon Proxy RPC.
   */
  neonProxyRpcUrl = '';

  /**
   * Creates an instance of NeonProxyRpcApi.
   *
   * @param url - The base URL for the Neon Proxy RPC.
   */
  constructor(url: string) {
    this.neonProxyRpcUrl = url ?? '';
  }

  /**
   * Makes an RPC request to a specified URL.
   *
   * @param url - The URL to make the RPC request to.
   * @param method - The RPC method name.
   * @param params - The parameters for the RPC method.
   * @returns A promise that resolves to the response of the RPC request.
   * @template T - The expected type of the response result.
   */
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

  /**
   * Makes a proxy request using the configured Neon Proxy RPC URL.
   *
   * @param method - The RPC method name.
   * @param params - The parameters for the RPC method.
   * @returns A promise that resolves to the response of the proxy RPC request.
   * @template T - The expected type of the response result.
   */
  async proxy<T>(method: string, params: unknown[] = []): Promise<RPCResponse<T>> {
    return this.rpc<T>(this.neonProxyRpcUrl, method, params);
  }

  /**
   * Emulates a Neon transaction using the `neon_emulate` method.
   *
   * @param params - The parameters for the emulation, typically transaction data.
   * @returns A promise that resolves to the result of the Neon emulation.
   */
  async neonEmulate(params: string[] = []): Promise<NeonEmulate> {
    return this.proxy<NeonEmulate>('neon_emulate', params).then(d => d.result);
  }

  /**
   * Fetches the EVM parameters from the Neon Proxy RPC.
   *
   * @returns A promise that resolves to a set of Neon program status parameters.
   */
  async evmParams(): Promise<Partial<NeonProgramStatus>> {
    return this.proxy<NeonProgramStatus>('neon_getEvmParams', []).then(({ result }) => result);
  }

  /**
   * Fetches the list of gas tokens with chain ID's related to the particular gas token supported by the Neon EVM.
   *
   * @returns A promise that resolves to an array of GasToken objects.
   */
  async gasTokenList(): Promise<GasToken[]> {
    return this.proxy<GasTokenV2[]>('neon_getGasTokenList', []).then(({ result }) => result);
  }

  /**
   * Fetches the list of native tokens and their chain ID's supported by the Neon EVM.
   *
   * @returns A promise that resolves to an array of GasToken objects.
   */
  async nativeTokenList(): Promise<GasToken[]> {
    return this.proxy<GasTokenV2[]>('neon_getNativeTokenList', []).then(({ result }) => result);
  }
}
