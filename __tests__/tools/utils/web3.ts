import { erc20Abi, NEON_TOKEN_MINT_DECIMALS, SPLToken } from '@neonevm/token-transfer-core';
import { ReturnFormat } from '@neonevm/token-transfer-web3';
import { ContractAbi, DEFAULT_RETURN_FORMAT, Transaction as TransactionConfig } from 'web3-types';
import { Web3Account } from 'web3-eth-accounts';
import { Contract } from 'web3-eth-contract';
import { Web3Context } from 'web3-core';
import { getBalance } from 'web3-eth';
import { Web3 } from 'web3';
import { Big } from 'big.js';

export async function sendNeonTransaction(web3: Web3, transaction: TransactionConfig, account: Web3Account): Promise<string> {
  const signedTrx = await web3.eth.accounts.signTransaction(transaction, account.privateKey);
  return new Promise<string>((resolve, reject) => {
    if (signedTrx?.rawTransaction) {
      const txResult = web3.eth.sendSignedTransaction(signedTrx.rawTransaction);
      txResult.on('transactionHash', (hash: string) => resolve(hash));
      txResult.on('error', (error: Error) => reject(error));
    } else {
      reject('Unknown transaction');
    }
  });
}

export async function neonBalanceWeb3(proxyUrl: string, address: string): Promise<Big> {
  const balance = await getBalance(new Web3Context(proxyUrl), address, undefined, DEFAULT_RETURN_FORMAT as ReturnFormat);
  console.log('NEON balance:', balance, address);
  return new Big(balance.toString()).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
}

export async function mintTokenBalanceWeb3(proxyUrl: string, account: string, token: SPLToken, contractAbi: ContractAbi = erc20Abi as ContractAbi): Promise<number> {
  const tokenInstance = new Contract(contractAbi, token.address, new Web3Context(proxyUrl));
  //@ts-ignore
  const balance: bigint = await tokenInstance.methods.balanceOf(account).call();
  return Number(balance) / Math.pow(10, token.decimals);
}

export function neonSignature(comment: string, signature: string): void {
  console.log(`${comment}: ${signature}; url: https://devnet.neonscan.org/tx/${signature}`);
}

export function walletSignerWeb3(web3: Web3, pk: string): Web3Account {
  return web3.eth.accounts.privateKeyToAccount(pk);
}
