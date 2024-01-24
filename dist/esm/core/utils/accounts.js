import { sha256 } from 'js-sha256';
export function signerPrivateKey(solanaWallet, neonWallet) {
    return `0x${sha256(solanaWallet.toBase58() + neonWallet).toString()}`;
}
