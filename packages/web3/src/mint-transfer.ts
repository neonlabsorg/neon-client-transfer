import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createClaimInstruction,
  createMintNeonTransaction,
  MintNeonTransactionParams,
  MintTransferParams,
  NeonMintTxParams,
  neonTransferMintTransaction,
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
import {NEON_TREASURY_POOL_COUNT} from "@neonevm/token-transfer-core/src";

export async function neonTransferMintTransactionWeb3(params: MintTransferParams<Web3Account> & { proxyUrl: string }): Promise<any> {
  const { connection, proxyApi, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId, neonHeapFrame, proxyUrl } = params;
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<SignTransactionResult>({
    proxyApi,
    neonTransaction: signedTransaction,
    connection,
    neonEvmProgram,
    splToken,
    associatedTokenAddress,
    signerAddress: walletSigner.address,
    fullAmount
  });

  const neonTxParams: NeonMintTxParams<typeof walletSigner, typeof signedTransaction> = {
    connection,
    neonEvmProgram,
    solanaWallet,
    neonWallet,
    emulateSigner: walletSigner,
    neonKeys,
    legacyAccounts,
    neonTransaction: signedTransaction,
    splToken,
    amount: fullAmount,
    chainId,
    neonHeapFrame,
    neonPoolCount: NEON_TREASURY_POOL_COUNT
  };

  return neonTransferMintTransaction(neonTxParams);
}

export async function createMintNeonTransactionWeb3(params: MintNeonTransactionParams<string>): Promise<TransactionConfig> {
  const { provider, neonWallet, associatedToken, splToken, amount, gasLimit } = params;
  const effectiveGasLimit = gasLimit ? BigInt(gasLimit) : BigInt(5e4);
  const data = mintNeonTransactionData(provider, associatedToken, splToken, amount);
  const transaction = createMintNeonTransaction<TransactionConfig>(neonWallet, splToken, data);
  const { gasPrice, gas } = await getGasAndEstimationGasPrice(provider, transaction);
  transaction.gasPrice = gasPrice;
  transaction.gas = gas;
  const blockNumber = await getBlockNumber(new Web3Context(provider), DEFAULT_RETURN_FORMAT as ReturnFormat);
  transaction.nonce = (await getTransactionCount(new Web3Context(provider), neonWallet, blockNumber, DEFAULT_RETURN_FORMAT as ReturnFormat));
  transaction['gasLimit'] = getGasLimit(transaction.gas, effectiveGasLimit);
  return transaction;
}

export async function createWrapAndTransferSOLTransaction(params: MintTransferParams<Web3Account> & { proxyUrl: string }): Promise<Transaction> {
  const { connection, proxyApi, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId, neonHeapFrame, proxyUrl } = params;
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
  } = await createClaimInstruction<SignTransactionResult>({
    proxyApi,
    neonTransaction: signedTransaction,
    connection,
    neonEvmProgram,
    splToken,
    associatedTokenAddress,
    signerAddress: walletSigner.address,
    fullAmount
  });

  const neonTxParams: NeonMintTxParams<typeof walletSigner, typeof signedTransaction> = {
    connection,
    neonEvmProgram,
    solanaWallet,
    neonWallet,
    emulateSigner: walletSigner,
    neonKeys,
    legacyAccounts,
    neonTransaction: signedTransaction,
    splToken,
    amount: fullAmount,
    chainId,
    neonHeapFrame,
    neonPoolCount: NEON_TREASURY_POOL_COUNT
  };

  const mintTransaction = await neonTransferMintTransaction(neonTxParams);

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
