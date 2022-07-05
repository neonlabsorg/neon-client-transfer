import {
  Connection,
  PublicKey, 
  Transaction
} from '@solana/web3.js';

export type EthereumProvider = {
  request: Function
}

export type Events = {
  onBeforeCreateInstruction: Function
  onCreateNeonAccountInstruction: Function
  onBeforeSignTransaction: Function
  onBeforeNeonSign: Function
  onSuccessSign: Function
  onErrorSign: Function
}
export type AcceptedToken = {
  address: string,
  address_spl: string,
  name: string,
  symbol: string,
  decimals: number,
  logoURI: string
}

export interface NeonPortalOptions extends Events {
  solanaWalletAddress: string,
  neonWalletAddress: string,
  customConnection: Connection,
  network: Network
}

export enum Network {
  MainnetBeta = 'mainnet-beta',
  Testnet = 'testnet',
  Devnet = 'devnet'
}

export type DisplayEncoding = "utf8" | "hex";
export type PhantomEvent = "disconnect" | "connect";
export type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

export interface ConnectOpts {
  onlyIfTrusted: boolean;
}

export interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  autoApprove: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<any>;
}