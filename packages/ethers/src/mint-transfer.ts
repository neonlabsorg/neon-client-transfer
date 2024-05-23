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
  EthersSignedTransaction,
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
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider, TransactionRequest } from '@ethersproject/providers';
import {
  claimTransactionData,
  mintNeonTransactionData,
  useTransactionFromSignerEthers
} from './utils';

export async function neonTransferMintTransactionEthers(connection: Connection, proxyApi: NeonProxyRpcApi, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Wallet, splToken: SPLToken, amount: Amount, chainId: number, neonHeapFrame = NEON_HEAP_FRAME): Promise<any> {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await useTransactionFromSignerEthers(climeData, walletSigner, splToken.address);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<EthersSignedTransaction>({ proxyApi, neonTransaction: signedTransaction, connection, neonEvmProgram, splToken, associatedTokenAddress, signerAddress: walletSigner.address, fullAmount });
  return neonTransferMintTransaction<Wallet, EthersSignedTransaction>(connection, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId, neonHeapFrame);
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

export async function createWrapAndTransferSOLTransaction(connection: Connection, proxyApi: NeonProxyRpcApi, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Wallet, splToken: SPLToken, amount: number, chainId: number, neonHeapFrame = NEON_HEAP_FRAME): Promise<Transaction> {
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
  } = await createClaimInstruction<EthersSignedTransaction>({ proxyApi, neonTransaction: signedTransaction, connection, neonEvmProgram, splToken, associatedTokenAddress, signerAddress: walletSigner.address, fullAmount });
  const mintTransaction = await neonTransferMintTransaction(connection, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId, neonHeapFrame);

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
