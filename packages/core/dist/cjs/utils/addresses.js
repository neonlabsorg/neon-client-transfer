"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorityPoolAddress = exports.collateralPoolAddress = exports.authAccountAddress = exports.neonBalanceProgramAddress = exports.neonWalletProgramAddress = void 0;
const web3_js_1 = require("@solana/web3.js");
const address_1 = require("./address");
const hex_1 = require("./hex");
function neonWalletProgramAddress(etherKey, neonEvmProgram) {
    const keyBuffer = Buffer.from((0, hex_1.isValidHex)(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
    const seed = [new Uint8Array([3 /* AccountHex.SeedVersion */]), new Uint8Array(keyBuffer)];
    return web3_js_1.PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}
exports.neonWalletProgramAddress = neonWalletProgramAddress;
function neonBalanceProgramAddress(etherKey, neonEvmProgram, chainId) {
    const keyBuffer = Buffer.from((0, hex_1.isValidHex)(etherKey) ? etherKey.replace(/^0x/i, '') : etherKey, 'hex');
    const chainIdBytes = (0, address_1.toU256BE)(BigInt(chainId)); //chain_id as u256be
    const seed = [
        new Uint8Array([3 /* AccountHex.SeedVersion */]),
        new Uint8Array(keyBuffer),
        chainIdBytes
    ];
    return web3_js_1.PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}
exports.neonBalanceProgramAddress = neonBalanceProgramAddress;
function authAccountAddress(neonWallet, neonEvmProgram, splToken) {
    const neonAccountAddressBytes = Buffer.concat([Buffer.alloc(12), Buffer.from((0, hex_1.isValidHex)(neonWallet) ? neonWallet.replace(/^0x/i, '') : neonWallet, 'hex')]);
    const neonContractAddressBytes = Buffer.from((0, hex_1.isValidHex)(splToken.address) ? splToken.address.replace(/^0x/i, '') : splToken.address, 'hex');
    const seed = [
        new Uint8Array([3 /* AccountHex.SeedVersion */]),
        new Uint8Array(Buffer.from('AUTH', 'utf-8')),
        new Uint8Array(neonContractAddressBytes),
        new Uint8Array(neonAccountAddressBytes)
    ];
    return web3_js_1.PublicKey.findProgramAddressSync(seed, neonEvmProgram);
}
exports.authAccountAddress = authAccountAddress;
function collateralPoolAddress(neonWalletPDA, collateralPoolIndex) {
    const a = Buffer.from('treasury_pool', 'utf8');
    const b = Buffer.from((0, address_1.toBytesInt32)(collateralPoolIndex));
    return web3_js_1.PublicKey.findProgramAddressSync([a, b], neonWalletPDA);
}
exports.collateralPoolAddress = collateralPoolAddress;
function authorityPoolAddress(programId) {
    return web3_js_1.PublicKey.findProgramAddressSync([new Uint8Array(Buffer.from('Deposit', 'utf-8'))], programId);
}
exports.authorityPoolAddress = authorityPoolAddress;
