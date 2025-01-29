import { Big } from 'big.js';
import { Amount } from '../models';

export function toBytesInt32(number: number, littleEndian = true): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(4); // an Int32 takes 4 bytes
  const dataView = new DataView(arrayBuffer);
  dataView.setUint32(0, number, littleEndian); // byteOffset = 0; litteEndian = false
  return arrayBuffer;
}

/**
 * Converts a token amount to its full precision based on the given decimals.
 *
 * @param amount - The base amount to convert. This can be a number, string, or bigint.
 * @param decimals - The number of decimal places the token uses.
 * @returns The full amount as a `bigint`, representing the value with all decimals.
 */
export function toFullAmount(amount: Amount, decimals: number): bigint {
  const data = new Big(amount.toString()).times(Big(10).pow(decimals));
  return BigInt(data.toString());
}

export function toBigInt(amount: Amount): bigint {
  const data = new Big(amount.toString());
  return BigInt(data.toString());
}

/**
 * Converts a given number into a 64-bit little-endian representation as a `Uint8Array`.
 *
 * @param {number} num - The number to be converted to 64-bit little-endian format.
 * @returns {Uint8Array} A `Uint8Array` representing the 64-bit little-endian encoded value.
 *
 * @example
 * ```typescript
 * const littleEndianBytes = numberTo64BitLittleEndian(123456789);
 * console.log(littleEndianBytes);
 * ```
 */
export function numberTo64BitLittleEndian(num: number): Uint8Array {
  const buffer = new ArrayBuffer(8); // 64 bits = 8 bytes
  const view = new DataView(buffer);

  // Split the number into high and low 32-bit parts
  const low = num % Math.pow(2, 32);
  const high = Math.floor(num / Math.pow(2, 32));

  view.setUint32(0, low, true); // true for little-endian
  view.setUint32(4, high, true); // high part is set after low part

  return new Uint8Array(buffer);
}

/**
 * Converts a `bigint` number into a 256-bit big-endian (`U256BE`) representation as a `Uint8Array`.
 *
 * @param {bigint} bigIntNumber - The `bigint` number to be converted to a 256-bit big-endian format.
 * @throws {Error} If the number is out of range for a 256-bit unsigned integer.
 * @returns {Uint8Array} A `Uint8Array` representing the 256-bit big-endian encoded value.
 *
 * @example
 * ```typescript
 * const bigIntValue = BigInt('123456789012345678901234567890');
 * const u256Bytes = toU256BE(bigIntValue);
 * console.log(u256Bytes);
 * ```
 */
export function toU256BE(bigIntNumber: bigint) {
  if (bigIntNumber < BigInt(0) || bigIntNumber > BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')) {
    throw new Error('Number out of range for U256BE');
  }

  const buffer = new ArrayBuffer(32); // 256 bits = 32 bytes
  const view = new DataView(buffer);

  // Loop through each byte and set it from the start to maintain big-endian order
  for (let i = 0; i < 32; i++) {
    // Extract each byte of the BigInt number
    const byte = Number((bigIntNumber >> BigInt(8 * (31 - i))) & BigInt(0xFF));
    view.setUint8(i, byte);
  }

  return new Uint8Array(buffer);
}

export function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}
