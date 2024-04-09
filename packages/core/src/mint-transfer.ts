import {
  AccountInfo,
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
import {
  Amount,
  ClaimInstructionResult,
  EvmInstruction,
  ExtendedAccountInfo,
  NeonComputeUnits,
  NeonEmulate,
  NeonHeapFrame,
  NeonProgramStatus,
  SolanaAccount,
  SPLToken
} from './models';
import {
  COMPUTE_BUDGET_ID,
  NEON_COMPUTE_UNITS,
  NEON_HEAP_FRAME,
  NEON_STATUS_DEVNET_SNAPSHOT,
  NEON_TREASURY_POOL_COUNT
} from './data';
import {NeonProxyRpcApi} from './api';
import {
  authAccountAddress,
  collateralPoolAddress,
  neonBalanceProgramAddress,
  neonWalletProgramAddress,
  numberTo64BitLittleEndian,
  Provider,
  toBytesInt32,
  toFullAmount,
  TransactionResult,
  holderAccountAddress
} from './utils';
import {HexString} from "web3-types";

export async function neonTransferMintTransaction<W extends Provider, TxResult extends TransactionResult>(connection: Connection, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, emulateSigner: W, neonKeys: AccountMeta[], legacyAccounts: SolanaAccount[], neonTransaction: TxResult, splToken: SPLToken, amount: bigint, chainId: number, neonHeapFrame: NeonHeapFrame = NEON_HEAP_FRAME, neonPoolCount = NEON_TREASURY_POOL_COUNT): Promise<Transaction> {
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
  const [neonWalletBalanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const [emulateSignerBalanceAddress] = neonBalanceProgramAddress(emulateSigner.address, neonEvmProgram, chainId);
  const neonWalletBalanceAccount = await connection.getAccountInfo(neonWalletBalanceAddress);
  const emulateSignerBalanceAccount = await connection.getAccountInfo(emulateSignerBalanceAddress);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const holderAccountPK = await holderAccountAddress(neonEvmProgram, solanaWallet);
  console.log('holderAccountPK', holderAccountPK);
  const transaction = new Transaction({ feePayer: solanaWallet });

  transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, neonHeapFrame));
  transaction.add(createApproveDepositInstruction(solanaWallet, delegatePDA, associatedTokenAddress, amount));

  if (!neonWalletBalanceAccount) {
    transaction.add(createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonWallet, chainId));
  }

  if (!emulateSignerBalanceAccount) {
    transaction.add(createAccountBalanceInstruction(solanaWallet, neonEvmProgram, emulateSigner.address, chainId));
  }

  for (const account of legacyAccounts) {
    const instruction = await createAccountBalanceForLegacyAccountInstruction(connection, account, solanaWallet, neonEvmProgram, chainId);
    if (instruction) {
      transaction.add(instruction);
    }
  }

  //add create holder acc instruction
  //Pass holder PK in createExecFromDataInstructionV2

  if (neonTransaction?.rawTransaction) {
    transaction.add(createHolderAccountInstruction(neonEvmProgram, solanaWallet, holderAccountPK));
    transaction.add(createExecFromDataInstructionV2(solanaWallet, neonWallet, holderAccountPK, neonEvmProgram, neonTransaction.rawTransaction, neonKeys, chainId, neonPoolCount));
  }

  //Add delete holder instruction - test without

  return transaction;
}

export function createComputeBudgetUtilsInstruction(programId: PublicKey, computeUnits: NeonComputeUnits = NEON_COMPUTE_UNITS): TransactionInstruction {
  const a = Buffer.from([0x00]);
  const b = Buffer.from(toBytesInt32(parseInt(computeUnits ?? NEON_COMPUTE_UNITS)));
  const c = Buffer.from(toBytesInt32(0));
  const data = Buffer.concat([a, b, c]);
  return new TransactionInstruction({ programId, data, keys: [] });
}

export function createComputeBudgetHeapFrameInstruction(programId: PublicKey, neonHeapFrame: NeonHeapFrame = NEON_HEAP_FRAME): TransactionInstruction {
  const a = Buffer.from([0x01]);
  const b = Buffer.from(toBytesInt32(parseInt(neonHeapFrame ?? NEON_HEAP_FRAME)));
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

export async function createAccountBalanceForLegacyAccountInstruction(connection: Connection, account: SolanaAccount, solanaWallet: PublicKey, neonEvmProgram: PublicKey, chainId: number): Promise<TransactionInstruction | null> {
  const accountAddress = new PublicKey(account.pubkey);
  const accountInfo = await connection.getAccountInfo(accountAddress);
  if (accountInfo) {
    const neonAddress = `0x${accountInfo?.data.slice(1, 21).toString('hex')}`;
    return createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonAddress, chainId);
  }
  return null!;
}

