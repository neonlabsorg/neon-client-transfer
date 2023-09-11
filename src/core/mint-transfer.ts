import {
  AccountMeta,
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createApproveInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Buffer } from 'buffer';
import { Account, SignedTransaction, TransactionConfig } from 'web3-core';
import Web3 from 'web3';
import { toBytesInt32, toFullAmount } from '../utils';
import { Amount, EvmInstruction, NeonProgramStatus, SPLToken } from '../models';
import { COMPUTE_BUDGET_ID } from '../data';
import { NeonProxyRpcApi } from '../api';
import {
  authAccountAddress,
  collateralPoolAddress,
  erc20ForSPLContract,
  neonWalletProgramAddress,
  solanaWalletSigner
} from './utils';

export async function neonTransferMintWeb3Transaction(connection: Connection, web3: Web3, proxyApi: NeonProxyRpcApi, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, splToken: SPLToken, amount: Amount): Promise<any> {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = climeTransactionData(web3, associatedTokenAddress, neonWallet, fullAmount);
  const walletSigner = await solanaWalletSigner(web3, solanaWallet, neonWallet);
  const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken);
  const { neonKeys, neonTransaction } = await createClaimInstruction(proxyApi, signedTransaction);
  return neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, neonTransaction, splToken, fullAmount);
}

export async function neonTransferMintTransaction(connection: Connection, proxyStatus: NeonProgramStatus, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, emulateSigner: Account, neonKeys: AccountMeta[], neonTransaction: SignedTransaction, splToken: SPLToken, amount: bigint): Promise<Transaction> {
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const [neonWalletPDA] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
  const [emulateSignerPDA] = neonWalletProgramAddress(emulateSigner.address, neonEvmProgram);
  const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
  const emulateSignerPDAAccount = await connection.getAccountInfo(emulateSignerPDA);
  const neonWalletAccount = await connection.getAccountInfo(neonWalletPDA);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const transaction = new Transaction({ feePayer: solanaWallet });
  // transaction.add(createComputeBudgetUtilsInstruction(computedBudgetProgram, proxyStatus));
  transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
  transaction.add(createApproveDepositInstruction(solanaWallet, delegatePDA, associatedTokenAddress, amount));

  if (!neonWalletAccount) {
    transaction.add(createAccountV3Instruction(solanaWallet, neonWalletPDA, neonEvmProgram, neonWallet));
  }

  if (!emulateSignerPDAAccount) {
    transaction.add(createAccountV3Instruction(solanaWallet, emulateSignerPDA, neonEvmProgram, emulateSigner.address));
  }

  if (neonTransaction?.rawTransaction) {
    transaction.add(createExecFromDataInstruction(solanaWallet, neonWalletPDA, neonEvmProgram, neonTransaction.rawTransaction, neonKeys, proxyStatus));
  }

  return transaction;
}

export function createComputeBudgetUtilsInstruction(programId: PublicKey, proxyStatus: NeonProgramStatus): TransactionInstruction {
  const a = Buffer.from([0x00]);
  const b = Buffer.from(toBytesInt32(parseInt(proxyStatus.NEON_COMPUTE_UNITS)));
  const c = Buffer.from(toBytesInt32(0));
  const data = Buffer.concat([a, b, c]);
  return new TransactionInstruction({ programId, data, keys: [] });
}

export function createComputeBudgetHeapFrameInstruction(programId: PublicKey, proxyStatus: NeonProgramStatus): TransactionInstruction {
  const a = Buffer.from([0x01]);
  const b = Buffer.from(toBytesInt32(parseInt(proxyStatus.NEON_HEAP_FRAME)));
  const data = Buffer.concat([a, b]);
  return new TransactionInstruction({ programId, data, keys: [] });
}

export function createApproveDepositInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, associatedToken: PublicKey, amount: number | bigint): TransactionInstruction {
  return createApproveInstruction(associatedToken, neonPDAWallet, solanaWallet, amount);
}

export function createAccountV3Instruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, neonEvmProgram: PublicKey, neonWallet: string): TransactionInstruction {
  const keys = [
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: neonPDAWallet, isSigner: false, isWritable: true }
  ];
  const a = Buffer.from([EvmInstruction.CreateAccountV03]);
  const b = Buffer.from(neonWallet.slice(2), 'hex');
  const data = Buffer.concat([a, b]);
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function climeTransactionData(web3: Web3, associatedToken: PublicKey, neonWallet: string, amount: Amount): string {
  const claimTo = erc20ForSPLContract(web3).methods.claimTo(associatedToken.toBuffer(), neonWallet, amount);
  return claimTo.encodeABI();
}

export async function neonClaimTransactionFromSigner(climeData: string, walletSigner: Account, neonWallet: string, splToken: SPLToken): Promise<SignedTransaction> {
  const transaction: TransactionConfig = {
    data: climeData,
    gas: `0x5F5E100`, // 100000000
    gasPrice: `0x0`,
    from: neonWallet,
    to: splToken.address // contract address
  };
  return walletSigner.signTransaction(transaction);
}

