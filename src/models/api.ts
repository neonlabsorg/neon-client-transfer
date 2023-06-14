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
  NEON_ACCOUNT_SEED_VERSION: string;
  NEON_ADDITIONAL_FEE: string;
  NEON_CHAIN_ID: string;
  NEON_COMPUTE_BUDGET_HEAP_FRAME: string;
  NEON_COMPUTE_BUDGET_UNITS: string;
  NEON_COMPUTE_UNITS: string;
  NEON_EVM_ID: string;
  NEON_EVM_STEPS_LAST_ITERATION_MAX: string;
  NEON_EVM_STEPS_MIN: string;
  NEON_GAS_LIMIT_MULTIPLIER_NO_CHAINID: string;
  NEON_HEAP_FRAME: string;
  NEON_HOLDER_MSG_SIZE: string;
  NEON_OPERATOR_PRIORITY_SLOTS: string;
  NEON_PAYMENT_TO_DEPOSIT: string;
  NEON_PAYMENT_TO_TREASURE: string;
  NEON_PKG_VERSION: string;
  NEON_POOL_COUNT: string;
  NEON_POOL_SEED: string;
  NEON_REQUEST_UNITS_ADDITIONAL_FEE: string;
  NEON_REVISION: string;
  NEON_SEED_VERSION: string;
  NEON_STATUS_NAME: string;
  NEON_STORAGE_ENTRIES_IN_CONTRACT_ACCOUNT: string;
  NEON_TOKEN_MINT: string;
  NEON_TOKEN_MINT_DECIMALS: string;
  NEON_TREASURY_POOL_COUNT: string;
  NEON_TREASURY_POOL_SEED: string;
}
