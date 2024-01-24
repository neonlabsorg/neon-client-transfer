"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTransactionFromSignerEthers = exports.wrappedNeonTransactionData = exports.mintNeonTransactionData = exports.neonTransactionData = exports.claimTransactionData = void 0;
const units_1 = require("@ethersproject/units");
const bignumber_1 = require("@ethersproject/bignumber");
const contracts_1 = require("./contracts");
function claimTransactionData(associatedToken, neonWallet, amount) {
    const fullAmount = bignumber_1.BigNumber.from(amount);
    return (0, contracts_1.erc20ForSPLContract)().encodeFunctionData('claimTo', [
        associatedToken.toBuffer(),
        neonWallet,
        fullAmount
    ]);
}
exports.claimTransactionData = claimTransactionData;
function neonTransactionData(solanaWallet) {
    return (0, contracts_1.neonWrapperContract)().encodeFunctionData('withdraw', [
        solanaWallet.toBuffer()
    ]);
}
exports.neonTransactionData = neonTransactionData;
function mintNeonTransactionData(associatedToken, splToken, amount) {
    const fullAmount = (0, units_1.parseUnits)(amount.toString(), splToken.decimals);
    return (0, contracts_1.erc20ForSPLContract)().encodeFunctionData('transferSolana', [
        associatedToken.toBuffer(),
        fullAmount
    ]);
}
exports.mintNeonTransactionData = mintNeonTransactionData;
function wrappedNeonTransactionData(token, amount, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield (0, contracts_1.neonWrapper2Contract)(signer, token.address).withdraw((0, units_1.parseUnits)(amount.toString(), token.decimals));
    });
}
exports.wrappedNeonTransactionData = wrappedNeonTransactionData;
function useTransactionFromSignerEthers(claimData, walletSigner, address) {
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
exports.useTransactionFromSignerEthers = useTransactionFromSignerEthers;
