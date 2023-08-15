export interface TransferDirection {
  direction: 'solana' | 'neon';
  from: string;
  to: string;
}

export interface TokenBalance {
  neon: string;
  solana: string;
}
