import { AccountMeta, Connection, PublicKey } from '@solana/web3.js';
import { SolanaAccount } from "./api";
import { Amount } from "./token";

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

type BaseNeonParams = {
  solanaWallet: PublicKey;
  neonEvmProgram: PublicKey;
};

type NeonWalletParams = BaseNeonParams & {
  neonWallet: string;
};

type ChainParams = {
  chainId: number;
};

export type CreateAccountWithSeedParams = BaseNeonParams & {
  holderAccountPK: PublicKey;
  seed: string;
};

export type CreateExecFromDataInstructionParams = NeonWalletParams & ChainParams & {
  holderAccount: PublicKey;
  neonRawTransaction: string;
  neonKeys: AccountMeta[];
  neonPoolCount: string;
};

export type AccountBalanceInstructionParams = NeonWalletParams & ChainParams;

export type LegacyAccountBalanceInstructionParams = BaseNeonParams & ChainParams & {
  connection: Connection;
  account: SolanaAccount;
};

export type AssociatedTokenAccountInstructionParams = {
  tokenMint: PublicKey;
  associatedAccount: PublicKey;
  owner: PublicKey;
  payer: PublicKey;
  associatedProgramId?: PublicKey;
  programId?: PublicKey;
}

export type ApproveDepositInstructionParams = {
  solanaWallet: PublicKey;
  neonPDAWallet: PublicKey;
  associatedToken: PublicKey;
  amount: number | bigint;
};

export type AccountV3InstructionParams = NeonWalletParams & {
  neonPDAWallet: PublicKey;
};

export type NeonDepositToBalanceInstructionParams = BaseNeonParams & NeonWalletParams & ChainParams & {
  tokenAddress: PublicKey;
  tokenMint: PublicKey;
  serviceWallet?: PublicKey;
}

export type NeonTransferInstructionParams = {
  neonTokenMint: PublicKey;
  solanaWallet: PublicKey;
  serviceWallet: PublicKey;
  rewardAmount: Amount;
};



