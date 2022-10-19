import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import Big from 'big.js';
import { NEON_EVM_LOADER_ID } from '../data';
import { AccountHex } from '../models';

export function isValidHex(hex: string | number): boolean {
  const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString());
  if (!isHexStrict) {
    throw new Error(`Given value "${hex}" is not a valid hex string.`);
  }
  return isHexStrict;
}

export async function etherToProgram(etherKey: string): Promise<[PublicKey, number]> {
  const keyBuffer = Buffer.from(isValidHex(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
  const seed = [new Uint8Array([AccountHex.SeedVersion]), new Uint8Array(keyBuffer)];
  return PublicKey.findProgramAddress(seed, new PublicKey(NEON_EVM_LOADER_ID));
}

export function toBytesInt32(number: number, littleEndian = true): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(4); // an Int32 takes 4 bytes
  const dataView = new DataView(arrayBuffer);
  dataView.setUint32(0, number, littleEndian); // byteOffset = 0; litteEndian = false
  return arrayBuffer;
}

export function toFullAmount(amount: number, decimals: number): BigInt {
  const data = Big(amount).times(Big(10).pow(decimals));
  // @ts-ignore
  return BigInt(data);
}

