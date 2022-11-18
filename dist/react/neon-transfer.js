import { NeonProxyRpcApi } from '../api';
import { MintPortal, NeonPortal } from '../core';
import { useProxyInfo } from './proxy-status';
const urls = process.env.REACT_APP_URLS ? JSON.parse(process.env.REACT_APP_URLS) : {
    solanaRpcApi: 'https://api.devnet.solana.com',
    neonProxyRpcApi: 'https://proxy.devnet.neonlabs.org/solana'
};
export const proxyApi = new NeonProxyRpcApi({
    solanaRpcApi: urls.solanaRpcApi,
    neonProxyRpcApi: urls.neonProxyRpcApi
});
export function useNeonTransfer(events, connection, web3, publicKey, neonWalletAddress) {
    const proxyStatus = useProxyInfo(proxyApi);
    const options = {
        connection: connection,
        solanaWalletAddress: publicKey,
        neonWalletAddress,
        web3,
        proxyApi: proxyApi,
        proxyStatus: proxyStatus
    };
    const neonPortal = new NeonPortal(options);
    const mintPortal = new MintPortal(options);
    const portalInstance = (addr) => {
        return proxyStatus.NEON_TOKEN_MINT === addr ? neonPortal : mintPortal;
    };
    const getEthereumTransactionParams = (amount, splToken) => {
        const portal = portalInstance(splToken.address_spl);
        return portal.getEthereumTransactionParams.call(portal, amount, splToken);
    };
    const deposit = (amount, splToken) => {
        const portal = portalInstance(splToken.address_spl);
        return portal.createNeonTransfer.call(portal, amount, splToken, events);
    };
    const withdraw = (amount, splToken) => {
        const portal = portalInstance(splToken.address_spl);
        return portal.createSolanaTransfer.call(portal, amount, splToken, events);
    };
    return { deposit, withdraw, getEthereumTransactionParams, proxyStatus };
}
//# sourceMappingURL=neon-transfer.js.map