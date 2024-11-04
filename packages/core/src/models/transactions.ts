import { AccountMeta, Connection, PublicKey } from "@solana/web3.js";
import { NeonHeapFrame, SolanaAccount } from "./api";
import { NeonProxyRpcApi } from "../api";
import { Amount, SPLToken } from "./token";
import { Provider, TransactionResult } from "../utils";

type BaseNeonTransactionParams = {
  connection: Connection;
  neonEvmProgram: PublicKey;
  solanaWallet: PublicKey;
  neonWallet: string;
  splToken: SPLToken;
  chainId: number;
  neonHeapFrame: NeonHeapFrame;
};

export type NeonMintTxParams<Signer extends Provider, TxResult extends TransactionResult> = BaseNeonTransactionParams & {
  amount: bigint;
  emulateSigner: Signer;
  neonKeys: AccountMeta[];
  legacyAccounts: SolanaAccount[];
  neonTransaction: TxResult;
  neonPoolCount: string;
};

export type MintTransferParams<W> = BaseNeonTransactionParams & {
  amount: Amount;
  proxyApi: NeonProxyRpcApi;
  walletSigner: W;
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
