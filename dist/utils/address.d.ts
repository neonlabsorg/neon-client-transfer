import { PublicKey } from '@solana/web3.js';
import { Amount } from '../models';
export declare function isValidHex(hex: string | number): boolean;
export declare function etherToProgram(etherKey: string, neonEvmId: PublicKey): [PublicKey, number];
export declare function toBytesInt32(number: number, littleEndian?: boolean): ArrayBuffer;
export declare function toFullAmount(amount: Amount, decimals: number): bigint;
