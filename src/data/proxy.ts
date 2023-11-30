import { NeonProgramStatus } from '../models';

export const NEON_STATUS_MAINNET_SNAPSHOT: NeonProgramStatus = {
  NEON_ACCOUNT_SEED_VERSION: '3',
  NEON_ADDITIONAL_FEE: '0',
  NEON_CHAIN_ID: '245022934',
  NEON_COMPUTE_BUDGET_HEAP_FRAME: '262144',
  NEON_COMPUTE_BUDGET_UNITS: '500000',
  NEON_COMPUTE_UNITS: '500000',
  NEON_EVM_STEPS_LAST_ITERATION_MAX: '1',
  NEON_EVM_STEPS_MIN: '500',
  NEON_GAS_LIMIT_MULTIPLIER_NO_CHAINID: '1000',
  NEON_HEAP_FRAME: '262144',
  NEON_HOLDER_MSG_SIZE: '950',
  NEON_OPERATOR_PRIORITY_SLOTS: '16',
  NEON_PAYMENT_TO_DEPOSIT: '5000',
  NEON_PAYMENT_TO_TREASURE: '5000',
  NEON_PKG_VERSION: '1.0.0',
  NEON_POOL_COUNT: '128',
  NEON_POOL_SEED: 'treasury_pool',
  NEON_REQUEST_UNITS_ADDITIONAL_FEE: '0',
  NEON_REVISION: '3cece008d1520c1183fbd59370a90b5e5350b9e7',
  NEON_SEED_VERSION: '3',
  NEON_STATUS_NAME: 'WORK',
  NEON_STORAGE_ENTRIES_IN_CONTRACT_ACCOUNT: '64',
  NEON_TOKEN_MINT: 'NeonTjSjsuo3rexg9o6vHuMXw62f9V7zvmu8M8Zut44',
  NEON_TOKEN_MINT_DECIMALS: '9',
  NEON_TREASURY_POOL_COUNT: '128',
  NEON_TREASURY_POOL_SEED: 'treasury_pool',
  NEON_EVM_ID: 'NeonVMyRX5GbCrsAHnUwx1nYYoJAtskU1bWUo6JGNyG'
};

export const NEON_STATUS_DEVNET_SNAPSHOT: NeonProgramStatus = {
  NEON_ACCOUNT_SEED_VERSION: '3',
  NEON_ADDITIONAL_FEE: '0',
  NEON_CHAIN_ID: '245022926',
  NEON_COMPUTE_BUDGET_HEAP_FRAME: '262144',
  NEON_COMPUTE_BUDGET_UNITS: '500000',
  NEON_COMPUTE_UNITS: '500000',
  NEON_EVM_STEPS_LAST_ITERATION_MAX: '1',
  NEON_EVM_STEPS_MIN: '500',
  NEON_GAS_LIMIT_MULTIPLIER_NO_CHAINID: '1000',
  NEON_HEAP_FRAME: '262144',
  NEON_HOLDER_MSG_SIZE: '950',
  NEON_OPERATOR_PRIORITY_SLOTS: '16',
  NEON_PAYMENT_TO_DEPOSIT: '5000',
  NEON_PAYMENT_TO_TREASURE: '5000',
  NEON_PKG_VERSION: '1.1.0',
  NEON_POOL_COUNT: '128',
  NEON_POOL_SEED: 'treasury_pool',
  NEON_REQUEST_UNITS_ADDITIONAL_FEE: '0',
  NEON_REVISION: '81381b3e8a437e670b02752281d10939899fc2c6',
  NEON_SEED_VERSION: '3',
  NEON_STATUS_NAME: 'WORK',
  NEON_STORAGE_ENTRIES_IN_CONTRACT_ACCOUNT: '64',
  NEON_TOKEN_MINT: '89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g',
  NEON_TOKEN_MINT_DECIMALS: '9',
  NEON_TREASURY_POOL_COUNT: '128',
  NEON_TREASURY_POOL_SEED: 'treasury_pool',
  NEON_EVM_ID: 'eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU'
};

export const TOKEN_LIST_DEVNET_SNAPSHOT = [
  {
    token_name: 'NEON',
    token_mint: '89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g',
    token_chain_id: 'e9ac0ce'
  },
  {
    token_name: 'SOL',
    token_mint: 'So11111111111111111111111111111111111111112',
    token_chain_id: 'e9ac0ce'
  }
];

const proxyStatusSnapshot = new Map<string, NeonProgramStatus>();
proxyStatusSnapshot.set('mainnet', NEON_STATUS_MAINNET_SNAPSHOT);
proxyStatusSnapshot.set('devnet', NEON_STATUS_DEVNET_SNAPSHOT);
