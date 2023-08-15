import Big from 'big.js';
export function toBytesInt32(number, littleEndian = true) {
    const arrayBuffer = new ArrayBuffer(4); // an Int32 takes 4 bytes
    const dataView = new DataView(arrayBuffer);
    dataView.setUint32(0, number, littleEndian); // byteOffset = 0; litteEndian = false
    return arrayBuffer;
}
export function toFullAmount(amount, decimals) {
    const data = new Big(amount.toString()).times(Big(10).pow(decimals));
    return BigInt(data.toString());
}
export function toBigInt(amount) {
    const data = new Big(amount.toString());
    return BigInt(data.toString());
}
//# sourceMappingURL=address.js.map