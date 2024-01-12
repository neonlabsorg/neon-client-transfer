import { Contract } from '@ethersproject/contracts';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data/abi';
import { Signer } from '@ethersproject/abstract-signer';
import { Interface } from '@ethersproject/abi';

export function erc20ForSPLContract(): Interface {
  return new Interface(erc20Abi);
}

export function neonWrapperContract(): Interface {
  return new Interface(neonWrapperAbi);
}

export function neonWrapper2Contract(
  signer: Signer,
  address: string
): Contract {
  return new Contract(address, neonWrapper2Abi, signer);
}
