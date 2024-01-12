import { Contract } from 'web3-eth-contract';
import { ContractAbi } from 'web3-types';
import Web3 from 'web3';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';

export function erc20ForSPLContractWeb3(web3: Web3): Contract<ContractAbi> {
  return new web3.eth.Contract(erc20Abi as ContractAbi);
}

export function neonWrapperContractWeb3(web3: Web3): Contract<ContractAbi> {
  return new web3.eth.Contract(neonWrapperAbi as ContractAbi);
}

export function neonWrapper2ContractWeb3(web3: Web3, address: string): Contract<ContractAbi> {
  return new web3.eth.Contract(neonWrapper2Abi as ContractAbi, address);
}
