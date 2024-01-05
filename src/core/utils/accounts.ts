import { PublicKey } from '@solana/web3.js';
import { Account } from 'web3-core';
import { SHA256 } from 'crypto-js';
import Web3 from 'web3';
import { JsonRpcProvider } from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";

export function solanaWalletSigner<Provider = Web3 | JsonRpcProvider>(provider: Provider, solanaWallet: PublicKey, neonWallet: string): Account | Wallet {
  const emulateSignerPrivateKey = `0x${SHA256(solanaWallet.toBase58() + neonWallet).toString()}`;
  return provider instanceof Web3 ?
    provider.eth.accounts.privateKeyToAccount(emulateSignerPrivateKey) :
    new Wallet(emulateSignerPrivateKey, <JsonRpcProvider>provider);
}
