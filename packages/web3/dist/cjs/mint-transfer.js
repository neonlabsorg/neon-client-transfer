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
exports.createWrapAndTransferSOLTransaction = exports.createMintNeonTransactionWeb3 = exports.neonTransferMintTransactionWeb3 = void 0;
const web3_js_1 = require("@solana/web3.js");
const core_1 = require("@neonevm-token-transfer/core");
const spl_token_1 = require("@solana/spl-token");
const web3_eth_1 = require("web3-eth");
const web3_types_1 = require("web3-types");
const web3_core_1 = require("web3-core");
const utils_1 = require("./utils");
function neonTransferMintTransactionWeb3(connection, proxyUrl, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullAmount = (0, core_1.toFullAmount)(amount, splToken.decimals);
        const associatedTokenAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(new web3_js_1.PublicKey(splToken.address_spl), solanaWallet);
        const climeData = (0, utils_1.claimTransactionData)(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
        const signedTransaction = yield (0, utils_1.neonClaimTransactionFromSigner)(climeData, walletSigner, neonWallet, splToken, proxyUrl);
        const { neonKeys, legacyAccounts } = yield (0, core_1.createClaimInstruction)(proxyApi, signedTransaction);
        return (0, core_1.neonTransferMintTransaction)(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
    });
}
exports.neonTransferMintTransactionWeb3 = neonTransferMintTransactionWeb3;
function createMintNeonTransactionWeb3(proxyUrl, neonWallet, associatedToken, splToken, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = (0, utils_1.mintNeonTransactionData)(proxyUrl, associatedToken, splToken, amount);
        const transaction = (0, core_1.createMintNeonTransaction)(neonWallet, splToken, data);
        const { gasPrice, gas } = yield (0, utils_1.getGasAndEstimationGasPrice)(proxyUrl, transaction);
        transaction.gasPrice = gasPrice;
        transaction.gas = gas;
        const blockNumber = yield (0, web3_eth_1.getBlockNumber)(new web3_core_1.Web3Context(proxyUrl), web3_types_1.DEFAULT_RETURN_FORMAT);
        transaction.nonce = (yield (0, web3_eth_1.getTransactionCount)(new web3_core_1.Web3Context(proxyUrl), neonWallet, blockNumber, web3_types_1.DEFAULT_RETURN_FORMAT));
        transaction['gasLimit'] = (0, utils_1.getGasLimit)(transaction.gas, BigInt(gasLimit));
        return transaction;
    });
}
exports.createMintNeonTransactionWeb3 = createMintNeonTransactionWeb3;
function createWrapAndTransferSOLTransaction(connection, proxyUrl, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId = 111) {
    return __awaiter(this, void 0, void 0, function* () {
        const instructions = [];
        const transaction = new web3_js_1.Transaction({ feePayer: solanaWallet });
        const tokenMint = new web3_js_1.PublicKey(splToken.address_spl);
        const fullAmount = (0, core_1.toFullAmount)(amount, splToken.decimals);
        const associatedTokenAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenMint, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedTokenAddress);
        const climeData = (0, utils_1.claimTransactionData)(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
        const signedTransaction = yield (0, utils_1.neonClaimTransactionFromSigner)(climeData, walletSigner, neonWallet, splToken, proxyUrl);
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
