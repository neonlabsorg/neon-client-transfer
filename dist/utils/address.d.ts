import { PublicKey } from '@solana/web3.js';
export declare function isValidHex(hex: string | number): boolean;
export declare function etherToProgram(etherKey: string): Promise<[PublicKey, number]>;
export declare function toBytesInt32(number: number, littleEndian?: boolean): ArrayBuffer;
export declare function toFullAmount(amount: number, decimals: number): BigInt;