export function createAccountBalanceInstruction(solanaWallet: PublicKey, neonEvmProgram: PublicKey, neonWallet: string, chainId: number): TransactionInstruction {
  const [neonWalletAddress] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
  const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const keys = [
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: balanceAddress, isSigner: false, isWritable: true },
    { pubkey: neonWalletAddress, isSigner: false, isWritable: true }
  ];
  const a = Buffer.from([EvmInstruction.AccountCreateBalance]);
  const b = Buffer.from(neonWallet.slice(2), 'hex');
  const c = numberTo64BitLittleEndian(chainId);
  const data = Buffer.concat([a, b, c]);
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function createClaimInstructionKeys(neonEmulate: NeonEmulate): ClaimInstructionResult {
  const legacyAccounts: SolanaAccount[] = [];
  const accountsMap = new Map<string, AccountMeta>();
  if (neonEmulate!) {
    const { accounts = [], solana_accounts = [] } = neonEmulate;
    for (const account of accounts) {
      const key = account['account'];
      accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
      if (account['contract']) {
        const key = account['contract'];
        accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
      }
    }
    for (const account of solana_accounts) {
      const { pubkey, is_legacy, is_writable } = account;
      accountsMap.set(pubkey, {
        pubkey: new PublicKey(pubkey),
        isSigner: false,
        isWritable: is_writable
      });
      if (is_legacy) {
        legacyAccounts.push(account);
      }
    }
  }
  return { neonKeys: Array.from(accountsMap.values()), legacyAccounts };
}

export async function createClaimInstruction<TxResult extends TransactionResult>(config: { proxyApi: NeonProxyRpcApi, neonTransaction: TxResult | any, connection: Connection, signerAddress: HexString, neonEvmProgram: PublicKey, splToken: SPLToken, associatedTokenAddress: PublicKey }): Promise<ClaimInstructionResult> {
  const { proxyApi, neonTransaction, connection, signerAddress, neonEvmProgram, splToken, associatedTokenAddress } = config;
  if (neonTransaction.rawTransaction) {
    const sourceAccount = await getOverriddenSourceSplAccount(connection, signerAddress, neonEvmProgram, splToken, associatedTokenAddress);
    //Need to pass overridden with delegate source account to tx emulator
    //Optional field: solanaOverrides - array of overridden accounts with delegate prop
    const neonEmulate: NeonEmulate = await proxyApi.neonEmulate([neonTransaction.rawTransaction.slice(2)]);
    return createClaimInstructionKeys(neonEmulate);
  }
  return { neonKeys: [], legacyAccounts: [], neonTransaction };
}

export async function getOverriddenSourceSplAccount(connection: Connection, signerAddress: HexString, neonEvmProgram: PublicKey, splToken: SPLToken, associatedTokenAddress: PublicKey): Promise<ExtendedAccountInfo> {
  const [authAccountAddressDelegate] = authAccountAddress(signerAddress, neonEvmProgram, splToken);
  const sourceAccountInfo = <AccountInfo<Buffer>>(await connection.getAccountInfo(associatedTokenAddress));
  return {...sourceAccountInfo, delegate: authAccountAddressDelegate};
}

export function createExecFromDataInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, neonEvmProgram: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[], proxyStatus: NeonProgramStatus): TransactionInstruction {
  const count = Number(proxyStatus.NEON_POOL_COUNT);
  const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
  const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
  const a = Buffer.from([EvmInstruction.TransactionExecuteFromInstruction]);
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

export function createHolderAccountInstruction(neonEvmProgram: PublicKey, solanaWallet: PublicKey, holderAccountPK: PublicKey): TransactionInstruction {
  const a = Buffer.from([EvmInstruction.HolderCreate]);
  const data = Buffer.concat([a]);
  const keys: AccountMeta[] = [
    { pubkey: holderAccountPK, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
  ];
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function createExecFromDataInstructionV2(solanaWallet: PublicKey, neonWallet: string, holderAccountPK: PublicKey, neonEvmProgram: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[], chainId: number, neonPoolCount = NEON_STATUS_DEVNET_SNAPSHOT.NEON_POOL_COUNT): TransactionInstruction {
  const count = Number(neonPoolCount ?? NEON_STATUS_DEVNET_SNAPSHOT.NEON_POOL_COUNT);
  const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
  const [balanceAccount] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
  const a = Buffer.from([EvmInstruction.TransactionExecuteFromInstruction]);
  const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
  const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
  const data = Buffer.concat([a, b, c]);
  const keys: AccountMeta[] = [
    //Add holder account
    { pubkey: holderAccountPK, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
    { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
    { pubkey: balanceAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: true },
    ...neonKeys
  ];

  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function createMintNeonTransaction<T>(neonWallet: string, splToken: SPLToken, data: string): T {
  return { data, from: neonWallet, to: splToken.address, value: `0x0` } as T;
}

export function createMintSolanaTransaction(solanaWallet: PublicKey, tokenMint: PublicKey, associatedToken: PublicKey, neonHeapFrame = NEON_HEAP_FRAME): Transaction {
  return createAssociatedTokenAccountTransaction(solanaWallet, tokenMint, associatedToken, neonHeapFrame);
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

export function createAssociatedTokenAccountTransaction(solanaWallet: PublicKey, tokenMint: PublicKey, associatedToken: PublicKey, neonHeapFrame = NEON_HEAP_FRAME): Transaction {
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const transaction = new Transaction({ feePayer: solanaWallet });
  transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, neonHeapFrame));
  transaction.add(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
  return transaction;
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
