import { Contract as EthersProjectContract } from '@ethersproject/contracts';
import { Signer } from '@ethersproject/abstract-signer';
import { Interface } from '@ethersproject/abi';
import { Contract as Web3Contract } from 'web3-eth-contract';
import { ContractAbi } from 'web3-types';
import Web3 from 'web3';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';

export interface Contracts<BaseContract> {
  erc20ForSPLContract: BaseContract;
  neonWrapperContract: BaseContract;
  neonWrapper2Contract: (address: string, signer?: Signer) => BaseContract;
}

export function getContracts(web3: Web3): any {
    return {
      erc20ForSPLContract: new web3.eth.Contract(erc20Abi as ContractAbi),
      neonWrapperContract: new web3.eth.Contract(neonWrapperAbi as ContractAbi),
      neonWrapper2Contract: (address: string) => new web3.eth.Contract(neonWrapper2Abi as ContractAbi, address)
    };
  //
  // return {
  //   erc20ForSPLContract: new Interface(erc20Abi),
  //   neonWrapperContract: new Interface(neonWrapperAbi),
  //   neonWrapper2Contract: (address: string, signer?: Signer) => new EthersProjectContract(address, neonWrapper2Abi, signer)
  // };
}
