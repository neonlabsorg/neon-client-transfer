import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { Signer } from '@ethersproject/abstract-signer';
import { BigNumber } from '@ethersproject/bignumber';
import { SPLToken } from '../../../models';
import { erc20Abi } from '../../../data';

export async function getTokenBalance(provider: JsonRpcProvider, account: string, token: SPLToken, contractAbi: any = erc20Abi): Promise<number> {
  const tokenInstance = new Contract(token.address, contractAbi, provider);
  const balance = await tokenInstance.balanceOf(account);
  return balance.toNumber() / Math.pow(10, token.decimals);
}

export function walletSigner(provider: JsonRpcProvider, pk: string): Wallet {
  return new Wallet(pk, provider);
}

export async function sendNeonTransactionEthers(
  transaction: TransactionRequest,
  signer: Signer
): Promise<string> {
  const receipt = await signer.sendTransaction(transaction);
  return receipt.hash;
}

export async function estimateGas(provider: JsonRpcProvider, transaction: TransactionRequest, gasLimit = 5e4) {
  const gasEstimate = await provider.estimateGas(transaction);
  return gasEstimate.gt(gasLimit) ? gasEstimate.add(BigNumber.from(1e4)) : gasLimit;
}
