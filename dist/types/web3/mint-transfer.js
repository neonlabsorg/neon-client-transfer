var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getBlockNumber, getTransactionCount } from 'web3-eth';
import { DEFAULT_RETURN_FORMAT } from 'web3-types';
import { Web3Context } from 'web3-core';
import { createSyncNativeInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { toFullAmount } from '../utils';
import { claimTransactionData, getGasAndEstimationGasPrice, getGasLimit, mintNeonTransactionData, neonClaimTransactionFromSigner } from './utils';
import { createAssociatedTokenAccountInstruction, createClaimInstruction, createMintNeonTransaction, neonTransferMintTransaction } from '../core';
export function neonTransferMintTransactionWeb3(connection, proxyUrl, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullAmount = toFullAmount(amount, splToken.decimals);
        const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
        const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
        const signedTransaction = yield neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl);
        const { neonKeys, legacyAccounts } = yield createClaimInstruction(proxyApi, signedTransaction);
        return neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
    });
}
export function createMintNeonTransactionWeb3(proxyUrl, neonWallet, associatedToken, splToken, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = mintNeonTransactionData(proxyUrl, associatedToken, splToken, amount);
        const transaction = createMintNeonTransaction(neonWallet, splToken, data);
        const { gasPrice, gas } = yield getGasAndEstimationGasPrice(proxyUrl, transaction);
        transaction.gasPrice = gasPrice;
        transaction.gas = gas;
        const blockNumber = yield getBlockNumber(new Web3Context(proxyUrl), DEFAULT_RETURN_FORMAT);
        transaction.nonce = (yield getTransactionCount(new Web3Context(proxyUrl), neonWallet, blockNumber, DEFAULT_RETURN_FORMAT));
        transaction['gasLimit'] = getGasLimit(transaction.gas, BigInt(gasLimit));
        return transaction;
    });
}
export function createWrapAndTransferSOLTransaction(connection, proxyUrl, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId = 111) {
    return __awaiter(this, void 0, void 0, function* () {
        const instructions = [];
        const transaction = new Transaction({ feePayer: solanaWallet });
        const tokenMint = new PublicKey(splToken.address_spl);
        const fullAmount = toFullAmount(amount, splToken.decimals);
        const associatedTokenAddress = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedTokenAddress);
        const climeData = claimTransactionData(proxyUrl, associatedTokenAddress, neonWallet, fullAmount);
        const signedTransaction = yield neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken, proxyUrl);
        const { neonKeys, legacyAccounts } = yield createClaimInstruction(proxyApi, signedTransaction);
        const mintTransaction = yield neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, signedTransaction, splToken, fullAmount, chainId);
        if (!wSOLAccount) {
            instructions.push(createAssociatedTokenAccountInstruction(tokenMint, associatedTokenAddress, solanaWallet, solanaWallet));
        }
        instructions.push(SystemProgram.transfer({
            fromPubkey: solanaWallet,
            toPubkey: associatedTokenAddress,
            lamports: fullAmount
        }));
        instructions.push(createSyncNativeInstruction(associatedTokenAddress, TOKEN_PROGRAM_ID));
        transaction.add(...instructions);
        transaction.add(...mintTransaction.instructions);
        return transaction;
    });
}
