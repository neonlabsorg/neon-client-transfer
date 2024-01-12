import { getContracts } from '../utils';
import { Contract as Web3Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { PublicKey } from '@solana/web3.js';
import { Amount, SPLToken } from '../../models';
import { Interface } from '@ethersproject/abi';
import { toWei } from 'web3-utils';
import { TransactionRequest, TransactionResponse } from '@ethersproject/providers';
import { Signer } from '@ethersproject/abstract-signer';
import { Contract as EthersProjectContract } from '@ethersproject/contracts';
import { parseUnits } from '@ethersproject/units';
import { toFullAmount } from '../../utils';
import { Wallet } from '@ethersproject/wallet';
import { Transaction as TransactionConfig } from 'web3-types';
import { ContractAbi } from 'web3-types';
import { BigNumber } from '@ethersproject/bignumber';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';

export interface ContractMethods<Response = any> {
  claimTransactionData: (associatedToken: PublicKey, neonWallet: string, amount: Amount) => string;
  mintNeonTransactionData?: (associatedToken: PublicKey, splToken: SPLToken, amount: Amount) => string;
  neonTransactionData?: (solanaWallet: PublicKey) => string;
  wrappedNeonTransactionData?: (token: SPLToken, amount: Amount, signer?: Signer) => Response;
}

// export function useContractMethods(web3: Web3): ContractMethods<string | Promise<TransactionResponse>> {
//   const contracts = getContracts(web3);
//
//     return {
//       claimTransactionData: (associatedToken: PublicKey, neonWallet: string, amount: Amount): string => {
//         const claimTo = (contracts.erc20ForSPLContract as Web3Contract<typeof erc20Abi>).methods.claimTo(associatedToken.toBuffer(), neonWallet, amount);
//         return claimTo.encodeABI();
//       },
//       mintNeonTransactionData: (associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string => {
//         const fullAmount = toFullAmount(amount, splToken.decimals);
//         return (contracts.erc20ForSPLContract as Web3Contract<typeof erc20Abi>).methods.transferSolana(associatedToken.toBuffer(), fullAmount).encodeABI();
//       },
//       neonTransactionData: (solanaWallet: PublicKey): string => {
//         return (contracts.neonWrapperContract as Web3Contract<typeof neonWrapperAbi>).methods.withdraw(solanaWallet.toBuffer()).encodeABI();
//       },
//       wrappedNeonTransactionData: (token: SPLToken, amount: Amount): string => {
//         const value = toWei(amount.toString(), 'ether');
//         return (contracts.neonWrapper2Contract(token.address) as Web3Contract<typeof neonWrapper2Abi>).methods.withdraw(value).encodeABI();
//       }
//     };
//
//   // return {
//   //   claimTransactionData: (associatedToken: PublicKey, neonWallet: string, amount: Amount): string => {
//   //     const fullAmount = BigNumber.from(amount);
//   //     return (contracts.erc20ForSPLContract as Interface).encodeFunctionData('claimTo', [
//   //       associatedToken.toBuffer(),
//   //       neonWallet,
//   //       fullAmount
//   //     ]);
//   //   },
//   //   mintNeonTransactionData: (associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string => {
//   //     const fullAmount = parseUnits(amount.toString(), splToken.decimals);
//   //     return (contracts.erc20ForSPLContract as Interface).encodeFunctionData('transferSolana', [
//   //       associatedToken.toBuffer(),
//   //       fullAmount
//   //     ]);
//   //   },
//   //   neonTransactionData: (solanaWallet: PublicKey): string => {
//   //     return (contracts.neonWrapperContract as Interface).encodeFunctionData('withdraw', [
//   //       solanaWallet.toBuffer()
//   //     ]);
//   //   },
//   //   wrappedNeonTransactionData: async (token: SPLToken, amount: Amount, signer?: Signer): Promise<TransactionResponse> => {
//   //     return await (contracts.neonWrapper2Contract(token.address, signer) as EthersProjectContract).withdraw(
//   //       parseUnits(amount.toString(), token.decimals)
//   //     );
//   //   }
//   // };
// }

export async function useTransactionFromSignerEthers(
  claimData: string,
  walletSigner: Wallet,
  address: string
): Promise<TransactionRequest> {
  const transaction: TransactionRequest = {
    data: claimData,
    gasLimit: `0x5F5E100`, // 100000000
    gasPrice: `0x0`,
    to: address // contract address
  };
  transaction.nonce = await walletSigner.getTransactionCount();
  return transaction;
}

export function useTransactionFromSignerWeb3(
  climeData: string, neonWallet: string, splToken: SPLToken
): TransactionConfig {
  return {
    data: climeData,
    gas: `0x5F5E100`, // 100000000
    gasPrice: `0x0`,
    from: neonWallet,
    to: splToken.address // contract address
  };
}
