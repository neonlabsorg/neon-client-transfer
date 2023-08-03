import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';
export function erc20ForSPLContract(web3) {
    return new web3.eth.Contract(erc20Abi);
}
export function neonWrapperContract(web3) {
    return new web3.eth.Contract(neonWrapperAbi);
}
export function neonWrapper2Contract(web3, address) {
    return new web3.eth.Contract(neonWrapper2Abi, address);
}
//# sourceMappingURL=contracts.js.map