export async function createClaimInstruction(proxyApi: NeonProxyRpcApi, signedTransaction: SignedTransaction): Promise<{ neonKeys: AccountMeta[], neonTransaction: SignedTransaction }> {
  try {
    let neonEmulate: any;
    if (signedTransaction.rawTransaction) {
      neonEmulate = await proxyApi.neonEmulate([signedTransaction.rawTransaction.slice(2)]);
    }
    const accountsMap = new Map<string, AccountMeta>();
    if (neonEmulate) {
      for (const account of neonEmulate['accounts']) {
        const key = account['account'];
        accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
        if (account['contract']) {
          const key = account['contract'];
          accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
        }
      }

      for (const account of neonEmulate['solana_accounts']) {
        const key = account['pubkey'];
        accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
      }
    }
    return { neonKeys: Array.from(accountsMap.values()), neonTransaction: signedTransaction };
  } catch (e) {
    console.log(e);
  }
// @ts-ignore
  return { neonKeys: [], neonTransaction: null };
}

export function createExecFromDataInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, neonEvmProgram: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[], proxyStatus: NeonProgramStatus): TransactionInstruction {
  const count = Number(proxyStatus.NEON_POOL_COUNT);
  const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
  const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
  const a = Buffer.from([EvmInstruction.TransactionExecuteFromData]);
  const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
  const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
  const data = Buffer.concat([a, b, c]);
  const keys: AccountMeta[] = [
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
    { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
    { pubkey: neonPDAWallet, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: neonEvmProgram, isSigner: false, isWritable: false },
    ...neonKeys
  ];

  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export async function createMintNeonWeb3Transaction(web3: Web3, neonWallet: string, associatedToken: PublicKey, splToken: SPLToken, amount: Amount, gasLimit = 5e4): Promise<TransactionConfig> {
  const data = mintNeonTransactionData(web3, associatedToken, splToken, amount);
  const transaction = createMintNeonTransaction(neonWallet, splToken, data);
  transaction.gasPrice = await web3.eth.getGasPrice();
  transaction.gas = await web3.eth.estimateGas(transaction);
  transaction.nonce = (await web3.eth.getTransactionCount(neonWallet));
  // @ts-ignore
  transaction['gasLimit'] = gasLimit;
  return transaction;
}

export function mintNeonTransactionData(web3: Web3, associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string {
  const fullAmount = toFullAmount(amount, splToken.decimals);
  return erc20ForSPLContract(web3).methods.transferSolana(associatedToken.toBuffer(), fullAmount).encodeABI();
}

export function createMintNeonTransaction(neonWallet: string, splToken: SPLToken, data: string): TransactionConfig {
  return { data, from: neonWallet, to: splToken.address, value: `0x0` };
}

export function createMintSolanaTransaction(solanaWallet: PublicKey, tokenMint: PublicKey, associatedToken: PublicKey, proxyStatus: NeonProgramStatus): Transaction {
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const transaction = new Transaction({ feePayer: solanaWallet });
  // transaction.add(createComputeBudgetUtilsInstruction(computedBudgetProgram, proxyStatus));
  transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
  transaction.add(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
  return transaction;
}

// #region Neon -> Solana
export function createAssociatedTokenAccountInstruction(tokenMint: PublicKey, associatedAccount: PublicKey, owner: PublicKey, payer: PublicKey, associatedProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID, programId: PublicKey = TOKEN_PROGRAM_ID): TransactionInstruction {
  const data = Buffer.from([0x01]);
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedAccount, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }];

  return new TransactionInstruction({ programId: associatedProgramId, keys, data });
}

export async function createWrapSOLTransaction(connection: Connection, solanaWallet: PublicKey, amount: Amount, splToken: SPLToken): Promise<Transaction> {
  const tokenMint = new PublicKey(splToken.address_spl);
  const lamports = toFullAmount(amount, splToken.decimals);
  const associatedToken = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedToken);

  const transaction = new Transaction({ feePayer: solanaWallet });
  const instructions: TransactionInstruction[] = [];

  if (!wSOLAccount) {
    instructions.push(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
  }

  instructions.push(SystemProgram.transfer({
    fromPubkey: solanaWallet,
    toPubkey: associatedToken,
    lamports
  }));
  instructions.push(createSyncNativeInstruction(associatedToken, TOKEN_PROGRAM_ID));
  transaction.add(...instructions);
  return transaction;
}

export async function createUnwrapSOLTransaction(connection: Connection, solanaWallet: PublicKey, splToken: SPLToken): Promise<Transaction> {
  const tokenMint = new PublicKey(splToken.address_spl);
  const associatedToken = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedToken);

  if (!wSOLAccount) {
    throw new Error(`Error: ${associatedToken.toBase58()} haven't created account...`);
  }

  const transaction = new Transaction({ feePayer: solanaWallet });
  const instructions: TransactionInstruction[] = [];
  instructions.push(createCloseAccountInstruction(associatedToken, solanaWallet, solanaWallet));
  transaction.add(...instructions);
  return transaction;
}
