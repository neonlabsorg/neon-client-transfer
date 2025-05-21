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
  AccountBalanceInstructionParams,
  AccountV3InstructionParams,
  ApproveDepositInstructionParams,
  AssociatedTokenAccountInstructionParams,
  AssociatedTokenAccountTransactionParams,
  ClaimInstructionConfig,
  ClaimInstructionResult,
  CreateAccountWithSeedParams,
  CreateExecFromDataInstructionParams,
  EvmInstruction,
  ExtendedAccountInfo,
  LegacyAccountBalanceInstructionParams,
  NeonComputeUnits,
  NeonEmulate,
  NeonHeapFrame,
  NeonMintTxParams,
  NeonProgramStatus,
  SolanaAccount,
  SourceSplAccountConfig,
  SPLToken,
  WrapSOLTransactionParams
} from './models';
import {
  COMPUTE_BUDGET_ID,
  NEON_COMPUTE_UNITS,
  NEON_HEAP_FRAME,
  NEON_STATUS_DEVNET_SNAPSHOT,
  NEON_TREASURY_POOL_COUNT,
  RENT_EPOCH_ZERO
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

/**
 * Creates a devnet version of the Neon Transfer Mint Transaction with holder account creation.
 *
 * This function generates a transaction to transfer SPL tokens from Solana to NeonEVM on the devnet.
 * Unlike the mainnet version, this transaction creates a holder account to enhance performance. The
 * holder account is utilized temporarily during the transaction, allowing for optimized execution.
 *
 * @template W - The type of the provider, generally extending the `Provider` type.
 * @template TxResult - The type of the transaction result, generally extending `TransactionResult`.
 *
 * @param {NeonMintTxParams<W, TxResult>} params - The parameters required to create the Neon mint transaction.
 * @param {Connection} params.connection - The Solana connection object used to interact with the blockchain.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program on Solana.
 * @param {PublicKey} params.solanaWallet - The public key of the user's Solana wallet, which will serve as the fee payer.
 * @param {string} params.neonWallet - The address of the Neon wallet.
 * @param {EmulateSigner} params.emulateSigner - The signer to emulate the transaction.
 * @param {NeonKeys[]} params.neonKeys - The keys needed for the Neon transaction.
 * @param {LegacyAccount[]} params.legacyAccounts - The legacy accounts that need to have their balance accounts to be created.
 * @param {NeonTransaction} params.neonTransaction - The transaction data for the NeonEVM chain.
 * @param {SPLToken} params.splToken - The SPL token object representing the token being transferred.
 * @param {Amount} params.amount - The amount of tokens to be transferred.
 * @param {number} params.chainId - Neon EVM chain ID for which the transaction is being created.
 * @param {number} [params.neonHeapFrame=NEON_HEAP_FRAME] - The heap frame value for computing the budget program.
 * @param {number} [params.neonPoolCount=NEON_TREASURY_POOL_COUNT] - The number of treasury pools.
 *
 * @returns {Promise<Transaction>} - A Promise that resolves to the generated Solana transaction.
 */
export async function neonTransferMintTransaction<W extends Provider, TxResult extends TransactionResult>(params: NeonMintTxParams<W, TxResult>): Promise<Transaction> {
  const { connection, neonEvmProgram, solanaWallet, neonWallet, emulateSigner, neonKeys, legacyAccounts, neonTransaction, splToken, amount, chainId, neonHeapFrame = NEON_HEAP_FRAME, neonPoolCount = NEON_TREASURY_POOL_COUNT } = params;
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
  const [neonWalletBalanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const [emulateSignerBalanceAddress] = neonBalanceProgramAddress(emulateSigner.address, neonEvmProgram, chainId);
  const neonWalletBalanceAccount = await connection.getAccountInfo(neonWalletBalanceAddress);
  const emulateSignerBalanceAccount = await connection.getAccountInfo(emulateSignerBalanceAddress);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const [holderAccount, holderSeed] = await holderAccountData(neonEvmProgram, solanaWallet);

  const transaction = new Transaction({ feePayer: solanaWallet });

  transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, neonHeapFrame));
  transaction.add(createApproveDepositInstruction({ solanaWallet, neonPDAWallet: delegatePDA, associatedToken: associatedTokenAddress, amount }));

  if (!neonWalletBalanceAccount) {
    transaction.add(createAccountBalanceInstruction({ solanaWallet, neonEvmProgram, neonWallet, chainId }));
  }

  if (!emulateSignerBalanceAccount) {
    transaction.add(createAccountBalanceInstruction({ solanaWallet, neonEvmProgram, neonWallet: emulateSigner.address, chainId }));
  }

  for (const account of legacyAccounts) {
    const instruction = await createAccountBalanceForLegacyAccountInstruction({ connection, account, solanaWallet, neonEvmProgram, chainId });
    if (instruction) {
      transaction.add(instruction);
    }
  }

  if (neonTransaction?.rawTransaction) {
    //Create acc with seed
    const createAccountWithSeedParams = {
      neonEvmProgram,
      solanaWallet,
      holderAccountPK: holderAccount,
      seed: holderSeed
    };
    transaction.add(createAccountWithSeedInstruction(createAccountWithSeedParams));
    transaction.add(createHolderAccountInstruction(createAccountWithSeedParams));
    transaction.add(createExecFromDataInstructionV2({
      solanaWallet,
      neonWallet,
      holderAccount: holderAccount,
      neonEvmProgram,
      neonRawTransaction: neonTransaction.rawTransaction,
      neonKeys,
      chainId,
      neonPoolCount
    }));
    transaction.add(deleteHolderAccountInstruction(neonEvmProgram, solanaWallet, holderAccount));
  }

  return transaction;
}

