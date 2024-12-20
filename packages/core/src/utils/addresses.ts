import { PublicKey } from '@solana/web3.js';
import { AccountHex, SPLToken } from '../models';
import { randRange, toBytesInt32, toU256BE } from './amount';
import { isValidHex } from './hex';

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

//Only for the Solana -> NEON SPL transfer
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

export function collateralPoolAddress(neonWalletPDA: PublicKey, collateralPoolIndex: number): [PublicKey, number] {
  const a = Buffer.from('treasury_pool', 'utf8');
  const b = Buffer.from(toBytesInt32(collateralPoolIndex));
  return PublicKey.findProgramAddressSync([a, b], neonWalletPDA);
}

export function authorityPoolAddress(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([new Uint8Array(Buffer.from('Deposit', 'utf-8'))], programId);
}

export async function holderAccountData(neonEvmProgram: PublicKey, solanaWallet: PublicKey): Promise<[PublicKey, string]> {
  const seed = randRange(0, 1000000).toString();
  const holder = await PublicKey.createWithSeed(solanaWallet, seed, neonEvmProgram);
  return [holder, seed];
}
