import { GasToken, NeonProgramStatus } from '../models';

export const NEON_STATUS_MAINNET_SNAPSHOT: NeonProgramStatus = {
  neonAccountSeedVersion: 3,
  neonEvmProgramId: 'NeonVMyRX5GbCrsAHnUwx1nYYoJAtskU1bWUo6JGNyG',
  neonGasLimitMultiplierWithoutChainId: 1000,
  neonHolderMessageSize: 950,
  neonMaxEvmStepsInLastIteration: 0,
  neonMinEvmStepsInIteration: 500,
  neonPaymentToTreasury: 5000,
  neonStorageEntriesInContractAccount: 64,
  neonTreasuryPoolCount: 128,
  neonTreasuryPoolSeed: 'treasury_pool'
};

export const NEON_STATUS_DEVNET_SNAPSHOT: NeonProgramStatus = {
  neonAccountSeedVersion: 3,
  neonEvmProgramId: 'eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU',
  neonGasLimitMultiplierWithoutChainId: 1000,
  neonHolderMessageSize: 950,
  neonMaxEvmStepsInLastIteration: 0,
  neonMinEvmStepsInIteration: 500,
  neonPaymentToTreasury: 5000,
  neonStorageEntriesInContractAccount: 64,
  neonTreasuryPoolCount: 128,
  neonTreasuryPoolSeed: 'treasury_pool'
};

export const TOKEN_LIST_DEVNET_SNAPSHOT: GasToken[] = [{
  tokenName: 'NEON',
  tokenMint: '89dre8rZjLNft7HoupGiyxu3MNftR577ZYu8bHe2kK7g',
  tokenChainId: '0xe9ac0ce'
}, {
  tokenName: 'SOL',
  tokenMint: 'So11111111111111111111111111111111111111112',
  tokenChainId: '0xe9ac0cf'
}];

const proxyStatusSnapshot = new Map<string, Partial<NeonProgramStatus>>();
proxyStatusSnapshot.set('mainnet', NEON_STATUS_MAINNET_SNAPSHOT);
proxyStatusSnapshot.set('devnet', NEON_STATUS_DEVNET_SNAPSHOT);
