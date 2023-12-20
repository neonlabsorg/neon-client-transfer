export class NeonProxyRpcApi {
    constructor(params) {
        this.neonProxyRpcApi = '';
        this.solanaRpcApi = '';
        this.neonProxyRpcApi = params.neonProxyRpcApi ?? '';
        this.solanaRpcApi = params.solanaRpcApi ?? '';
    }
    async rpc(url, method, params = []) {
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
    async proxy(method, params = []) {
        return this.rpc(this.neonProxyRpcApi, method, params);
    }
    async solana(method, params = []) {
        return this.rpc(this.solanaRpcApi, method, params);
    }
    async neonEmulate(params = []) {
        return this.proxy('neon_emulate', params).then(d => d.result);
    }
    async evmParams() {
        return this.proxy('neon_getEvmParams', []).then(d => d.result);
    }
    async gasTokenList() {
        return this.proxy('neon_getGasTokenList', []).then(d => d.result);
    }
    async nativeTokenList() {
        return this.proxy('neon_getNativeTokenList', []).then(d => d.result);
    }
}
//# sourceMappingURL=neon-proxy-rpc.js.map