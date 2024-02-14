import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  Amount,
  createAssociatedTokenAccountInstruction,
  createClaimInstruction,
  createMintNeonTransaction,
  NEON_HEAP_FRAME,
  NeonProxyRpcApi,
  neonTransferMintTransaction,
  SPLToken,
  toFullAmount
} from '@neonevm/token-transfer-core';
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { getBlockNumber, getTransactionCount } from 'web3-eth';
import { DEFAULT_RETURN_FORMAT, Transaction as TransactionConfig } from 'web3-types';
import { Web3Context } from 'web3-core';
import { SignTransactionResult, Web3Account } from 'web3-eth-accounts';
import {
  claimTransactionData,
  getGasAndEstimationGasPrice,
  getGasLimit,
  mintNeonTransactionData,
  neonClaimTransactionFromSigner,
  ReturnFormat
} from './utils';

export async function neonTransferMintTransactionWeb3(connection: Connection, proxyUrl: string, proxyApi: NeonProxyRpcApi, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Web3Account, splToken: SPLToken, amount: Amount, chainId: number, neonHeapFrame = NEON_HEAP_FRAME): Promise<any> {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<SignTransactionResult>(proxyApi, signedTransaction);
  return neonTransferMintTransaction<Web3Account, SignTransactionResult>(connection, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId, neonHeapFrame);
}

export async function createMintNeonTransactionWeb3(proxyUrl: string, neonWallet: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount, gasLimit = 5e4): Promise<TransactionConfig> {
  const data = mintNeonTransactionData(proxyUrl, associatedToken, splToken, amount);
  const transaction = createMintNeonTransaction<TransactionConfig>(neonWallet, splToken, data);
  const { gasPrice, gas } = await getGasAndEstimationGasPrice(proxyUrl, transaction);
  transaction.gasPrice = gasPrice;
  transaction.gas = gas;
  const blockNumber = await getBlockNumber(new Web3Context(proxyUrl), DEFAULT_RETURN_FORMAT as ReturnFormat);
  transaction.nonce = (await getTransactionCount(new Web3Context(proxyUrl), neonWallet, blockNumber, DEFAULT_RETURN_FORMAT as ReturnFormat));
  transaction['gasLimit'] = getGasLimit(transaction.gas, BigInt(gasLimit));
  return transaction;
}

export async function createWrapAndTransferSOLTransaction(connection: Connection, proxyUrl: string, proxyApi: NeonProxyRpcApi, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Web3Account, splToken: SPLToken, amount: number, chainId: number, neonHeapFrame = NEON_HEAP_FRAME): Promise<Transaction> {
  const instructions: TransactionInstruction[] = [];
  const transaction: Transaction = new Transaction({ feePayer: solanaWallet });
  const tokenMint = new PublicKey(splToken.address_spl);
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedTokenAddress);
  const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<SignTransactionResult>(proxyApi, signedTransaction);
  const mintTransaction = await neonTransferMintTransaction<Web3Account, SignTransactionResult>(connection, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId, neonHeapFrame);

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
