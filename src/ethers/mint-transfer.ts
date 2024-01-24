import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import { NeonProxyRpcApi } from '../api';
import { Amount, EthersSignedTransaction, NeonProgramStatus, SPLToken } from '../models';
import { toFullAmount } from '../utils';
import {
  claimTransactionData,
  mintNeonTransactionData,
  useTransactionFromSignerEthers
} from './utils';
import {
  createAssociatedTokenAccountInstruction,
  createClaimInstruction,
  createMintNeonTransaction,
  neonTransferMintTransaction
} from '../core';

export async function neonTransferMintTransactionEthers(connection: Connection, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Wallet, splToken: SPLToken, amount: Amount, chainId: number): Promise<any> {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await useTransactionFromSignerEthers(climeData, walletSigner, splToken.address);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<EthersSignedTransaction>(proxyApi, signedTransaction);
  return neonTransferMintTransaction<Wallet, EthersSignedTransaction>(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
}

export async function createMintNeonTransactionEthers(provider: JsonRpcProvider, neonWallet: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount, gasLimit = 5e4): Promise<TransactionRequest> {
  const data = mintNeonTransactionData(associatedToken, splToken, amount);
  const transaction = createMintNeonTransaction<TransactionRequest>(neonWallet, splToken, data);
  transaction.gasPrice = await provider.getGasPrice();
  const gasEstimate = (await provider.estimateGas(transaction as TransactionRequest)).toNumber();
  transaction.nonce = await provider.getTransactionCount(neonWallet);
  transaction.gasLimit = gasEstimate > gasLimit ? gasEstimate + 1e4 : gasLimit;
  return <TransactionRequest>transaction;
}

export async function createWrapAndTransferSOLTransaction(connection: Connection, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Wallet, splToken: SPLToken, amount: number, chainId = 111): Promise<Transaction> {
  const instructions: TransactionInstruction[] = [];
  const transaction: Transaction = new Transaction({ feePayer: solanaWallet });
  const tokenMint = new PublicKey(splToken.address_spl);
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedTokenAddress);
  const climeData = claimTransactionData(associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await useTransactionFromSignerEthers(climeData, walletSigner, splToken.address);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<EthersSignedTransaction>(proxyApi, signedTransaction);
  const mintTransaction = await neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);

  if (!wSOLAccount) {
    instructions.push(createAssociatedTokenAccountInstruction(tokenMint, associatedTokenAddress, solanaWallet, solanaWallet));
  }

  instructions.push(SystemProgram.transfer({
    fromPubkey: solanaWallet,
    toPubkey: associatedTokenAddress,
    lamports: fullAmount
  }));
  instructions.push(createSyncNativeInstruction(associatedTokenAddress, TOKEN_PROGRAM_ID));
  transaction.add(...instructions);
  transaction.add(...mintTransaction.instructions);

  return transaction;
}
