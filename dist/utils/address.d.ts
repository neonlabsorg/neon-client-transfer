import { Amount } from '../models';
export declare function toBytesInt32(number: number, littleEndian?: boolean): ArrayBuffer;
export declare function toFullAmount(amount: Amount, decimals: number): bigint;
export declare function toBigInt(amount: Amount): bigint;
