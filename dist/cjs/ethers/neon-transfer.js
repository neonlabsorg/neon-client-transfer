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
exports.neonNeonTransactionWeb3 = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const core_1 = require("../core");
const utils_1 = require("./utils");
function neonNeonTransactionWeb3(provider, from, to, solanaWallet, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = (0, utils_1.neonTransactionData)(solanaWallet);
        const transaction = (0, core_1.neonNeonTransaction)(from, to, amount, data);
        transaction.gasPrice = yield provider.getGasPrice();
        const gasEstimate = yield provider.estimateGas(transaction);
        transaction.gasLimit = gasEstimate.gt(gasLimit) ? gasEstimate.add(bignumber_1.BigNumber.from(1e4)) : gasLimit;
        return transaction;
    });
}
exports.neonNeonTransactionWeb3 = neonNeonTransactionWeb3;