/**
 * Creates a Compute Budget Utilities instruction for a given program.
 *
 * @param {PublicKey} programId - The public key of the target program.
 * @param {NeonComputeUnits} [computeUnits=NEON_COMPUTE_UNITS] - The number of compute units to be used (defaults to `NEON_COMPUTE_UNITS`).
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for setting the compute budget.
 *
 * @example
 * ```typescript
 * const instruction = createComputeBudgetUtilsInstruction(myProgramId, 500_000);
 * transaction.add(instruction);
 * ```
 */
export function createComputeBudgetUtilsInstruction(programId: PublicKey, computeUnits: NeonComputeUnits = NEON_COMPUTE_UNITS): TransactionInstruction {
  const a = Buffer.from([0x00]);
  const b = Buffer.from(toBytesInt32(parseInt(computeUnits ?? NEON_COMPUTE_UNITS)));
  const c = Buffer.from(toBytesInt32(0));
  const data = Buffer.concat([a, b, c]);
  return new TransactionInstruction({ programId, data, keys: [] });
}

/**
 * Creates a Compute Budget Heap Frame instruction for a given program.
 *
 * @param {PublicKey} programId - The public key of the target program.
 * @param {NeonHeapFrame} [neonHeapFrame=NEON_HEAP_FRAME] - The heap frame size to be allocated (defaults to `NEON_HEAP_FRAME`).
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for setting the heap frame size.
 *
 * @example
 * ```typescript
 * const instruction = createComputeBudgetHeapFrameInstruction(myProgramId, 256_000);
 * transaction.add(instruction);
 * ```
 */
export function createComputeBudgetHeapFrameInstruction(programId: PublicKey, neonHeapFrame: NeonHeapFrame = NEON_HEAP_FRAME): TransactionInstruction {
  const a = Buffer.from([0x01]);
  const b = Buffer.from(toBytesInt32(parseInt(neonHeapFrame ?? NEON_HEAP_FRAME)));
  const data = Buffer.concat([a, b]);
  return new TransactionInstruction({ programId, data, keys: [] });
}

