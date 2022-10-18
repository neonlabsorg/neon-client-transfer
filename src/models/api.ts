export const enum ProxyStatus {
  unknown = 'UNKNOWN',
  work = 'WORK',
  stop = 'EMERGENCY'
}

export interface RPCResponse<T> {
  id: number | string;
  jsonrpc: string;
  result: T;
}

export interface SettingsFormState {
  solanaRpcApi: string;
  neonProxyRpcApi: string;
}

export interface NeonProgramStatus {
  NEON_ADDITIONAL_FEE: string;
  NEON_CHAIN_ID: string;
  NEON_COMPUTE_UNITS: string;
  NEON_GAS_LIMIT_MULTIPLIER_NO_CHAINID: string;
  NEON_HEAP_FRAME: string;
  NEON_HOLDER_MSG_SIZE: string;
  NEON_MINIMAL_CLIENT_ALLOWANCE_BALANCE: string;
  NEON_MINIMAL_CONTRACT_ALLOWANCE_BALANCE: string;
  NEON_PAYMENT_TO_DEPOSIT: string;
  NEON_PAYMENT_TO_TREASURE: string;
  NEON_PERMISSION_ALLOWANCE_TOKEN: string;
  NEON_PERMISSION_DENIAL_TOKEN: string;
  NEON_PKG_VERSION: string;
  NEON_POOL_BASE: string;
  NEON_POOL_COUNT: string;
  NEON_REVISION: string;
  NEON_SEED_VERSION: string;
  NEON_STATUS_NAME: ProxyStatus | string;
  NEON_STORAGE_ENTIRIES_IN_CONTRACT_ACCOUNT: string;
  NEON_TOKEN_MINT: string;
  NEON_TOKEN_MINT_DECIMALS: string;
}
