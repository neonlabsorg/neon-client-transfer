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
  AccountLayout,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createApproveInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  RawAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import {
  Amount,
  ClaimInstructionConfig,
  ClaimInstructionResult,
  EvmInstruction,
  ExtendedAccountInfo,
  ICreateAccountWithSeedParams,
  ICreateExecFromDataInstructionParams,
  NeonComputeUnits,
  NeonEmulate,
  NeonHeapFrame,
  NeonProgramStatus,
  SolanaAccount,
  SolanaOverrides,
  SourceSplAccountConfig,
  SPLToken
} from './models';
import {
  COMPUTE_BUDGET_ID,
  NEON_COMPUTE_UNITS,
  NEON_HEAP_FRAME,
  NEON_STATUS_DEVNET_SNAPSHOT,
  NEON_TREASURY_POOL_COUNT
} from './data';
import {
  authAccountAddress,
  collateralPoolAddress,
  holderAccountData,
  neonBalanceProgramAddress,
  neonBalanceProgramAddressV2,
  neonWalletProgramAddress,
  numberTo64BitLittleEndian,
  Provider,
  toBytesInt32,
  toFullAmount,
  TransactionResult
} from './utils';

export async function neonTransferMintTransaction<W extends Provider, TxResult extends TransactionResult>(connection: Connection, neonEvmProgram: PublicKey, solanaWallet: PublicKey, neonWallet: string, emulateSigner: W, neonKeys: AccountMeta[], legacyAccounts: SolanaAccount[], neonTransaction: TxResult, splToken: SPLToken, amount: bigint, chainId: number, neonHeapFrame: NeonHeapFrame = NEON_HEAP_FRAME, neonPoolCount = NEON_TREASURY_POOL_COUNT): Promise<Transaction> {
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
  const [neonWalletBalanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const [emulateSignerBalanceAddress] = neonBalanceProgramAddress(emulateSigner.address, neonEvmProgram, chainId);
  const neonWalletBalanceAccount = await connection.getAccountInfo(neonWalletBalanceAddress);
  const emulateSignerBalanceAccount = await connection.getAccountInfo(emulateSignerBalanceAddress);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const holderAccount = await holderAccountData(neonEvmProgram, solanaWallet);

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

  if (neonTransaction?.rawTransaction) {
    //Create acc with seed
    const createAccountWithSeedParams = {neonEvmProgram, solanaWallet, holderAccountPK: holderAccount.holderPk, seed: holderAccount.seed};
    transaction.add(createAccountWithSeedInstruction(createAccountWithSeedParams));
    transaction.add(createHolderAccountInstruction(createAccountWithSeedParams));
    transaction.add(createExecFromDataInstructionV2({solanaWallet, neonWallet, holderAccountPK: holderAccount.holderPk, neonEvmProgram, neonRawTransaction: neonTransaction.rawTransaction, neonKeys, chainId, neonPoolCount}));
    transaction.add(deleteHolderAccountInstruction(neonEvmProgram, solanaWallet, holderAccount.holderPk));
  }

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
    const { accounts = [], solanaAccounts = [] } = neonEmulate;
    for (const account of accounts) {
      const key = account['account'];
      accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
      if (account['contract']) {
        const key = account['contract'];
        accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
      }
    }
    for (const account of solanaAccounts) {
      const { pubkey, isLegacy, isWritable } = account;
      accountsMap.set(pubkey, {
        pubkey: new PublicKey(pubkey),
        isSigner: false,
        isWritable: isWritable
      });
      if (isLegacy) {
        legacyAccounts.push(account);
      }
    }
  }
  return { neonKeys: Array.from(accountsMap.values()), legacyAccounts };
}

