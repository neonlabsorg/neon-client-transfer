import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  authAccountAddress,
  collateralPoolAddress,
  neonBalanceProgramAddress,
  neonBalanceProgramAddressV2, Provider,
  toBytesInt32,
  TransactionResult
} from './utils';
import {
  EvmInstruction,
  NeonMintTxParams
} from './models';
import {
  COMPUTE_BUDGET_ID,
  NEON_HEAP_FRAME,
  NEON_TREASURY_POOL_COUNT
} from './data';
import {
  createAccountBalanceForLegacyAccountInstruction,
  createAccountBalanceInstruction,
  createApproveDepositInstruction,
  createComputeBudgetHeapFrameInstruction
} from './mint-transfer';

/**
 * Creates a mainnet version of the Neon Transfer Mint Transaction without creating a holder account.
 *
 * This function generates a transaction to transfer SPL tokens from Solana to NeonEVM for mainnet use.
 * Unlike the default mint transaction, it skips the creation of the holder account. The function handles
 * various operations such as approving deposits, computing budgets, and executing Neon transactions.
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
export async function neonTransferMintTransactionMainnet<W extends Provider, TxResult extends TransactionResult>(params: NeonMintTxParams<W, TxResult>): Promise<Transaction> {
  const { connection, neonEvmProgram, solanaWallet, neonWallet, emulateSigner, neonKeys, legacyAccounts, neonTransaction, splToken, amount, chainId, neonHeapFrame = NEON_HEAP_FRAME, neonPoolCount = NEON_TREASURY_POOL_COUNT } = params;
  const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
  const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
  const [neonWalletBalanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const [emulateSignerBalanceAddress] = neonBalanceProgramAddress(emulateSigner.address, neonEvmProgram, chainId);
  const neonWalletBalanceAccount = await connection.getAccountInfo(neonWalletBalanceAddress);
  const emulateSignerBalanceAccount = await connection.getAccountInfo(emulateSignerBalanceAddress);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
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
    transaction.add(createExecFromDataInstructionV2Mainnet(solanaWallet, neonWallet, neonEvmProgram, neonTransaction.rawTransaction, neonKeys, chainId, neonPoolCount));
  }

  return transaction;
}


export function createExecFromDataInstructionV2Mainnet(solanaWallet: PublicKey, neonWallet: string, neonEvmProgram: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[], chainId: number, neonPoolCount = NEON_TREASURY_POOL_COUNT): TransactionInstruction {
  const count = Number(neonPoolCount ?? NEON_TREASURY_POOL_COUNT);
  const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
  const [balanceAccount] = neonBalanceProgramAddressV2(neonWallet, solanaWallet, neonEvmProgram, chainId);
  const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
  const a = Buffer.from([EvmInstruction.TransactionExecuteFromInstructionMainnet]);
  const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
  const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
  const data = Buffer.concat([a, b, c]);
  const keys: AccountMeta[] = [
    { pubkey: solanaWallet, isSigner: true, isWritable: true },
    { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
    { pubkey: balanceAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: true },
    ...neonKeys
  ];

  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
