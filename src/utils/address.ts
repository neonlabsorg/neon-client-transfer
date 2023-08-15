import Big from 'big.js';
import { Amount } from '../models';

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
