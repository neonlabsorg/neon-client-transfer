import { Contract } from 'web3-eth-contract';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';
export declare function erc20ForSPLContract(proxyUrl: string): Contract<typeof erc20Abi>;
export declare function neonWrapperContract(proxyUrl: string): Contract<typeof neonWrapperAbi>;
export declare function neonWrapper2Contract(proxyUrl: string, address: string): Contract<typeof neonWrapper2Abi>;
