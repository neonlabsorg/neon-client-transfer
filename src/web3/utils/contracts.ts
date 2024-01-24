import { Contract } from 'web3-eth-contract';
import { Web3Context } from 'web3-core';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';

export function erc20ForSPLContract(proxyUrl: string): Contract<typeof erc20Abi> {
  return new Contract(erc20Abi, new Web3Context(proxyUrl));
}

export function neonWrapperContract(proxyUrl: string): Contract<typeof neonWrapperAbi> {
  return new Contract(neonWrapperAbi, new Web3Context(proxyUrl));
}

export function neonWrapper2Contract(proxyUrl: string, address: string): Contract<typeof neonWrapper2Abi> {
  return new Contract(neonWrapper2Abi, address, new Web3Context(proxyUrl));
}
