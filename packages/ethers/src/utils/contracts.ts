import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '@neonevm/token-transfer-core';
import { Interface } from 'ethers';

export function erc20ForSPLContract(): Interface {
  return new Interface(erc20Abi);
}

export function neonWrapperContract(): Interface {
  return new Interface(neonWrapperAbi);
}

export function neonWrapper2Contract(): Interface {
  return new Interface(neonWrapper2Abi);
}
