var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { toWei } from 'web3-utils';
import { toFullAmount } from '../../utils';
import { DEFAULT_RETURN_FORMAT } from 'web3-types';
import { erc20ForSPLContract, neonWrapperContract, neonWrapper2Contract } from './contracts';
import { estimateGas, getBlockNumber, getGasPrice, getTransactionCount } from "web3-eth";
import { Web3Context } from "web3-core";
export function claimTransactionData(proxyUrl, associatedToken, neonWallet, amount) {
    //@ts-ignore
    const claimTo = erc20ForSPLContract(proxyUrl).methods.claimTo(associatedToken.toBuffer(), neonWallet, amount);
    return claimTo.encodeABI();
}
export function neonTransactionData(proxyUrl, solanaWallet) {
    //@ts-ignore
    return neonWrapperContract(proxyUrl).methods.withdraw(solanaWallet.toBuffer()).encodeABI();
}
export function mintNeonTransactionData(proxyUrl, associatedToken, splToken, amount) {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    //@ts-ignore
    return erc20ForSPLContract(proxyUrl).methods.transferSolana(associatedToken.toBuffer(), fullAmount).encodeABI();
}
export function wrappedNeonTransactionData(proxyUrl, token, amount) {
    const value = toWei(amount.toString(), 'ether');
    const contract = neonWrapper2Contract(proxyUrl, token.address);
    //@ts-ignore
    return contract.methods.withdraw(value).encodeABI();
}
export function neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = {
            data: climeData,
            gas: `0x5F5E100`,
            gasPrice: `0x0`,
            from: neonWallet,
            to: splToken.address // contract address
        };
        transaction.nonce = yield getTransactionCount(new Web3Context(proxyUrl), walletSigner.address, 'latest', DEFAULT_RETURN_FORMAT);
        return yield walletSigner.signTransaction(transaction);
    });
}
export function getGasAndEstimationGasPrice(proxyUrl, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        const blockNumber = yield getBlockNumber(new Web3Context(proxyUrl), DEFAULT_RETURN_FORMAT);
        const gasPrice = yield getGasPrice(new Web3Context(proxyUrl), DEFAULT_RETURN_FORMAT);
        const gas = yield estimateGas(new Web3Context(proxyUrl), transaction, blockNumber, DEFAULT_RETURN_FORMAT);
        return { gasPrice, gas };
    });
}
export function getGasLimit(gas, gasLimit) {
    return gas > gasLimit ? gas + BigInt(1e4) : gasLimit;
}