/**
 * Creates an instruction to approve a deposit transaction.
 *
 * @param {ApproveDepositInstructionParams} params - The parameters required for the instruction.
 * @param {PublicKey} params.solanaWallet - The public key of the Solana wallet approving the deposit.
 * @param {PublicKey} params.neonPDAWallet - The public key of the Neon PDA wallet that will receive the deposit.
 * @param {PublicKey} params.associatedToken - The public key of the associated token account.
 * @param {number} params.amount - The amount of tokens to approve for deposit.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for approving the deposit.
 *
 * @example
 * ```typescript
 * const instruction = createApproveDepositInstruction({
 *   solanaWallet: userWallet,
 *   neonPDAWallet: neonWalletPDA,
 *   associatedToken: userTokenAccount,
 *   amount: 1000000,
 * });
 * transaction.add(instruction);
 * ```
 */
export function createApproveDepositInstruction({
   solanaWallet,
   neonPDAWallet,
   associatedToken,
   amount,
}: ApproveDepositInstructionParams): TransactionInstruction {
  return createApproveInstruction(associatedToken, neonPDAWallet, solanaWallet, amount);
}

export function createAccountV3Instruction({
  solanaWallet,
  neonPDAWallet,
  neonEvmProgram,
  neonWallet,
}: AccountV3InstructionParams): TransactionInstruction {
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

/**
 * Creates an instruction to retrieve the account balance for a legacy Neon account.
 *
 * @param {LegacyAccountBalanceInstructionParams} params - The parameters required for the instruction.
 * @param {Connection} params.connection - The Solana blockchain connection.
 * @param {AccountInfo} params.account - The legacy Neon account whose balance needs to be checked.
 * @param {PublicKey} params.solanaWallet - The public key of the Solana wallet.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program.
 * @param {number} params.chainId - The chain ID of the target blockchain.
 * @returns {Promise<TransactionInstruction | null>} A promise resolving to a `TransactionInstruction` for retrieving the account balance, or `null` if the account does not exist.
 *
 * @example
 * ```typescript
 * const instruction = await createAccountBalanceForLegacyAccountInstruction({
 *   connection,
 *   account,
 *   solanaWallet,
 *   neonEvmProgram,
 *   chainId: 245022926
 * });
 * if (instruction) {
 *   transaction.add(instruction);
 * }
 * ```
 */
export async function createAccountBalanceForLegacyAccountInstruction({
  connection,
  account,
  solanaWallet,
  neonEvmProgram,
  chainId
}: LegacyAccountBalanceInstructionParams): Promise<TransactionInstruction | null> {
  const accountAddress = new PublicKey(account.pubkey);
  const accountInfo = await connection.getAccountInfo(accountAddress);
  if (accountInfo) {
    const neonAddress = `0x${accountInfo?.data.slice(1, 21).toString('hex')}`;
    return createAccountBalanceInstruction({ solanaWallet, neonEvmProgram, neonWallet: neonAddress, chainId });
  }
  return null!;
}

/**
 * Creates an instruction to retrieve the balance account for a Neon EVM wallet.
 *
 * @param {AccountBalanceInstructionParams} params - The parameters required for the instruction.
 * @param {PublicKey} params.solanaWallet - The public key of the Solana wallet initiating the request.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program.
 * @param {string} params.neonWallet - The Ethereum-style Neon wallet address in hex format.
 * @param {number} params.chainId - The chain ID of the target blockchain.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for retrieving the Neon wallet balance.
 *
 * @example
 * ```typescript
 * const instruction = createAccountBalanceInstruction({
 *   solanaWallet: userWallet,
 *   neonEvmProgram: neonProgram,
 *   neonWallet: "0x1234567890abcdef1234567890abcdef12345678",
 *   chainId: 245022926
 * });
 * transaction.add(instruction);
 * ```
 */
export function createAccountBalanceInstruction({
  solanaWallet,
  neonEvmProgram,
  neonWallet,
  chainId,
}: AccountBalanceInstructionParams): TransactionInstruction {
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

/**
 * Creates and returns the required account keys for a claim instruction based on the provided Neon emulation data.
 *
 * @param {NeonEmulate} neonEmulate - The Neon emulation data containing Ethereum and Solana accounts.
 * @returns {ClaimInstructionResult} An object containing:
 *   - `neonKeys`: An array of `AccountMeta` objects representing the required account keys.
 *   - `legacyAccounts`: An array of legacy Solana accounts associated with the claim instruction.
 *
 * @example
 * ```typescript
 * const claimKeys = createClaimInstructionKeys(neonEmulateData);
 * console.log(claimKeys.neonKeys, claimKeys.legacyAccounts);
 * ```
 */
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

/**
 * Creates a claim instruction based on the provided transaction configuration.
 *
 * @template TxResult - The expected type of the transaction result.
 * @param {ClaimInstructionConfig<TxResult>} config - The configuration parameters for the claim instruction.
 * @param {ProxyApi} config.proxyApi - The API interface for interacting with the proxy.
 * @param {NeonTransaction} config.neonTransaction - The Neon transaction object.
 * @param {Connection} config.connection - The Solana blockchain connection.
 * @param {PublicKey} config.signerAddress - The public key of the transaction signer.
 * @param {PublicKey} config.neonEvmProgram - The public key of the Neon EVM program.
 * @param {SPLToken} config.splToken - The SPL token used in the transaction.
 * @param {PublicKey} config.associatedTokenAddress - The associated token account address.
 * @param {number} config.fullAmount - The full amount involved in the claim transaction.
 * @returns {Promise<ClaimInstructionResult>} A promise resolving to an object containing:
 *   - `neonKeys`: An array of `AccountMeta` objects representing required account keys.
 *   - `legacyAccounts`: An array of legacy Solana accounts.
 *   - `neonTransaction`: The original Neon transaction.
 *
 * @example
 * ```typescript
 * const claimInstruction = await createClaimInstruction({
 *   proxyApi,
 *   neonTransaction,
 *   connection,
 *   signerAddress,
 *   neonEvmProgram,
 *   splToken,
 *   associatedTokenAddress,
 *   fullAmount
 * });
 * console.log(claimInstruction);
 * ```
 */
export async function createClaimInstruction<TxResult extends TransactionResult>(config: ClaimInstructionConfig<TxResult>): Promise<ClaimInstructionResult> {
  const { proxyApi, neonTransaction, solanaTransactions } = config;
  if (neonTransaction.rawTransaction) {
    const neonEmulate: NeonEmulate = await proxyApi.neonEmulate(neonTransaction.rawTransaction.slice(2), solanaTransactions);
    console.log('Emulator result', neonEmulate);
    return createClaimInstructionKeys(neonEmulate);
  }
  return { neonKeys: [], legacyAccounts: [], neonTransaction };
}


export async function getOverriddenSourceSplAccount(config: SourceSplAccountConfig): Promise<ExtendedAccountInfo | any> {
  const {
    connection,
    signerAddress,
    neonEvmProgram,
    splToken,
    fullAmount,
    associatedTokenAddress
  } = config;
  const [authAccountAddressDelegate] = authAccountAddress(signerAddress, neonEvmProgram, splToken);
  const sourceAccountInfo = <AccountInfo<Buffer>>(await connection.getAccountInfo(associatedTokenAddress));
  if (sourceAccountInfo) {
    const tokenAccountInfo = AccountLayout.decode(sourceAccountInfo.data);
    //For the completely new accounts delegate will be changed
    const updatedTokenAccountInfo = <RawAccount>{
      ...tokenAccountInfo,
      delegateOption: 1,
      delegatedAmount: fullAmount,
      delegate: authAccountAddressDelegate
    };
    //Encode data to hex string for the neon proxy
    const buffer = Buffer.alloc(AccountLayout.span);
    AccountLayout.encode(updatedTokenAccountInfo, buffer);

    const dataHexString = buffer.toString('hex');

    return {
      lamports: sourceAccountInfo.lamports,
      data: `0x${dataHexString}`,
      owner: sourceAccountInfo.owner.toBase58(),
      executable: sourceAccountInfo.executable,
      rentEpoch: RENT_EPOCH_ZERO
    };
  }
  return null;
}

/**
 * @deprecated This method is deprecated and may be removed in future versions.
 * Use an updated execution instruction createExecFromDataInstructionV2 method instead.
 *
 * Creates an execution instruction from raw transaction data.
 *
 * @param {PublicKey} solanaWallet - The public key of the Solana wallet initiating the transaction.
 * @param {PublicKey} neonPDAWallet - The public key of the Neon PDA wallet.
 * @param {PublicKey} neonEvmProgram - The public key of the Neon EVM program.
 * @param {string} neonRawTransaction - The raw Neon transaction in hex format.
 * @param {AccountMeta[]} neonKeys - The list of required account metadata.
 * @param {NeonProgramStatus} proxyStatus - The status of the Neon program including treasury pool count.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for executing the Neon transaction.
 *
 */
export function createExecFromDataInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, neonEvmProgram: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[], proxyStatus: NeonProgramStatus): TransactionInstruction {
  const count = Number(proxyStatus.neonTreasuryPoolCount);
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

/**
 * Creates an instruction to generate an account using a seed.
 *
 * This function constructs a Solana `TransactionInstruction` for creating an account
 * derived from a seed. The account is initialized with 128KB of allocated space.
 *
 * @param {CreateAccountWithSeedParams} createAccountWithSeedParams - The parameters required for creating the account.
 * @param {PublicKey} createAccountWithSeedParams.solanaWallet - The public key of the Solana wallet initiating the transaction.
 * @param {string} createAccountWithSeedParams.seed - The seed string used to derive the account.
 * @param {PublicKey} createAccountWithSeedParams.holderAccountPK - The public key of the derived holder account.
 * @param {PublicKey} createAccountWithSeedParams.neonEvmProgram - The public key of the Neon EVM program.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for creating the account with a seed.
 *
 * @example
 * ```typescript
 * const instruction = createAccountWithSeedInstruction({
 *   solanaWallet: userWallet,
 *   seed: "unique-seed",
 *   holderAccountPK: derivedAccount,
 *   neonEvmProgram: neonProgram
 * });
 * transaction.add(instruction);
 * ```
 */
export function createAccountWithSeedInstruction(createAccountWithSeedParams: CreateAccountWithSeedParams): TransactionInstruction {
  const { solanaWallet, seed, holderAccountPK, neonEvmProgram } = createAccountWithSeedParams;
  const space = 128 * 1024; //128KB

  return SystemProgram.createAccountWithSeed({
    seed, // should be the same as for derived account
    lamports: 0,
    space,
    fromPubkey: solanaWallet,
    basePubkey: solanaWallet,
    newAccountPubkey: holderAccountPK,
    programId: neonEvmProgram
  });
}

/**
 * Creates an instruction to initialize a holder account using a seeded address.
 *
 * This function generates a `TransactionInstruction` that initializes a new holder account
 * by encoding the seed into the transaction data.
 *
 * @param {CreateAccountWithSeedParams} createAccountWithSeedParams - The parameters required to create the holder account.
 * @param {PublicKey} createAccountWithSeedParams.solanaWallet - The public key of the Solana wallet initiating the transaction.
 * @param {string} createAccountWithSeedParams.seed - The seed string used to derive the holder account.
 * @param {PublicKey} createAccountWithSeedParams.holderAccountPK - The public key of the derived holder account created before.
 * @param {PublicKey} createAccountWithSeedParams.neonEvmProgram - The public key of the Neon EVM program.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for creating the holder account.
 *
 * @example
 * ```typescript
 * const instruction = createHolderAccountInstruction({
 *   solanaWallet: userWallet,
 *   seed: "unique-seed",
 *   holderAccountPK: derivedAccount,
 *   neonEvmProgram: neonProgram
 * });
 * transaction.add(instruction);
 * ```
 */
export function createHolderAccountInstruction(createAccountWithSeedParams: CreateAccountWithSeedParams): TransactionInstruction {
  const { solanaWallet, seed, holderAccountPK, neonEvmProgram } = createAccountWithSeedParams;
  const instruction = Buffer.from([EvmInstruction.HolderCreate]);
  const seedLength = Buffer.alloc(8);
  seedLength.writeUInt32LE(seed.length, 0);

  const seedBuffer = Buffer.from(seed, 'utf-8');

  // Combine the opcode, seed length, and seed into a single Buffer
  const data = Buffer.concat([instruction, seedLength, seedBuffer]);

  const keys: AccountMeta[] = [
    { pubkey: holderAccountPK, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: false }
  ];
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

/**
 * Creates an instruction to delete a holder account from the Neon EVM program.
 *
 * This function generates a `TransactionInstruction` that allows a Solana wallet
 * to remove a holder account from the Neon EVM program.
 *
 * @param {PublicKey} neonEvmProgram - The public key of the Neon EVM program.
 * @param {PublicKey} solanaWallet - The public key of the Solana wallet initiating the transaction.
 * @param {PublicKey} holderAccountPK - The public key of the holder account to be deleted.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for deleting the holder account.
 *
 * @example
 * ```typescript
 * const instruction = deleteHolderAccountInstruction(neonProgram, userWallet, holderAccount);
 * transaction.add(instruction);
 * ```
 */
export function deleteHolderAccountInstruction(neonEvmProgram: PublicKey, solanaWallet: PublicKey, holderAccountPK: PublicKey): TransactionInstruction {
  const data = Buffer.from([EvmInstruction.HolderDelete]);
  const keys: AccountMeta[] = [
    { pubkey: holderAccountPK, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: false }
  ];
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

/**
 * Creates an execution instruction from raw transaction data.
 *
 * @param {CreateExecFromDataInstructionParams} params - The parameters required for the execution instruction.
 * @param {PublicKey} params.solanaWallet - The public key of the Solana wallet initiating the transaction.
 * @param {string} params.neonWallet - The Ethereum-style Neon wallet address in hex format.
 * @param {PublicKey} params.holderAccount - The public key of the holder account.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program.
 * @param {string} params.neonRawTransaction - The raw Neon transaction in hex format.
 * @param {number} params.neonPoolCount - The count of Neon Treasury Pools (optional, defaults to snapshot value).
 * @param {number} params.chainId - The chain ID of the target blockchain.
 * @param {AccountMeta[]} params.neonKeys - The list of required account metadata.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for executing the Neon transaction.
 *
 * @example
 * ```typescript
 * const instruction = createExecFromDataInstructionV2({
 *   solanaWallet: userWallet,
 *   neonWallet: "0x1234567890abcdef1234567890abcdef12345678",
 *   holderAccount: holderPubkey,
 *   neonEvmProgram: neonProgram,
 *   neonRawTransaction: "0xabcdef...",
 *   neonPoolCount: 10,
 *   chainId: 245022926,
 *   neonKeys: accountKeys
 * });
 * transaction.add(instruction);
 * ```
 */
export function createExecFromDataInstructionV2(params: CreateExecFromDataInstructionParams): TransactionInstruction {
  const {
    solanaWallet, neonWallet, holderAccount, neonEvmProgram,
    neonRawTransaction, neonPoolCount, chainId, neonKeys
  } = params;
  const count = Number(neonPoolCount ?? NEON_STATUS_DEVNET_SNAPSHOT.neonTreasuryPoolCount);
  const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
  const [balanceAccount] = neonBalanceProgramAddressV2(neonWallet, solanaWallet, neonEvmProgram, chainId);
  const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
  const a = Buffer.from([EvmInstruction.TransactionExecuteFromInstruction]);
  const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
  const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
  const data = Buffer.concat([a, b, c]);
  const keys: AccountMeta[] = [
    { pubkey: holderAccount, isSigner: false, isWritable: true },
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
    { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
    { pubkey: balanceAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: true },
    ...neonKeys
  ];

  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

/**
 * Creates a transaction object to mint Neon tokens.
 *
 * This function returns an object containing the necessary fields to create a mint transaction.
 * The fields include the data payload, source wallet address, target SPL token address, and a default value of `0`.
 *
 * @template T - The type to which the resulting object should be cast.
 * @param {string} neonWallet - The address of the Neon wallet that will be the source of the transaction.
 * @param {SPLToken} splToken - The SPL token object that contains the address to which the tokens are to be minted.
 * @param {string} data - Additional data payload to be included in the transaction.
 *
 * @returns {T} An object representing the mint transaction, cast to the specified type `T`.
 *
 * @example
 * // Example usage with TransactionRequest type from ethers.js:
 * import { TransactionRequest } from 'ethers';
 *
 * const transaction: TransactionRequest = createMintNeonTransaction<TransactionRequest>(
 *   '0xYourNeonWalletAddress',
 *   { address: '0xTokenAddress', address_spl: 'splTokenAddress', decimals: 18, symbol: 'TOKEN', ... },
 *   '0xTransactionData'
 * );
 */
export function createMintNeonTransaction<T>(neonWallet: string, splToken: SPLToken, data: string): T {
  return { data, from: neonWallet, to: splToken.address, value: `0x0` } as T;
}

export function createMintSolanaTransaction(solanaWallet: PublicKey, tokenMint: PublicKey, associatedToken: PublicKey, neonHeapFrame = NEON_HEAP_FRAME): Transaction {
  return createAssociatedTokenAccountTransaction({ solanaWallet, tokenMint, associatedToken, neonHeapFrame });
}

/**
 * Creates an instruction to initialize an associated token account.
 *
 * This function generates a `TransactionInstruction` to create an associated token account
 * for a given token mint and owner. The associated account is derived using the standard
 * Solana token program conventions.
 *
 * @param {AssociatedTokenAccountInstructionParams} params - The parameters required to create the associated token account.
 * @param {PublicKey} params.tokenMint - The public key of the token mint.
 * @param {PublicKey} params.associatedAccount - The public key of the associated token account to be created.
 * @param {PublicKey} params.owner - The public key of the owner of the associated token account.
 * @param {PublicKey} params.payer - The public key of the payer funding the account creation.
 * @param {PublicKey} [params.associatedProgramId=ASSOCIATED_TOKEN_PROGRAM_ID] - The public key of the associated token program (default: `ASSOCIATED_TOKEN_PROGRAM_ID`) from '@solana/spl-token' library.
 * @param {PublicKey} [params.programId=TOKEN_PROGRAM_ID] - The public key of the token program (default: `TOKEN_PROGRAM_ID`) from '@solana/spl-token' library.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for creating the associated token account.
 *
 * @example
 * ```typescript
 * const instruction = createAssociatedTokenAccountInstruction({
 *   tokenMint: tokenMintAddress,
 *   associatedAccount: associatedTokenAccount,
 *   owner: userWallet,
 *   payer: feePayer
 * });
 * transaction.add(instruction);
 * ```
 */
export function createAssociatedTokenAccountInstruction({
  tokenMint,
  associatedAccount,
  owner,
  payer,
  associatedProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
  programId = TOKEN_PROGRAM_ID,
}: AssociatedTokenAccountInstructionParams): TransactionInstruction {
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

/**
 * Creates a transaction to initialize an associated token account for a given wallet and token mint.
 *
 * This function generates a transaction that includes:
 * 1. A compute budget instruction to increase the heap frame size for Neon compatibility.
 * 2. An instruction to create an associated token account for the specified wallet and token mint.
 *
 * @param {AssociatedTokenAccountTransactionParams} params - Parameters to configure the associated token account creation.
 * @param {PublicKey} params.solanaWallet - The public key of the Solana wallet that will own the associated token account and pay for the transaction fees.
 * @param {PublicKey} params.tokenMint - The public key of the token mint for which the associated token account will be created.
 * @param {PublicKey} params.associatedToken - The public key of the associated token account.
 * @param {number} [params.neonHeapFrame=NEON_HEAP_FRAME] - Optional heap frame size for Neon compatibility, defaulting to NEON_HEAP_FRAME.
 *
 * @returns {Transaction} A new Solana `Transaction` containing the instructions to create the associated token account.
 */
export function createAssociatedTokenAccountTransaction({
  solanaWallet,
  tokenMint,
  associatedToken,
  neonHeapFrame = NEON_HEAP_FRAME,
}: AssociatedTokenAccountTransactionParams): Transaction {
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const transaction = new Transaction({ feePayer: solanaWallet });
  transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, neonHeapFrame));
  transaction.add(createAssociatedTokenAccountInstruction({ tokenMint, associatedAccount: associatedToken, owner: solanaWallet, payer: solanaWallet}));
  return transaction;
}

/**
 * Creates a transaction to wrap SOL into Wrapped SOL (wSOL).
 *
 * This function is used to generate a transaction that will wrap the specified amount of SOL
 * into Wrapped SOL (wSOL). It first verifies if the associated token account exists and creates
 * it if necessary, then transfers the SOL and synchronizes it as Wrapped SOL.
 *
 * @param {WrapSOLTransactionParams} params - An object containing the parameters required to wrap SOL.
 * @param {Connection} params.connection - The Solana blockchain connection object used to interact with the network.
 * @param {PublicKey} params.solanaWallet - The public key of the user's Solana wallet.
 * @param {Amount} params.amount - The amount of SOL to be wrapped as wSOL.
 * @param {SPLToken} params.splToken - The SPL token object representing SOL.
 * @returns {Promise<Transaction>} - A Promise that resolves to the generated transaction to wrap SOL as wSOL.
 *
 * @example
 * ```typescript
 * const connection = new Connection("https://api.devnet.solana.com");
 * const solanaWallet = new PublicKey("your_solana_wallet_public_key");
 * const amount = 1; // Amount of SOL to wrap
 * const splToken: SPLToken = {
 *   address: "erc20_sol_address",
 *   address_spl: "address_spl_value",
 *   chainId: 245022926,
 *   decimals: 9,
 *   logoURI: "logo_url",
 *   name: "Solana SOL",
 *   symbol: "SOL",
 * };
 *
 * createWrapSOLTransaction({ connection, solanaWallet, amount, splToken })
 *   .then((transaction) => {
 *     console.log("Wrap transaction created successfully:", transaction);
 *   })
 *   .catch((error) => {
 *     console.error("Failed to create wrap transaction:", error);
 *   });
 * ```
 */
export async function createWrapSOLTransaction({
  connection,
  solanaWallet,
  amount,
  splToken,
}: WrapSOLTransactionParams): Promise<Transaction> {
  const tokenMint = new PublicKey(splToken.address_spl);
  const lamports = toFullAmount(amount, splToken.decimals);
  const associatedToken = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedToken);

  const transaction = new Transaction({ feePayer: solanaWallet });
  const instructions: TransactionInstruction[] = [];

  if (!wSOLAccount) {
    instructions.push(createAssociatedTokenAccountInstruction({ tokenMint, associatedAccount: associatedToken, owner: solanaWallet, payer: solanaWallet }));
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

/**
 * Creates a transaction to unwrap a Wrapped SOL (wSOL) account.
 *
 * This function is used to generate a transaction that will close an associated token account,
 * which contains Wrapped SOL (wSOL), effectively unwrapping it back to SOL. It first verifies
 * if the associated token account exists before attempting to close it.
 *
 * @param {Connection} connection - The Solana blockchain connection object used to interact with the network.
 * @param {PublicKey} solanaWallet - The public key of the user's Solana wallet.
 * @param {SPLToken} splToken - The SPL token object that contains details of the Wrapped SOL.
 * @returns {Promise<Transaction>} - A Promise that resolves to the generated transaction to close the Wrapped SOL account.
 * @throws {Error} If the associated token account has not been created.
 *
 * @example
 * ```typescript
 * const connection = new Connection("https://api.devnet.solana.com");
 * const solanaWallet = new PublicKey("your_solana_wallet_public_key");
 * const splToken: SPLToken = {
 *   address: "erc20_wsol_address",
 *   address_spl: "address_spl_value",
 *   chainId: 245022926,
 *   decimals: 9,
 *   logoURI: "logo_url",
 *   name: "Wrapped SOL",
 *   symbol: "wSOL",
 * };
 *
 * createUnwrapSOLTransaction(connection, solanaWallet, splToken)
 *   .then((transaction) => {
 *     console.log("Unwrap transaction created successfully:", transaction);
 *   })
 *   .catch((error) => {
 *     console.error("Failed to create unwrap transaction:", error);
 *   });
 * ```
 */
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
