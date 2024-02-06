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
exports.getGasLimit = exports.getGasAndEstimationGasPrice = exports.neonClaimTransactionFromSigner = exports.wrappedNeonTransactionData = exports.mintNeonTransactionData = exports.neonTransactionData = exports.claimTransactionData = void 0;
const core_1 = require("@neonevm-token-transfer/core");
const web3_utils_1 = require("web3-utils");
const web3_types_1 = require("web3-types");
const contracts_1 = require("./contracts");
const web3_eth_1 = require("web3-eth");
const web3_core_1 = require("web3-core");
function claimTransactionData(proxyUrl, associatedToken, neonWallet, amount) {
    //@ts-ignore
    const claimTo = (0, contracts_1.erc20ForSPLContract)(proxyUrl).methods.claimTo(associatedToken.toBuffer(), neonWallet, amount);
    return claimTo.encodeABI();
}
exports.claimTransactionData = claimTransactionData;
function neonTransactionData(proxyUrl, solanaWallet) {
    //@ts-ignore
    return (0, contracts_1.neonWrapperContract)(proxyUrl).methods.withdraw(solanaWallet.toBuffer()).encodeABI();
}
exports.neonTransactionData = neonTransactionData;
function mintNeonTransactionData(proxyUrl, associatedToken, splToken, amount) {
    const fullAmount = (0, core_1.toFullAmount)(amount, splToken.decimals);
    //@ts-ignore
    return (0, contracts_1.erc20ForSPLContract)(proxyUrl).methods.transferSolana(associatedToken.toBuffer(), fullAmount).encodeABI();
}
exports.mintNeonTransactionData = mintNeonTransactionData;
function wrappedNeonTransactionData(proxyUrl, token, amount) {
    const value = (0, web3_utils_1.toWei)(amount.toString(), 'ether');
    const contract = (0, contracts_1.neonWrapper2Contract)(proxyUrl, token.address);
    //@ts-ignore
    return contract.methods.withdraw(value).encodeABI();
}
exports.wrappedNeonTransactionData = wrappedNeonTransactionData;
function neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = {
            data: climeData,
            gas: `0x5F5E100`,
            gasPrice: `0x0`,
            from: neonWallet,
            to: splToken.address // contract address
        };
        transaction.nonce = yield (0, web3_eth_1.getTransactionCount)(new web3_core_1.Web3Context(proxyUrl), walletSigner.address, 'latest', web3_types_1.DEFAULT_RETURN_FORMAT);
        return yield walletSigner.signTransaction(transaction);
    });
}
exports.neonClaimTransactionFromSigner = neonClaimTransactionFromSigner;
function getGasAndEstimationGasPrice(proxyUrl, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        const blockNumber = yield (0, web3_eth_1.getBlockNumber)(new web3_core_1.Web3Context(proxyUrl), web3_types_1.DEFAULT_RETURN_FORMAT);
        const gasPrice = yield (0, web3_eth_1.getGasPrice)(new web3_core_1.Web3Context(proxyUrl), web3_types_1.DEFAULT_RETURN_FORMAT);
        const gas = yield (0, web3_eth_1.estimateGas)(new web3_core_1.Web3Context(proxyUrl), transaction, blockNumber, web3_types_1.DEFAULT_RETURN_FORMAT);
        return { gasPrice, gas };
    });
}
exports.getGasAndEstimationGasPrice = getGasAndEstimationGasPrice;
function getGasLimit(gas, gasLimit) {
    return gas > gasLimit ? gas + BigInt(1e4) : gasLimit;
}
exports.getGasLimit = getGasLimit;
