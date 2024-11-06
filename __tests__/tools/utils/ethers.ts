import { erc20Abi, NEON_TOKEN_MINT_DECIMALS, SPLToken } from '@neonevm/token-transfer-core';
import { Contract, JsonRpcProvider, TransactionRequest, Wallet } from 'ethers';
import { Big } from 'big.js';

export async function getTokenBalance(provider: JsonRpcProvider, wallet: Wallet, token: SPLToken, contractAbi: any = erc20Abi): Promise<bigint> {
  const tokenInstance = new Contract(token.address, contractAbi, provider);
  const balance = await tokenInstance.balanceOf(wallet.address);
  return BigInt(balance) / BigInt(Math.pow(10, token.decimals));
}

export function walletSigner(provider: JsonRpcProvider, privateKey: string): Wallet {
  return new Wallet(privateKey, provider);
}

export async function sendNeonTransactionEthers(transaction: TransactionRequest, signer: Wallet): Promise<string> {
  const receipt = await signer.sendTransaction(transaction);
  return receipt.hash;
}

export async function estimateGas(provider: JsonRpcProvider, transaction: TransactionRequest, gasLimit = 5e4) {
  const gasEstimate = await provider.estimateGas(transaction);
  return gasEstimate > BigInt(gasLimit) ? gasEstimate + BigInt(1e4) : BigInt(gasLimit);
}

export async function neonBalanceEthers(provider: JsonRpcProvider, address: Wallet): Promise<Big> {
  const balance = await provider.getBalance(address);
  return new Big(balance.toString()).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
}


export async function mintTokenBalanceEthers(wallet: Wallet, token: SPLToken, contractAbi: any = erc20Abi, method = 'balanceOf'): Promise<number> {
  const tokenInstance = new Contract(token.address, contractAbi, wallet);
  if (tokenInstance[method]) {
    const balanceOf = tokenInstance[method];
    const balance: bigint = await balanceOf(wallet.address);

    return (new Big(balance.toString()).div(Big(10).pow(token.decimals))).toNumber();
  }
  return 0;
}
