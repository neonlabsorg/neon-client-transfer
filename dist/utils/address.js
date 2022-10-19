var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import Big from 'big.js';
import { NEON_EVM_LOADER_ID } from '../data';
export function isValidHex(hex) {
    const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString());
    if (!isHexStrict) {
        throw new Error(`Given value "${hex}" is not a valid hex string.`);
    }
    return isHexStrict;
}
export function etherToProgram(etherKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyBuffer = Buffer.from(isValidHex(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
        const seed = [new Uint8Array([2 /* AccountHex.SeedVersion */]), new Uint8Array(keyBuffer)];
        return PublicKey.findProgramAddress(seed, new PublicKey(NEON_EVM_LOADER_ID));
    });
}
export function toBytesInt32(number, littleEndian = true) {
    const arrayBuffer = new ArrayBuffer(4); // an Int32 takes 4 bytes
    const dataView = new DataView(arrayBuffer);
    dataView.setUint32(0, number, littleEndian); // byteOffset = 0; litteEndian = false
    return arrayBuffer;
}
export function toFullAmount(amount, decimals) {
    const data = Big(amount).times(Big(10).pow(decimals));
    // @ts-ignore
    return BigInt(data);
}
//# sourceMappingURL=address.js.map