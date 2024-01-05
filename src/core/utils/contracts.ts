import { Contract as EthersProjectContract } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';
import { Interface } from '@ethersproject/abi';
import { Contract as Web3Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import Web3 from 'web3';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';

export type BaseWeb3Contract = Web3Contract | Interface;

export type BaseEthersContract = EthersProjectContract | Web3Contract;

export interface Contracts<BaseContract> {
  erc20ForSPLContract: BaseContract
  neonWrapperContract: BaseContract
  neonWrapper2Contract: (address: string, signer?: Signer) => BaseContract
}

export function getContracts<T>(i?: T): Contracts<BaseWeb3Contract | BaseEthersContract> {
  if (i instanceof Web3) {
    return {
      erc20ForSPLContract: new (i as Web3).eth.Contract(erc20Abi as AbiItem[]),
      neonWrapperContract: new (i as Web3).eth.Contract(neonWrapperAbi as AbiItem[]),
      neonWrapper2Contract: (address: string) => new (i as Web3).eth.Contract(neonWrapper2Abi as AbiItem[], address),
    }
  }

  return {
    erc20ForSPLContract: new Interface(erc20Abi),
    neonWrapperContract: new Interface(neonWrapperAbi),
    neonWrapper2Contract: (address: string, signer?: Signer) => new EthersProjectContract(address, neonWrapper2Abi, signer),
  }
}
