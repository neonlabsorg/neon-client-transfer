import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from '@solana/web3.js';
import {
  createAssociatedTokenAccountTransaction, createUnwrapSOLTransaction,
  NeonProxyRpcApi,
  signerPrivateKey,
  SPLToken
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionEthers,
  createWrapAndTransferSOLTransaction
} from '@neonevm/token-transfer-ethers';
import {
  delay,
  getTokenBalance, mintTokenBalanceEthers, neonSignature, sendNeonTransactionEthers,
  sendSolanaTransaction,
  solanaSignature, splTokenBalance,
  walletSigner
} from "../tools";
import { expect } from "@jest/globals";
import { JsonRpcProvider, Wallet } from 'ethers';

export type TransferParams = {
  connection: Connection;
  provider: JsonRpcProvider;
  solanaWallet: Keypair;
  neonWallet: Wallet;
  signer: Signer;
  wSOL: SPLToken;
  neonProxyRpcApi: NeonProxyRpcApi;
  neonEvmProgram: PublicKey;
  amount: number;
  chainId: number;
  solanaUrl: string;
  skipPreflight: boolean;
}

export async function isWSolToNeonTransfer({ connection, wSOL, neonWallet, solanaWallet, chainId, neonEvmProgram, solanaUrl, signer, amount, neonProxyRpcApi, provider, skipPreflight }: TransferParams) {
  const solBefore = await connection.getBalance(solanaWallet.publicKey);
  const associatedToken = getAssociatedTokenAddressSync(new PublicKey(wSOL.address_spl), solanaWallet.publicKey);
  const wSolBefore = await connection.getBalance(associatedToken);
  const balanceBefore = await getTokenBalance(provider, neonWallet, wSOL);
  console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
  try {
    const solanaWalletSigner = walletSigner(provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
    const transaction = await createWrapAndTransferSOLTransaction({
      connection,
      proxyApi: neonProxyRpcApi,
      neonEvmProgram,
      solanaWallet: solanaWallet.publicKey,
      neonWallet: neonWallet.address,
      walletSigner: solanaWalletSigner,
      splToken: wSOL,
      amount,
      chainId
    });
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signature = await sendSolanaTransaction(connection, transaction, [signer], true, {skipPreflight});
    expect(signature.length).toBeGreaterThan(0);
    solanaSignature(`wSOL transfer signature`, signature, solanaUrl);
    await delay(5e3);

    const solAfter = await connection.getBalance(solanaWallet.publicKey);
    console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} > ${solAfter / LAMPORTS_PER_SOL} SOL in Solana`);
    const wSolAfterTransfer = await connection.getBalance(associatedToken);
    const balanceAfter = await getTokenBalance(provider, neonWallet, wSOL);
    console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} > ${wSolAfterTransfer / LAMPORTS_PER_SOL} ${wSOL.symbol} ==> ${balanceBefore} < ${balanceAfter} ${wSOL.symbol} in Neon`);
    expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
  } catch (e) {
    console.log(e);
  }
}

export async function isWSolToSolanaTransfer({ connection, wSOL, neonWallet, solanaWallet, solanaUrl, signer, amount, provider, skipPreflight }: Partial<TransferParams>) {
  const mintPubkey = new PublicKey(wSOL.address_spl);
  const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);

  const balanceBefore = await mintTokenBalanceEthers(neonWallet, wSOL);
  console.log(`Balance: ${balanceBefore ?? 0} ${wSOL.symbol}`);
  const solanaTransaction = createAssociatedTokenAccountTransaction({ solanaWallet: solanaWallet.publicKey, tokenMint: mintPubkey, associatedToken: associatedToken });
  solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const neonTransaction = await createMintNeonTransactionEthers({ provider, neonWallet: neonWallet.address, associatedToken: associatedToken, splToken: wSOL, amount });
  neonTransaction.nonce = await neonWallet.getNonce();
  const wSolBefore = await connection.getBalance(associatedToken);
  console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
  try {
    const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight });
    solanaSignature(`Solana Signature`, signedSolanaTransaction, solanaUrl);
    expect(signedSolanaTransaction.length).toBeGreaterThan(0);
    await delay(1e3);
    const signedNeonTransaction = await sendNeonTransactionEthers(neonTransaction, neonWallet);
    neonSignature(`Neon Signature`, signedNeonTransaction);
    expect(signedNeonTransaction.length).toBeGreaterThan(0);
    await delay(20e3);
    const balanceAfter = await mintTokenBalanceEthers(neonWallet, wSOL);
    const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, wSOL);
    console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} ==> ${balanceSPL?.uiAmount} ${wSOL.symbol} in Solana`);
    expect(balanceAfter).toBeLessThan(balanceBefore);

    const unwrapTransaction = await createUnwrapSOLTransaction(connection, solanaWallet.publicKey, wSOL);
    unwrapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signature = await sendSolanaTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight });
    expect(signature.length).toBeGreaterThan(0);
    solanaSignature(`wSOL unwrap signature`, signature, solanaUrl);
    await delay(20e3);

    const wSolAfter = await connection.getBalance(associatedToken);
    console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} > ${wSolAfter / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
    expect(wSolBefore).toBeGreaterThan(wSolAfter);
  } catch (e) {
    console.log(e);
  }
}
