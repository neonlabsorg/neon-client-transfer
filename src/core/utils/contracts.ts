import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import Web3 from 'web3';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';

export function erc20ForSPLContract(web3: Web3): Contract {
  return new web3.eth.Contract(erc20Abi as AbiItem[]);
}

export function neonWrapperContract(web3: Web3): Contract {
  return new web3.eth.Contract(neonWrapperAbi as AbiItem[]);
}

export function neonWrapper2Contract(web3: Web3, address: string): Contract {
  return new web3.eth.Contract(neonWrapper2Abi as AbiItem[], address);
}
