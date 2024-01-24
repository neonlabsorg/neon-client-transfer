import { Contract } from '@ethersproject/contracts';
import { Interface } from '@ethersproject/abi';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data/abi';
export function erc20ForSPLContract() {
    return new Interface(erc20Abi);
}
export function neonWrapperContract() {
    return new Interface(neonWrapperAbi);
}
export function neonWrapper2Contract(signer, address) {
    return new Contract(address, neonWrapper2Abi, signer);
}
