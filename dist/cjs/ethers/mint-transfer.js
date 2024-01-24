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
exports.createWrapAndTransferSOLTransaction = exports.createMintNeonTransactionEthers = exports.neonTransferMintTransactionEthers = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const core_1 = require("../core");
function neonTransferMintTransactionEthers(connection, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullAmount = (0, utils_1.toFullAmount)(amount, splToken.decimals);
        const associatedTokenAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(new web3_js_1.PublicKey(splToken.address_spl), solanaWallet);
        const climeData = (0, utils_2.claimTransactionData)(associatedTokenAddress, neonWallet, fullAmount);
        const signedTransaction = yield (0, utils_2.useTransactionFromSignerEthers)(climeData, walletSigner, splToken.address);
        const { neonKeys, legacyAccounts } = yield (0, core_1.createClaimInstruction)(proxyApi, signedTransaction);
        return (0, core_1.neonTransferMintTransaction)(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
    });
}
exports.neonTransferMintTransactionEthers = neonTransferMintTransactionEthers;
function createMintNeonTransactionEthers(provider, neonWallet, associatedToken, splToken, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = (0, utils_2.mintNeonTransactionData)(associatedToken, splToken, amount);
        const transaction = (0, core_1.createMintNeonTransaction)(neonWallet, splToken, data);
        transaction.gasPrice = yield provider.getGasPrice();
        const gasEstimate = (yield provider.estimateGas(transaction)).toNumber();
        transaction.nonce = yield provider.getTransactionCount(neonWallet);
        transaction.gasLimit = gasEstimate > gasLimit ? gasEstimate + 1e4 : gasLimit;
        return transaction;
    });
}
exports.createMintNeonTransactionEthers = createMintNeonTransactionEthers;
function createWrapAndTransferSOLTransaction(connection, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId = 111) {
    return __awaiter(this, void 0, void 0, function* () {
        const instructions = [];
        const transaction = new web3_js_1.Transaction({ feePayer: solanaWallet });
        const tokenMint = new web3_js_1.PublicKey(splToken.address_spl);
        const fullAmount = (0, utils_1.toFullAmount)(amount, splToken.decimals);
        const associatedTokenAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenMint, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedTokenAddress);
        const climeData = (0, utils_2.claimTransactionData)(associatedTokenAddress, neonWallet, fullAmount);
        const signedTransaction = yield (0, utils_2.useTransactionFromSignerEthers)(climeData, walletSigner, splToken.address);
        const { neonKeys, legacyAccounts } = yield (0, core_1.createClaimInstruction)(proxyApi, signedTransaction);
        const mintTransaction = yield (0, core_1.neonTransferMintTransaction)(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
        if (!wSOLAccount) {
            instructions.push((0, core_1.createAssociatedTokenAccountInstruction)(tokenMint, associatedTokenAddress, solanaWallet, solanaWallet));
        }
        instructions.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: solanaWallet,
            toPubkey: associatedTokenAddress,
            lamports: fullAmount
        }));
        instructions.push((0, spl_token_1.createSyncNativeInstruction)(associatedTokenAddress, spl_token_1.TOKEN_PROGRAM_ID));
        transaction.add(...instructions);
        transaction.add(...mintTransaction.instructions);
        return transaction;
    });
}
exports.createWrapAndTransferSOLTransaction = createWrapAndTransferSOLTransaction;