export async function createClaimInstruction<TxResult extends TransactionResult>(config: ClaimInstructionConfig<TxResult>): Promise<ClaimInstructionResult> {
  const { proxyApi, neonTransaction, connection, signerAddress, neonEvmProgram, splToken, associatedTokenAddress, fullAmount } = config;
  if (neonTransaction.rawTransaction) {
    if(splToken.symbol.toUpperCase() !== 'WSOL') { //TODO: Add support for WSOL
      const overriddenSourceAccount = await getOverriddenSourceSplAccount({connection, signerAddress, neonEvmProgram, splToken, fullAmount, associatedTokenAddress});
      const solanaOverrides: SolanaOverrides = { solanaOverrides: { [associatedTokenAddress.toBase58()]: overriddenSourceAccount } }
      console.log('Solana Overrides', solanaOverrides);
    }
    const neonEmulate: NeonEmulate = await proxyApi.neonEmulate([neonTransaction.rawTransaction.slice(2)]);
    console.log('Emulator result', neonEmulate);
    return createClaimInstructionKeys(neonEmulate);
  }
  return { neonKeys: [], legacyAccounts: [], neonTransaction };
}

export async function getOverriddenSourceSplAccount(config: SourceSplAccountConfig): Promise<ExtendedAccountInfo | any> {
  const {connection, signerAddress, neonEvmProgram, splToken, fullAmount, associatedTokenAddress} = config;
  const [authAccountAddressDelegate] = authAccountAddress(signerAddress, neonEvmProgram, splToken);
  const sourceAccountInfo = <AccountInfo<Buffer>>(await connection.getAccountInfo(associatedTokenAddress));
  const tokenAccountInfo = AccountLayout.decode(sourceAccountInfo.data);
  //For the completely new accounts delegate will be changed
  const updatedTokenAccountInfo = <RawAccount>{...tokenAccountInfo, delegateOption: 1, delegatedAmount: fullAmount, delegate: authAccountAddressDelegate};
  //Encode data to hex string for the neon proxy
  const buffer = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode(updatedTokenAccountInfo, buffer);

  const dataHexString = buffer.toString('hex');

  return {
    lamports: sourceAccountInfo.lamports,
    data: `0x${dataHexString}`,
    owner: sourceAccountInfo.owner.toBase58(),
    executable: sourceAccountInfo.executable,
    rentEpoch: 0,
  };
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

export function createAccountWithSeedInstruction(createAccountWithSeedParams: ICreateAccountWithSeedParams): TransactionInstruction {
  const { solanaWallet, seed, holderAccountPK, neonEvmProgram } = createAccountWithSeedParams;
  const space=128 * 1024; //128KB

  return SystemProgram.createAccountWithSeed({
      fromPubkey: solanaWallet,
      basePubkey: solanaWallet,
      seed, // should be the same as for derived account
      newAccountPubkey: holderAccountPK,
      lamports: 0,
      space,
      programId: neonEvmProgram
    });
}

export function createHolderAccountInstruction(createAccountWithSeedParams: ICreateAccountWithSeedParams): TransactionInstruction {
  const { solanaWallet, seed, holderAccountPK, neonEvmProgram } = createAccountWithSeedParams;
  const instruction = Buffer.from([EvmInstruction.HolderCreate]);
  const seedLength = Buffer.alloc(8);
  seedLength.writeUInt32LE(seed.length, 0);

  const seedBuffer = Buffer.from(seed, 'utf-8');

  // Combine the opcode, seed length, and seed into a single Buffer
  const data = Buffer.concat([instruction, seedLength, seedBuffer]);

  const keys: AccountMeta[] = [
    { pubkey: holderAccountPK, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function deleteHolderAccountInstruction(neonEvmProgram: PublicKey, solanaWallet: PublicKey, holderAccountPK: PublicKey): TransactionInstruction {
  const data = Buffer.from([EvmInstruction.HolderDelete]);
  const keys: AccountMeta[] = [
    { pubkey: holderAccountPK, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function createExecFromDataInstructionV2(createExecFromDataInstructionParams: ICreateExecFromDataInstructionParams): TransactionInstruction {
  const { solanaWallet, neonWallet, holderAccountPK, neonEvmProgram, neonRawTransaction, neonPoolCount, chainId, neonKeys } = createExecFromDataInstructionParams;
  const count = Number(neonPoolCount ?? NEON_STATUS_DEVNET_SNAPSHOT.NEON_POOL_COUNT);
  const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
  const [balanceAccount] = neonBalanceProgramAddressV2(neonWallet, solanaWallet, neonEvmProgram, chainId);
  const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
  const a = Buffer.from([EvmInstruction.TransactionExecuteFromInstruction]);
  const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
  const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
  const data = Buffer.concat([a, b, c]);
  const keys: AccountMeta[] = [
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
