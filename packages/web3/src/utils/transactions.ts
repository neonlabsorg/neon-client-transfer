import { PublicKey } from '@solana/web3.js';
import { Amount, SPLToken, toFullAmount } from '@neonevm-token-transfer/core';
import { toWei } from 'web3-utils';
import {
  DEFAULT_RETURN_FORMAT,
  Transaction as TransactionConfig
} from 'web3-types';
import {
  ReturnFormat,
  GasInterface,
  GasPriceInterface
} from './types';
import {
  erc20ForSPLContract,
  neonWrapperContract,
  neonWrapper2Contract
} from './contracts';
import { SignTransactionResult, Web3Account } from "web3-eth-accounts";
import {
  estimateGas,
  getBlockNumber,
  getGasPrice,
  getTransactionCount
} from "web3-eth";
import { Web3Context } from "web3-core";

export function claimTransactionData(proxyUrl: string, associatedToken: PublicKey, neonWallet: string, amount: Amount): string {
  //@ts-ignore
  const claimTo = erc20ForSPLContract(proxyUrl).methods.claimTo(associatedToken.toBuffer(), neonWallet, amount);
  return claimTo.encodeABI();
}

export function neonTransactionData(proxyUrl: string, solanaWallet: PublicKey): string {
  //@ts-ignore
  return neonWrapperContract(proxyUrl).methods.withdraw(solanaWallet.toBuffer()).encodeABI();
}

export function mintNeonTransactionData(proxyUrl: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  //@ts-ignore
  return erc20ForSPLContract(proxyUrl).methods.transferSolana(associatedToken.toBuffer(), fullAmount).encodeABI();
}

export function wrappedNeonTransactionData(proxyUrl: string, token: SPLToken, amount: Amount): string {
  const value = toWei(amount.toString(), 'ether');
  const contract = neonWrapper2Contract(proxyUrl, token.address);
  //@ts-ignore
  return contract.methods.withdraw(value).encodeABI();
}

export async function neonClaimTransactionFromSigner(
  climeData: string, walletSigner: Web3Account, neonWallet: string, splToken: SPLToken, proxyUrl: string
): Promise<SignTransactionResult> {

  const transaction: TransactionConfig = {
    data: climeData,
    gas: `0x5F5E100`, // 100000000
    gasPrice: `0x0`,
    from: neonWallet,
    to: splToken.address // contract address
  };

  transaction.nonce = await getTransactionCount(new Web3Context(proxyUrl),
    walletSigner.address,
    'latest',
    DEFAULT_RETURN_FORMAT as ReturnFormat
  );

  return await walletSigner.signTransaction(transaction);
}

export async function getGasAndEstimationGasPrice(proxyUrl: string, transaction: TransactionConfig): Promise<GasInterface & GasPriceInterface> {
  const blockNumber = await getBlockNumber(new Web3Context(proxyUrl), DEFAULT_RETURN_FORMAT as ReturnFormat);
  const gasPrice = await getGasPrice(new Web3Context(proxyUrl), DEFAULT_RETURN_FORMAT as ReturnFormat);
  const gas = await estimateGas(new Web3Context(proxyUrl), transaction, blockNumber, DEFAULT_RETURN_FORMAT as ReturnFormat);
  return { gasPrice, gas };
}

export function getGasLimit(gas: bigint, gasLimit: bigint): bigint {
  return gas > gasLimit ? gas + BigInt(1e4) : gasLimit;
}
