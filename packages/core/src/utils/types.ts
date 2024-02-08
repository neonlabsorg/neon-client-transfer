export interface Provider {
  address: string;
}

export interface TransactionResult {
  rawTransaction: string;
}

export declare type SignatureObject = {
  messageHash: string;
  r: string;
  s: string;
  v: string;
};

export declare type SignTransactionResult = SignatureObject & TransactionResult & {
  transactionHash: string;
};
