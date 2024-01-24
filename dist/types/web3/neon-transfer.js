var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { neonNeonTransaction } from '../core';
import { getGasAndEstimationGasPrice, getGasLimit, neonTransactionData } from './utils';
export function neonNeonTransactionWeb3(proxyUrl, from, to, solanaWallet, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = neonTransactionData(proxyUrl, solanaWallet);
        const transaction = neonNeonTransaction(from, to, amount, data);
        const { gasPrice, gas } = yield getGasAndEstimationGasPrice(proxyUrl, transaction);
        transaction.gasPrice = gasPrice;
        transaction.gas = gas;
        transaction['gasLimit'] = getGasLimit(transaction.gas, BigInt(gasLimit));
        return transaction;
    });
}
