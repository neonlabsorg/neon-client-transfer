import { AccountMeta, Connection, PublicKey } from "@solana/web3.js";
import { NeonHeapFrame, SolanaAccount } from "./api";
import { NeonProxyRpcApi } from "../api";
import { Amount, NeonAddress, SPLToken } from "./token";
import { Provider, TransactionResult } from "../utils";

type TransactionConnectionParams = {
  connection: Connection;
  solanaWallet: PublicKey;
  splToken: SPLToken;
};

type BaseNeonParams = {
  neonEvmProgram: PublicKey;
  neonWallet: NeonAddress;
}

type BaseNeonTransactionParams = TransactionConnectionParams & BaseNeonParams & {
  chainId: number;
  neonHeapFrame?: NeonHeapFrame;
};

export type NeonMintTxParams<Signer extends Provider, TxResult extends TransactionResult> = BaseNeonTransactionParams & {
  amount: bigint;
  emulateSigner: Signer;
  neonKeys: AccountMeta[];
  legacyAccounts: SolanaAccount[];
  neonTransaction: TxResult;
  neonPoolCount?: string;
};

export type MintTransferParams<W> = BaseNeonTransactionParams & {
  amount: Amount;
  proxyApi: NeonProxyRpcApi;
  walletSigner: W;
};

export type WrapSOLTransactionParams = TransactionConnectionParams & {
  amount: Amount;
};

export type BaseTransactionParams<P> = {
  provider: P;
  amount: Amount;
  gasLimit?: bigint | number;
};

export type MintNeonTransactionParams<P> = BaseTransactionParams<P> & {
  neonWallet: string;
  associatedToken: PublicKey;
  splToken: SPLToken;
};

export type NeonTransactionParams<P> = BaseTransactionParams<P> & {
  from: string;
  to: string;
  solanaWallet: PublicKey;
};

export type AssociatedTokenAccountTransactionParams = {
  solanaWallet: PublicKey;
  tokenMint: PublicKey;
  associatedToken: PublicKey;
  neonHeapFrame?: NeonHeapFrame;
};

export type SolanaSOLTransferTransactionParams = TransactionConnectionParams & BaseNeonParams & {
  neonTokenMint: PublicKey;
  splToken: SPLToken;
  amount: Amount;
  chainId?: number;
};

export type SolanaNEONTransferTransactionParams = BaseNeonParams & {
  solanaWallet: PublicKey;
  neonTokenMint: PublicKey;
  token: SPLToken;
  amount: Amount;
  chainId?: number;
  serviceWallet?: PublicKey;
  rewardAmount?: Amount;
};
