import { expect } from '@jest/globals';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Signer, Transaction } from '@solana/web3.js';
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import { NeonProxyRpcApi, signerPrivateKey, SPLToken } from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionWeb3,
  neonTransferMintTransactionWeb3
} from '@neonevm/token-transfer-web3';
import { Web3 } from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import { Transaction as TransactionConfig } from 'web3-types';
import {
  createMintNeonTransactionEthers,
  neonTransferMintTransactionEthers
} from '@neonevm/token-transfer-ethers';
import { Wallet } from '@ethersproject/wallet';
import {
  createAssociatedTokenAccount,
  delay,
  FaucetDropper,
  mintTokenBalance,
  neonSignature,
  sendNeonTransaction,
  sendNeonTransactionEthers,
  sendSolanaTransaction,
  solanaSignature,
  solanaWalletSigner,
  splTokenBalance,
  toSigner,
  walletSigner
} from '../tools';

export async function itSolanaTokenSPL(provider: Web3 | JsonRpcProvider, connection: Connection, proxyUrl: string, neonProxyRpcApi: NeonProxyRpcApi, token: SPLToken, neonEvmProgram: PublicKey, solanaWallet: Keypair, neonWallet: Web3Account | Wallet, chainId: number, solanaUrl: string, skipPreflight = true) {
  const amount = 0.1;
  const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, token);
  if(!balanceBefore) return;
  console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${token.symbol}`);
  try {
    let transaction: Transaction;
    if (provider instanceof JsonRpcProvider) {
      const solanaWalletSigner = walletSigner(<JsonRpcProvider>provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
      transaction = await neonTransferMintTransactionEthers(connection, neonProxyRpcApi, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, solanaWalletSigner, token, amount, chainId);
    } else {
      const walletSigner = solanaWalletSigner(provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
      transaction = await neonTransferMintTransactionWeb3(connection, proxyUrl, neonProxyRpcApi, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, walletSigner, token, amount, chainId);
    }
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signer: Signer = toSigner(solanaWallet);
    const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
    expect(signature.length).toBeGreaterThan(0);
    solanaSignature(`Signature`, signature, solanaUrl);
    await delay(5e3);

    const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, token);
    const balanceMint = await mintTokenBalance(proxyUrl, neonWallet.address, token);
    console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${token.symbol} ==> ${balanceMint} ${token.symbol} in Neon`);
    expect(balanceAfter.uiAmount).toBeLessThan(balanceBefore.uiAmount!);
  } catch (e) {
    console.log(e);
    expect(e instanceof Error ? e.message : '').toBe('');
  }
}

export async function itNeonTokenMint(connection: Connection, provider: Web3 | JsonRpcProvider, proxyUrl: string, faucet: FaucetDropper, token: SPLToken, solanaWallet: Keypair, neonWallet: Web3Account | Wallet) {
  const amount = 0.1;
  const mintPubkey = new PublicKey(token.address_spl);
  let balanceBefore = await mintTokenBalance(proxyUrl, neonWallet.address, token);
  if (!balanceBefore) {
    await faucet.requestERC20(neonWallet.address, token, 1);
    balanceBefore = await mintTokenBalance(proxyUrl, neonWallet.address, token);
    await delay(30e6);
  }
  console.log(`Balance: ${balanceBefore ?? 0} ${token.symbol}`);
  const signer: Signer = toSigner(solanaWallet);
  await createAssociatedTokenAccount(connection, signer, token);

  const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);
  let neonTransaction: TransactionRequest | TransactionConfig;
  if (provider instanceof JsonRpcProvider) {
    neonTransaction = await createMintNeonTransactionEthers(provider, neonWallet.address, associatedToken, token, amount);
  } else {
    neonTransaction = await createMintNeonTransactionWeb3(proxyUrl, neonWallet.address, associatedToken, token, amount);
  }

  try {
    const signedNeonTransaction = provider instanceof JsonRpcProvider ?
      await sendNeonTransactionEthers(<TransactionRequest>neonTransaction, <Wallet>neonWallet) :
      await sendNeonTransaction(provider, <TransactionConfig>neonTransaction, <Web3Account>neonWallet);
    neonSignature(`Neon Signature`, signedNeonTransaction);
    expect(signedNeonTransaction.length).toBeGreaterThan(0);
    await delay(15e3);
    const balanceAfter = await mintTokenBalance(proxyUrl, neonWallet.address, token);
    const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, token);
    console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${token.symbol} ==> ${balanceSPL?.uiAmount} ${token.symbol} in Solana`);
    expect(balanceAfter).toBeLessThan(balanceBefore);
  } catch (e) {
    console.log(e);
    expect(e instanceof Error ? e.message : '').toBe('');
  }
}
