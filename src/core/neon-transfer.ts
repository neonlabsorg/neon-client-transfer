import { Amount, EvmInstruction, SPLToken } from '../models';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  createApproveInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TokenInstruction,
  transferInstructionData
} from '@solana/spl-token';
import { TransactionConfig } from 'web3-core';
import { toWei } from 'web3-utils';
import Web3 from 'web3';
import { toBigInt, toFullAmount } from '../utils';
import { NEON_TOKEN_DECIMALS } from '../data';
import {
  authorityPoolAddress,
  neonWalletProgramAddress,
  neonWrapper2Contract,
  neonWrapperContract
} from './utils';

export async function solanaNEONTransferTransaction(solanaWallet: PublicKey, neonWallet: string, neonEvmProgram: PublicKey, neonTokenMint: PublicKey, token: SPLToken, amount: Amount, serviceWallet?: PublicKey, rewardAmount?: Amount): Promise<Transaction> {
  const [neonPubkey] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
  const [authorityPoolPubkey] = authorityPoolAddress(neonEvmProgram);
  const neonToken: SPLToken = { ...token, decimals: Number(NEON_TOKEN_DECIMALS) };
  const fullAmount = toFullAmount(amount, neonToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(neonToken.address_spl), solanaWallet);
  const transaction = new Transaction({ feePayer: solanaWallet });

  transaction.add(createApproveInstruction(associatedTokenAddress, neonPubkey, solanaWallet, fullAmount));
  transaction.add(createNeonDepositInstruction(solanaWallet, neonPubkey, authorityPoolPubkey, neonWallet, neonEvmProgram, neonTokenMint, serviceWallet));

  if (serviceWallet && rewardAmount) {
    transaction.add(createNeonTransferInstruction(neonTokenMint, solanaWallet, serviceWallet, rewardAmount));
  }

  return transaction;
}

export function createNeonDepositInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, depositWallet: PublicKey, neonWallet: string, neonEvmProgram: PublicKey, neonTokenMint: PublicKey, serviceWallet?: PublicKey): TransactionInstruction {
  const solanaAssociatedTokenAddress = getAssociatedTokenAddressSync(neonTokenMint, solanaWallet);
  const poolKey = getAssociatedTokenAddressSync(neonTokenMint, depositWallet, true);
  const keys = [
    { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: poolKey, isSigner: false, isWritable: true },
    { pubkey: neonPDAWallet, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: serviceWallet ? serviceWallet : solanaWallet, isSigner: true, isWritable: true }, // operator
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  const a = Buffer.from([EvmInstruction.DepositV03]);
  const b = Buffer.from(neonWallet.slice(2), 'hex');
  const data = Buffer.concat([a, b]);
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function createNeonTransferInstruction(neonTokenMint: PublicKey, solanaWallet: PublicKey, serviceWallet: PublicKey, rewardAmount: Amount): TransactionInstruction {
  const from = getAssociatedTokenAddressSync(neonTokenMint, solanaWallet, true);
  const to = getAssociatedTokenAddressSync(neonTokenMint, serviceWallet, true);
  const fullAmount = toBigInt(rewardAmount);
  const keys = [
    { pubkey: from, isSigner: false, isWritable: true },
    { pubkey: to, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: false }
  ];
  const data = Buffer.alloc(transferInstructionData.span);
  transferInstructionData.encode({
    instruction: TokenInstruction.Transfer,
    amount: fullAmount
  }, data);
  return new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys, data });
}

export function neonTransactionData(web3: Web3, solanaWallet: PublicKey): string {
  return neonWrapperContract(web3).methods.withdraw(solanaWallet.toBuffer()).encodeABI();
}

export function wrappedNeonTransactionData(web3: Web3, token: SPLToken, amount: Amount): string {
  const value = toWei(amount.toString(), 'ether');
  const contract = neonWrapper2Contract(web3, token.address);
  return contract.methods.withdraw(value).encodeABI();
}

export function wrappedNeonTransaction(from: string, to: string, data: string): TransactionConfig {
  const value = `0x0`;
  return { from, to, value, data };
}

export function neonNeonTransaction(from: string, to: string, solanaWallet: PublicKey, amount: Amount, data: string): TransactionConfig {
  const value = `0x${BigInt(toWei(amount.toString(), 'ether')).toString(16)}`;
  return { from, to, value, data };
}

export async function neonNeonWeb3Transaction(web3: Web3, from: string, to: string, solanaWallet: PublicKey, amount: Amount, gasLimit = 5e4): Promise<TransactionConfig> {
  const data = neonTransactionData(web3, solanaWallet);
  const transaction = neonNeonTransaction(from, to, solanaWallet, amount, data);
  transaction.gasPrice = await web3.eth.getGasPrice();
  transaction.gas = await web3.eth.estimateGas(transaction);
  // @ts-ignore
  transaction['gasLimit'] = gasLimit;
  return transaction;
}
