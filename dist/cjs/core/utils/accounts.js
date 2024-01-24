"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signerPrivateKey = void 0;
const js_sha256_1 = require("js-sha256");
function signerPrivateKey(solanaWallet, neonWallet) {
    return `0x${(0, js_sha256_1.sha256)(solanaWallet.toBase58() + neonWallet).toString()}`;
}
exports.signerPrivateKey = signerPrivateKey;
