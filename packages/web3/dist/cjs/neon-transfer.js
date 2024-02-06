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
const core_1 = require("@neonevm-token-transfer/core");
const utils_1 = require("./utils");
function neonNeonTransactionWeb3(proxyUrl, from, to, solanaWallet, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = (0, utils_1.neonTransactionData)(proxyUrl, solanaWallet);
        const transaction = (0, core_1.neonNeonTransaction)(from, to, amount, data);
        const { gasPrice, gas } = yield (0, utils_1.getGasAndEstimationGasPrice)(proxyUrl, transaction);
        transaction.gasPrice = gasPrice;
        transaction.gas = gas;
        transaction['gasLimit'] = (0, utils_1.getGasLimit)(transaction.gas, BigInt(gasLimit));
        return transaction;
    });
}
exports.neonNeonTransactionWeb3 = neonNeonTransactionWeb3;
