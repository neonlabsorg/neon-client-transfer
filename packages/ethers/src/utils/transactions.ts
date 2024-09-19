import { PublicKey } from '@solana/web3.js';
import { Amount, EthersSignedTransaction, SPLToken } from '@neonevm/token-transfer-core';
import { parseUnits, TransactionRequest, Wallet } from 'ethers';
import { erc20ForSPLContract, neonWrapper2Contract, neonWrapperContract } from './contracts';

export function claimTransactionData(associatedToken: PublicKey, neonWallet: string, amount: Amount): string {
  const fullAmount = BigInt(amount.toString());
  return erc20ForSPLContract().encodeFunctionData('claimTo', [associatedToken.toBuffer(), neonWallet, fullAmount]);
}

export function neonTransactionData(solanaWallet: PublicKey): string {
  return neonWrapperContract().encodeFunctionData('withdraw', [solanaWallet.toBuffer()]);
}

export function mintNeonTransactionData(associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string {
  const fullAmount = parseUnits(amount.toString(), splToken.decimals);
  return erc20ForSPLContract().encodeFunctionData('transferSolana', [associatedToken.toBuffer(), fullAmount]);
}

export function wrappedNeonTransactionData(token: SPLToken, amount: Amount): string {
  return neonWrapper2Contract().encodeFunctionData('withdraw', [parseUnits(amount.toString(), token.decimals)]);
}

export async function useTransactionFromSignerEthers(claimData: string, walletSigner: Wallet, address: string): Promise<EthersSignedTransaction> {
  const transaction: TransactionRequest = {
    data: claimData,
    gasLimit: `0x5F5E100`, // 100000000
    gasPrice: `0x0`,
    to: address // contract address
  };
  transaction.nonce = await walletSigner.getNonce();

  const signedTransaction = await walletSigner.signTransaction(transaction);
  return { rawTransaction: signedTransaction };
}
