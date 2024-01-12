import { expect } from '@jest/globals';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Signer } from '@solana/web3.js';
import Web3 from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import {
  createMintSolanaTransaction,
} from '../../core';
import { neonTransferMintTransactionWeb3, createMintNeonTransactionWeb3 } from '../../web3'
import { NeonProxyRpcApi } from '../../api';
import { NeonProgramStatus, SPLToken } from '../../models';
import {
  delay,
  FaucetDropper,
  mintTokenBalance,
  neonSignature,
  sendNeonTransaction,
  sendSolanaTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner
} from '../tools';

export async function itSolanaTokenSPL(connection: Connection, proxyUrl: string, neonProxyRpcApi: NeonProxyRpcApi, neonProxyStatus: NeonProgramStatus, token: SPLToken, neonEvmProgram: PublicKey, solanaWallet: Keypair, neonWallet: Web3Account, chainId: number, solanaUrl: string, skipPreflight = false) {
  const amount = 0.1;
  const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, token);
  console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${token.symbol}`);
  try {
    const transaction = await neonTransferMintTransactionWeb3(connection, proxyUrl, neonProxyRpcApi, neonProxyStatus, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, token, amount, chainId);
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

export async function itNeonTokenMint(connection: Connection, web3: Web3, proxyUrl: string, faucet: FaucetDropper, neonProxyStatus: NeonProgramStatus, token: SPLToken, solanaWallet: Keypair, neonWallet: Web3Account, solanaUrl: string, skipPreflight = false) {
  const amount = 0.1;
  const mintPubkey = new PublicKey(token.address_spl);
  let balanceBefore = await mintTokenBalance(proxyUrl, neonWallet.address, token);
  if (!balanceBefore) {
    await faucet.requestERC20(neonWallet.address, token, 1);
    balanceBefore = await mintTokenBalance(proxyUrl, neonWallet.address, token);
    await delay(30e6);
  }
  console.log(`Balance: ${balanceBefore ?? 0} ${token.symbol}`);
  const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);
  const solanaTransaction = createMintSolanaTransaction(solanaWallet.publicKey, mintPubkey, associatedToken, neonProxyStatus);
  solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const neonTransaction = await createMintNeonTransactionWeb3(proxyUrl, neonWallet.address, associatedToken, token, amount);
  const signer: Signer = toSigner(solanaWallet);
  try {
    const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight });
    solanaSignature(`Solana Signature`, signedSolanaTransaction, solanaUrl);
    expect(signedSolanaTransaction.length).toBeGreaterThan(0);
    await delay(1e3);
    const signedNeonTransaction = await sendNeonTransaction(web3, neonTransaction, neonWallet);
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
