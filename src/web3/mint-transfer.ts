import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import {NeonProxyRpcApi} from "../api";
import {Amount, NeonProgramStatus, SPLToken} from "../models";
import {toFullAmount} from "../utils";
import {
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
  claimTransactionData,
  mintNeonTransactionData,
  neonClaimTransactionFromSigner,
  getGasAndEstimationGasPrice,
  getGasLimit, ReturnFormat
} from "./utils";
import {
  createClaimInstruction,
  createMintNeonTransaction,
  neonTransferMintTransaction,
  createAssociatedTokenAccountInstruction
} from "../core";
import {
  getTransactionCount,
  getBlockNumber
} from "web3-eth";
import {
  DEFAULT_RETURN_FORMAT,
  Transaction as TransactionConfig
} from "web3-types";
import { Web3Context } from "web3-core";
import { Web3Account, SignTransactionResult } from "web3-eth-accounts";

export async function neonTransferMintTransactionWeb3(connection: Connection, proxyUrl: string, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Web3Account, splToken: SPLToken, amount: Amount, chainId: number): Promise<any> {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken);
  const { neonKeys, legacyAccounts } = await createClaimInstruction<SignTransactionResult>(proxyApi, signedTransaction);
  return neonTransferMintTransaction<Web3Account, SignTransactionResult>(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
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

export async function createWrapAndTransferSOLTransaction(connection: Connection, proxyUrl: string, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, walletSigner: Web3Account, splToken: SPLToken, amount: number, chainId = 111): Promise<Transaction> {
  const instructions: TransactionInstruction[] = [];
  const transaction: Transaction = new Transaction({ feePayer: solanaWallet });
  const tokenMint = new PublicKey(splToken.address_spl);
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedTokenAddress);
  const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken);
  const { neonKeys, legacyAccounts } = await createClaimInstruction<SignTransactionResult>(proxyApi, signedTransaction);
  const mintTransaction = await neonTransferMintTransaction<Web3Account, SignTransactionResult>(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);

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
