import { PublicKey } from '@solana/web3.js';
import { AccountHex, SPLToken } from '../models';
import { randRange, toBytesInt32, toU256BE } from './amount';
import { isValidHex } from './hex';

/**
 * Derives a valid program address, that fall off the ed25519 curve,
 * for a given Neon wallet (Ethereum-style address) and Neon EVM program.
 *
 * @param {string} etherKey - The Ethereum-style wallet address in hex format.
 * @param {PublicKey} neonEvmProgram - The public key of the Neon EVM program.
 * @returns {[PublicKey, number]} A tuple containing the derived public key and a nonce.
 *
 * @example
 * ```typescript
 * const [walletPDA] = neonWalletProgramAddress(userEtherAddress, neonEvmProgram);
 * ```
 */
export function neonWalletProgramAddress(etherKey: string, neonEvmProgram: PublicKey): [PublicKey, number] {
  const keyBuffer = Buffer.from(isValidHex(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
  const seed = [new Uint8Array([AccountHex.SeedVersion]), new Uint8Array(keyBuffer)];
  return PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}

/**
 * Computes the program address for a NEON token balance.
 *
 * This function generates a program address based on the provided Ethereum address, the NEON EVM program, and chain ID.
 * It is used to identify the NEON token balance associated with the provided address on the given chain.
 *
 * @param etherKey - The Ethereum address, provided as a hexadecimal string. This should be the address for which the NEON balance is queried.
 * @param neonEvmProgram - The NEON EVM program address as a `PublicKey`.
 * @param chainId - The ID of the blockchain network where the NEON token is being used.
 * @returns A tuple containing the derived program `PublicKey` and a bump seed number used in the derivation process.
 */
export function neonBalanceProgramAddress(etherKey: string, neonEvmProgram: PublicKey, chainId: number): [PublicKey, number] {
  const keyBuffer = Buffer.from(isValidHex(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
  const chainIdBytes = toU256BE(BigInt(chainId)); //chain_id as u256be
  const seed = [
    new Uint8Array([AccountHex.SeedVersion]),
    new Uint8Array(keyBuffer),
    chainIdBytes];
  return PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}

/**
 * Computes the program address for a NEON token balance.
 * Used for SPL tokens transfer from Solana to NeonEVM.
 *
 * This function generates a program address based on the provided Ethereum address, operator address, the NEON EVM program, and chain ID.
 * It is used to identify the NEON token balance associated with the provided address on the given chain.
 *
 * @param etherKey - The Ethereum address, provided as a hexadecimal string. This should be the address for which the NEON balance is queried.
 * @param operatorKey - The payer address as a `PublicKey` = Solana wallet.
 * @param neonEvmProgram - The NEON EVM program address as a `PublicKey`.
 * @param chainId - The ID of the blockchain network where the NEON token is being used.
 * @returns A tuple containing the derived program `PublicKey` and a bump seed number used in the derivation process.
 */
export function neonBalanceProgramAddressV2(etherKey: string, operatorKey: PublicKey, neonEvmProgram: PublicKey, chainId: number): [PublicKey, number] {
  const keyBuffer = Buffer.from(isValidHex(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
  const chainIdBytes = toU256BE(BigInt(chainId)); //chain_id as u256be
  const seed = [
    new Uint8Array([AccountHex.SeedVersion]),
    operatorKey.toBytes(), //operator key -> solanaWallet
    new Uint8Array(keyBuffer),
    chainIdBytes];
  return PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}

/**
 * Generates an authenticated account address for a given Neon wallet, Neon EVM program, and SPL token.
 *
 * @param {string} neonWallet - The Neon wallet address in hex format.
 * @param {PublicKey} neonEvmProgram - The public key of the Neon EVM program.
 * @param {SPLToken} splToken - The SPL token object containing the token address.
 * @returns {[PublicKey, number]} A tuple containing the derived public key and a nonce.
 *
 * @example
 * ```typescript
 * const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
 * ```
 */
export function authAccountAddress(neonWallet: string, neonEvmProgram: PublicKey, splToken: SPLToken): [PublicKey, number] {
  const neonAccountAddressBytes = Buffer.concat([Buffer.alloc(12), Buffer.from(isValidHex(neonWallet) ? neonWallet.replace(/^0x/i, '') : neonWallet, 'hex')]);
  const neonContractAddressBytes = Buffer.from(isValidHex(splToken.address) ? splToken.address.replace(/^0x/i, '') : splToken.address, 'hex');
  const seed = [
    new Uint8Array([AccountHex.SeedVersion]),
    new Uint8Array(Buffer.from('AUTH', 'utf-8')),
    new Uint8Array(neonContractAddressBytes),
    new Uint8Array(neonAccountAddressBytes)];
  return PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}

/**
 * Derives the program address for a collateral pool associated with a Neon wallet PDA.
 *
 * @param {PublicKey} neonWalletPDA - The public key of the Neon wallet PDA.
 * @param {number} collateralPoolIndex - The index of the collateral pool.
 * @returns {[PublicKey, number]} A tuple containing the derived public key and a nonce.
 *
 * @example
 * ```typescript
 * const [poolAddress] = collateralPoolAddress(walletPDA, 0);
 * ```
 */
export function collateralPoolAddress(neonWalletPDA: PublicKey, collateralPoolIndex: number): [PublicKey, number] {
  const a = Buffer.from('treasury_pool', 'utf8');
  const b = Buffer.from(toBytesInt32(collateralPoolIndex));
  return PublicKey.findProgramAddressSync([a, b], neonWalletPDA);
}

/**
 * Derives the authority pool program address for a given program ID.
 *
 * @param {PublicKey} programId - The public key of the program.
 * @returns {[PublicKey, number]} A tuple containing the derived public key and a nonce.
 *
 * @example
 * ```typescript
 * const [authorityAddress] = authorityPoolAddress(myProgramId);
 * ```
 */
export function authorityPoolAddress(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([new Uint8Array(Buffer.from('Deposit', 'utf-8'))], programId);
}

/**
 * Generates a unique holder account address using a seeded derivation method.
 *
 * @param {PublicKey} neonEvmProgram - The public key of the Neon EVM program.
 * @param {PublicKey} solanaWallet - The public key of the Solana wallet.
 * @returns {Promise<[PublicKey, string]>} A promise that resolves to a tuple containing:
 *   - The derived public key of the holder account.
 *   - The seed used for derivation.
 *
 * @example
 * ```typescript
 * const [holderAddress, seed] = await holderAccountData(neonEvmProgram, solanaWallet);
 * console.log(`Holder Address: ${holderAddress.toBase58()}, Seed: ${seed}`);
 * ```
 */
export async function holderAccountData(neonEvmProgram: PublicKey, solanaWallet: PublicKey): Promise<[PublicKey, string]> {
  const seed = randRange(0, 1000000).toString();
  const holder = await PublicKey.createWithSeed(solanaWallet, seed, neonEvmProgram);
  return [holder, seed];
}
