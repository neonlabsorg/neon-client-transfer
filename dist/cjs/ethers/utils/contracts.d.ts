import { Contract } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';
import { Interface } from '@ethersproject/abi';
export declare function erc20ForSPLContract(): Interface;
export declare function neonWrapperContract(): Interface;
export declare function neonWrapper2Contract(signer: Signer, address: string): Contract;
