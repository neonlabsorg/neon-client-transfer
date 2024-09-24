import { AccountMeta, PublicKey } from '@solana/web3.js';

export const enum EvmInstruction {
  CreateAccountV02 = 0x18, // 24
  CollectTreasure = 0x1e, // 30
  TransactionStepFromData = 0x20, //  32
  TransactionStepFromAccount = 0x21, //  33
  TransactionStepFromAccountNoChainId = 0x22, //  34
  CancelWithHash = 0x23, //  35
  HolderCreate = 0x24, //  36
  HolderDelete = 0x25, //  37
  HolderWrite = 0x26, //  38
  DepositV03 = 0x27, //  39
  CreateAccountV03 = 0x28, //  40
  AccountCreateBalance = 0x30, // 48
  DepositToBalance = 0x31, // 49
  TransactionExecuteFromInstruction = 0x3D, //  61
  TransactionExecuteFromInstructionMainnet = 0x32, //  50
}

export const enum AccountHex {
  SeedVersion = 0x03
}

export interface CreateAccountWithSeedParams {
  neonEvmProgram: PublicKey;
  solanaWallet: PublicKey;
  holderAccountPK: PublicKey;
  seed: string;
}

export interface CreateExecFromDataInstructionParams {
  solanaWallet: PublicKey;
  neonWallet: string;
  holderAccount: PublicKey;
  neonEvmProgram: PublicKey;
  neonRawTransaction: string;
  neonKeys: AccountMeta[];
  chainId: number;
  neonPoolCount: number;
}
