var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { parseUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import { erc20ForSPLContract, neonWrapperContract, neonWrapper2Contract } from './contracts';
export function claimTransactionData(associatedToken, neonWallet, amount) {
    const fullAmount = BigNumber.from(amount);
    return erc20ForSPLContract().encodeFunctionData('claimTo', [
        associatedToken.toBuffer(),
        neonWallet,
        fullAmount
    ]);
}
export function neonTransactionData(solanaWallet) {
    return neonWrapperContract().encodeFunctionData('withdraw', [
        solanaWallet.toBuffer()
    ]);
}
export function mintNeonTransactionData(associatedToken, splToken, amount) {
    const fullAmount = parseUnits(amount.toString(), splToken.decimals);
    return erc20ForSPLContract().encodeFunctionData('transferSolana', [
        associatedToken.toBuffer(),
        fullAmount
    ]);
}
export function wrappedNeonTransactionData(token, amount, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield neonWrapper2Contract(signer, token.address).withdraw(parseUnits(amount.toString(), token.decimals));
    });
}
export function useTransactionFromSignerEthers(claimData, walletSigner, address) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = {
            data: claimData,
            gasLimit: `0x5F5E100`,
            gasPrice: `0x0`,
            to: address // contract address
        };
        transaction.nonce = yield walletSigner.getTransactionCount();
        const signedTransaction = yield walletSigner.signTransaction(transaction);
        return { rawTransaction: signedTransaction };
    });
}
