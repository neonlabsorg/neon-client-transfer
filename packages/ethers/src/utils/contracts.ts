import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '@neonevm/token-transfer-core';
import { Interface } from 'ethers';

/**
 * Returns an Ethereum `Interface` instance for interacting with an ERC-20 token contract.
 *
 * This function creates an `Interface` using the standard ERC-20 ABI, enabling interactions
 * with ERC-20 compliant tokens.
 *
 * @returns {Interface} An Ethers.js `Interface` instance for the ERC-20 contract.
 *
 * @example
 * ```typescript
 * const erc20Interface = erc20ForSPLContract();
 * erc20Interface.encodeFunctionData('transferSolana', [associatedToken.toBuffer(), fullAmount]);
 * ```
 */
export function erc20ForSPLContract(): Interface {
  return new Interface(erc20Abi);
}

/**
 * Returns an Ethereum `Interface` instance for interacting with the Neon wrapper contract.
 *
 * This function initializes an `Interface` using the Neon wrapper contract ABI,
 * enabling interactions with the Neon token contract.
 *
 * @returns {Interface} An Ethers.js `Interface` instance for the Neon wrapper contract.
 *
 * @example
 * ```typescript
 * const neonWrapper = neonWrapperContract();
 * neonWrapper.encodeFunctionData('withdraw', [solanaWallet.toBuffer()]);
 * ```
 */
export function neonWrapperContract(): Interface {
  return new Interface(neonWrapperAbi);
}

/**
 * Returns an Ethereum `Interface` instance for interacting with the wrapped Neon contract.
 * Used for withdraw wNEON from the NeonEVM to Solana.
 *
 * This function initializes an `Interface` using the wrapped Neon contract ABI,
 * allowing interactions with the wrapped Neon token contract.
 *
 *
 * @returns {Interface} An Ethers.js `Interface` instance for the wrapped Neon contract.
 *
 * @example
 * ```typescript
 * const neonWrapperV2 = neonWrapper2Contract();
 * neonWrapperV2.encodeFunctionData('withdraw', [parseUnits(amount.toString(), token.decimals)]);
 * ```
 */
export function neonWrapper2Contract(): Interface {
  return new Interface(neonWrapper2Abi);
}
