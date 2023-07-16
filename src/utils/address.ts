import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import Big from 'big.js';
import { AccountHex, Amount } from '../models';

export function isValidHex(hex: string | number): boolean {
  const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString());
  if (!isHexStrict) {
    throw new Error(`Given value "${hex}" is not a valid hex string.`);
  }
  return isHexStrict;
}

export function etherToProgram(etherKey: string, neonEvmId: PublicKey): [PublicKey, number] {
  const keyBuffer = Buffer.from(isValidHex(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
  const seed = [new Uint8Array([AccountHex.SeedVersion]), new Uint8Array(keyBuffer)];
  return PublicKey.findProgramAddressSync(seed, neonEvmId);
}

export function toBytesInt32(number: number, littleEndian = true): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(4); // an Int32 takes 4 bytes
  const dataView = new DataView(arrayBuffer);
  dataView.setUint32(0, number, littleEndian); // byteOffset = 0; litteEndian = false
  return arrayBuffer;
}

export function toFullAmount(amount: Amount, decimals: number): bigint {
  const data = new Big(amount.toString()).times(Big(10).pow(decimals));
  return BigInt(data.toString());
}

export function toBigInt(amount: Amount): bigint {
  const data = new Big(amount.toString());
  return BigInt(data.toString());
}
