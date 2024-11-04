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
  EthersSignedTransaction,
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
import { JsonRpcProvider, TransactionRequest, Wallet } from 'ethers';
import {
  claimTransactionData,
  mintNeonTransactionData,
  useTransactionFromSignerEthers
} from './utils';
import { NEON_TREASURY_POOL_COUNT } from "@neonevm/token-transfer-core/src";

export async function neonTransferMintTransactionEthers(params: MintTransferParams<Wallet>): Promise<any> {
  const { connection, proxyApi, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId, neonHeapFrame } = params;
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await useTransactionFromSignerEthers(climeData, walletSigner, splToken.address);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<EthersSignedTransaction>({
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

export async function createMintNeonTransactionEthers(params: MintNeonTransactionParams<JsonRpcProvider>): Promise<TransactionRequest> {
  const { provider, neonWallet, associatedToken, splToken, amount, gasLimit } = params;
  const effectiveGasLimit = gasLimit ?? BigInt(5e4);
  const data = mintNeonTransactionData(associatedToken, splToken, amount);
  const transaction = createMintNeonTransaction<TransactionRequest>(neonWallet, splToken, data);
  const feeData = await provider.getFeeData();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasPrice = feeData.gasPrice;
  transaction.gasLimit = gasEstimate > effectiveGasLimit ? gasEstimate + BigInt(1e4) : effectiveGasLimit;
  return transaction;
}

export async function createWrapAndTransferSOLTransaction(params: MintTransferParams<Wallet>): Promise<Transaction> {
  const { connection, proxyApi, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId, neonHeapFrame } = params;
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
  } = await createClaimInstruction<EthersSignedTransaction>({
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
