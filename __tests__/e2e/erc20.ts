import { expect } from '@jest/globals';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Signer, Transaction } from '@solana/web3.js';
import { NeonProxyRpcApi, signerPrivateKey, SPLToken } from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionWeb3,
  neonTransferMintTransactionWeb3
} from '@neonevm/token-transfer-web3';
import { JsonRpcProvider, TransactionRequest, Wallet } from 'ethers';
import { Web3 } from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import { Transaction as TransactionWeb3 } from 'web3-types';
import {
  createMintNeonTransactionEthers,
  neonTransferMintTransactionEthers
} from '@neonevm/token-transfer-ethers';
import {
  createAssociatedTokenAccount,
  delay,
  FaucetDropper,
  mintTokenBalanceEthers,
  neonSignature,
  sendNeonTransaction,
  sendNeonTransactionEthers,
  sendSolanaTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner,
  walletSigner,
  walletSignerWeb3
} from '../tools';

export async function itSolanaTokenSPL(provider: Web3 | JsonRpcProvider, connection: Connection, proxyUrl: string, neonProxyRpcApi: NeonProxyRpcApi, token: SPLToken, neonEvmProgram: PublicKey, solanaWallet: Keypair, neonWallet: Web3Account | Wallet, chainId: number, solanaUrl: string, skipPreflight = true) {
  const amount = 0.1;
  const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, token);
  console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${token.symbol}`);
  try {
    let transaction: Transaction;
    if (provider instanceof JsonRpcProvider) {
      const solanaWalletSigner = walletSigner(<JsonRpcProvider>provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
      transaction = await neonTransferMintTransactionEthers({
        connection,
        proxyApi: neonProxyRpcApi,
        neonEvmProgram,
        solanaWallet: solanaWallet.publicKey,
        neonWallet: neonWallet.address,
        walletSigner: solanaWalletSigner,
        splToken: token,
        amount,
        chainId
      });
    } else {
      const walletSigner = walletSignerWeb3(provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
      transaction = await neonTransferMintTransactionWeb3({
        connection,
        proxyUrl,
        proxyApi: neonProxyRpcApi,
        neonEvmProgram,
        solanaWallet: solanaWallet.publicKey,
        neonWallet: neonWallet.address,
        walletSigner,
        splToken: token,
        amount,
        chainId
      });
    }
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signer: Signer = toSigner(solanaWallet);
    const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
    expect(signature.length).toBeGreaterThan(0);
    solanaSignature(`Signature`, signature, solanaUrl);
    await delay(5e3);

    const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, token);
    const balanceMint = await mintTokenBalanceEthers(neonWallet as Wallet, token);
    console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${token.symbol} ==> ${balanceMint} ${token.symbol} in Neon`);
    expect(balanceAfter?.uiAmount).toBeLessThan(balanceBefore?.uiAmount!);
  } catch (e) {
    console.log(e);
    expect(e instanceof Error ? e.message : '').toBe('');
  }
}

export async function itNeonTokenMint(connection: Connection, provider: Web3 | JsonRpcProvider, proxyUrl: string, faucet: FaucetDropper, token: SPLToken, solanaWallet: Keypair, neonWallet: Web3Account | Wallet) {
  const amount = 0.1;
  const mintPubkey = new PublicKey(token.address_spl);
  let balanceBefore = await mintTokenBalanceEthers(neonWallet as Wallet, token);
  if (!balanceBefore) {
    await faucet.requestERC20(neonWallet.address, token, 1);
    balanceBefore = await mintTokenBalanceEthers(neonWallet as Wallet, token);
    await delay(30e6);
  }
  console.log(`Balance: ${balanceBefore ?? 0} ${token.symbol}`);
  const signer: Signer = toSigner(solanaWallet);
  await createAssociatedTokenAccount(connection, signer, token);

  const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);
  let neonTransaction: TransactionRequest | TransactionWeb3;
  if (provider instanceof JsonRpcProvider) {
    neonTransaction = await createMintNeonTransactionEthers({ provider, neonWallet: neonWallet.address, associatedToken, splToken: token, amount });
    neonTransaction.nonce = await (neonWallet as Wallet).getNonce();
  } else {
    neonTransaction = await createMintNeonTransactionWeb3({ provider: proxyUrl, neonWallet: neonWallet.address, associatedToken, splToken: token, amount });
  }

  try {
    const signedNeonTransaction = provider instanceof JsonRpcProvider ?
      await sendNeonTransactionEthers(<TransactionRequest>neonTransaction, <Wallet>neonWallet) :
      await sendNeonTransaction(provider, <TransactionWeb3>neonTransaction, <Web3Account>neonWallet);
    neonSignature(`Neon Signature`, signedNeonTransaction);
    expect(signedNeonTransaction.length).toBeGreaterThan(0);
    await delay(20e3);
    const balanceAfter = await mintTokenBalanceEthers(neonWallet as Wallet, token);
    const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, token);
    console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${token.symbol} ==> ${balanceSPL?.uiAmount} ${token.symbol} in Solana`);
    expect(balanceAfter).toBeLessThan(balanceBefore);
  } catch (e) {
    console.log(e);
    expect(e instanceof Error ? e.message : '').toBe('');
  }
}
