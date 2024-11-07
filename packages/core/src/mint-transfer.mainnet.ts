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
