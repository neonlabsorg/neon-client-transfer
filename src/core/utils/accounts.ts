import { PublicKey } from '@solana/web3.js';
// import { Web3Account } from 'web3-eth-accounts';
import { sha256 } from 'js-sha256';
// import { JsonRpcProvider } from '@ethersproject/providers';
// import { Wallet } from '@ethersproject/wallet';
// import Web3 from 'web3';

// export function solanaWalletSigner<Provider = Web3 | JsonRpcProvider>(provider: Provider, solanaWallet: PublicKey, neonWallet: string): Web3Account | Wallet {
//   const emulateSignerPrivateKey = `0x${sha256(solanaWallet.toBase58() + neonWallet).toString()}`;
//   return provider instanceof Web3 ?
//     provider.eth.accounts.privateKeyToAccount(emulateSignerPrivateKey) :
//     new Wallet(emulateSignerPrivateKey, <JsonRpcProvider>provider);
// }

export function signerPrivateKey(solanaWallet: PublicKey, neonWallet: string): string {
  return `0x${sha256(solanaWallet.toBase58() + neonWallet).toString()}`;
}
