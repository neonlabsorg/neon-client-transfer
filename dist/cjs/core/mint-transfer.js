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
exports.createUnwrapSOLTransaction = exports.createWrapSOLTransaction = exports.createAssociatedTokenAccountInstruction = exports.createMintSolanaTransaction = exports.createMintNeonTransaction = exports.createExecFromDataInstructionV2 = exports.createExecFromDataInstruction = exports.createClaimInstruction = exports.createClaimInstructionKeys = exports.createAccountBalanceInstruction = exports.createAccountBalanceForLegacyAccountInstruction = exports.createAccountV3Instruction = exports.createApproveDepositInstruction = exports.createComputeBudgetHeapFrameInstruction = exports.createComputeBudgetUtilsInstruction = exports.neonTransferMintTransaction = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const utils_1 = require("../utils");
const data_1 = require("../data");
const utils_2 = require("./utils");
function neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, emulateSigner, neonKeys, legacyAccounts, neonTransaction, splToken, amount, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const computedBudgetProgram = new web3_js_1.PublicKey(data_1.COMPUTE_BUDGET_ID);
        const [delegatePDA] = (0, utils_2.authAccountAddress)(emulateSigner.address, neonEvmProgram, splToken);
        const [neonWalletBalanceAddress] = (0, utils_2.neonBalanceProgramAddress)(neonWallet, neonEvmProgram, chainId);
        const [emulateSignerBalanceAddress] = (0, utils_2.neonBalanceProgramAddress)(emulateSigner.address, neonEvmProgram, chainId);
        const neonWalletBalanceAccount = yield connection.getAccountInfo(neonWalletBalanceAddress);
        const emulateSignerBalanceAccount = yield connection.getAccountInfo(emulateSignerBalanceAddress);
        const associatedTokenAddress = (0, spl_token_1.getAssociatedTokenAddressSync)(new web3_js_1.PublicKey(splToken.address_spl), solanaWallet);
        const transaction = new web3_js_1.Transaction({ feePayer: solanaWallet });
        transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
        transaction.add(createApproveDepositInstruction(solanaWallet, delegatePDA, associatedTokenAddress, amount));
        if (!neonWalletBalanceAccount) {
            transaction.add(createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonWallet, chainId));
        }
        if (!emulateSignerBalanceAccount) {
            transaction.add(createAccountBalanceInstruction(solanaWallet, neonEvmProgram, emulateSigner.address, chainId));
        }
        for (const account of legacyAccounts) {
            const instruction = yield createAccountBalanceForLegacyAccountInstruction(connection, account, solanaWallet, neonEvmProgram, chainId);
            if (instruction) {
                transaction.add(instruction);
            }
        }
        if (neonTransaction === null || neonTransaction === void 0 ? void 0 : neonTransaction.rawTransaction) {
            transaction.add(createExecFromDataInstructionV2(solanaWallet, neonWallet, neonEvmProgram, neonTransaction.rawTransaction, neonKeys, proxyStatus, chainId));
        }
        return transaction;
    });
}
exports.neonTransferMintTransaction = neonTransferMintTransaction;
function createComputeBudgetUtilsInstruction(programId, proxyStatus) {
    var _a;
    const a = Buffer.from([0x00]);
    const b = Buffer.from((0, utils_1.toBytesInt32)(parseInt((_a = proxyStatus.NEON_COMPUTE_UNITS) !== null && _a !== void 0 ? _a : data_1.NEON_COMPUTE_UNITS)));
    const c = Buffer.from((0, utils_1.toBytesInt32)(0));
    const data = Buffer.concat([a, b, c]);
    return new web3_js_1.TransactionInstruction({ programId, data, keys: [] });
}
exports.createComputeBudgetUtilsInstruction = createComputeBudgetUtilsInstruction;
function createComputeBudgetHeapFrameInstruction(programId, proxyStatus) {
    var _a;
    const a = Buffer.from([0x01]);
    const b = Buffer.from((0, utils_1.toBytesInt32)(parseInt((_a = proxyStatus.NEON_HEAP_FRAME) !== null && _a !== void 0 ? _a : data_1.NEON_HEAP_FRAME)));
    const data = Buffer.concat([a, b]);
    return new web3_js_1.TransactionInstruction({ programId, data, keys: [] });
}
exports.createComputeBudgetHeapFrameInstruction = createComputeBudgetHeapFrameInstruction;
function createApproveDepositInstruction(solanaWallet, neonPDAWallet, associatedToken, amount) {
    return (0, spl_token_1.createApproveInstruction)(associatedToken, neonPDAWallet, solanaWallet, amount);
}
exports.createApproveDepositInstruction = createApproveDepositInstruction;
function createAccountV3Instruction(solanaWallet, neonPDAWallet, neonEvmProgram, neonWallet) {
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: neonPDAWallet, isSigner: false, isWritable: true }
    ];
    const a = Buffer.from([40 /* EvmInstruction.CreateAccountV03 */]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new web3_js_1.TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
exports.createAccountV3Instruction = createAccountV3Instruction;
function createAccountBalanceForLegacyAccountInstruction(connection, account, solanaWallet, neonEvmProgram, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountAddress = new web3_js_1.PublicKey(account.pubkey);
        const accountInfo = yield connection.getAccountInfo(accountAddress);
        if (accountInfo) {
            const neonAddress = `0x${accountInfo === null || accountInfo === void 0 ? void 0 : accountInfo.data.slice(1, 21).toString('hex')}`;
            return createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonAddress, chainId);
        }
        return null;
    });
}
exports.createAccountBalanceForLegacyAccountInstruction = createAccountBalanceForLegacyAccountInstruction;
function createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonWallet, chainId) {
    const [neonWalletAddress] = (0, utils_2.neonWalletProgramAddress)(neonWallet, neonEvmProgram);
    const [balanceAddress] = (0, utils_2.neonBalanceProgramAddress)(neonWallet, neonEvmProgram, chainId);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: balanceAddress, isSigner: false, isWritable: true },
        { pubkey: neonWalletAddress, isSigner: false, isWritable: true }
    ];
    const a = Buffer.from([48 /* EvmInstruction.AccountCreateBalance */]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const c = (0, utils_1.numberTo64BitLittleEndian)(chainId);
    const data = Buffer.concat([a, b, c]);
    return new web3_js_1.TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
exports.createAccountBalanceInstruction = createAccountBalanceInstruction;
function createClaimInstructionKeys(neonEmulate) {
    const legacyAccounts = [];
    const accountsMap = new Map();
    if (neonEmulate) {
        const { accounts = [], solana_accounts = [] } = neonEmulate;
        for (const account of accounts) {
            const key = account['account'];
            accountsMap.set(key, { pubkey: new web3_js_1.PublicKey(key), isSigner: false, isWritable: true });
            if (account['contract']) {
                const key = account['contract'];
                accountsMap.set(key, { pubkey: new web3_js_1.PublicKey(key), isSigner: false, isWritable: true });
            }
        }
        for (const account of solana_accounts) {
            const { pubkey, is_legacy, is_writable } = account;
            accountsMap.set(pubkey, {
                pubkey: new web3_js_1.PublicKey(pubkey),
                isSigner: false,
                isWritable: is_writable
            });
            if (is_legacy) {
                legacyAccounts.push(account);
            }
        }
    }
    return { neonKeys: Array.from(accountsMap.values()), legacyAccounts };
}
exports.createClaimInstructionKeys = createClaimInstructionKeys;
function createClaimInstruction(proxyApi, neonTransaction) {
    return __awaiter(this, void 0, void 0, function* () {
        if (neonTransaction.rawTransaction) {
            const neonEmulate = yield proxyApi.neonEmulate([neonTransaction.rawTransaction.slice(2)]);
            return createClaimInstructionKeys(neonEmulate);
        }
        return { neonKeys: [], legacyAccounts: [], neonTransaction };
    });
}
exports.createClaimInstruction = createClaimInstruction;
function createExecFromDataInstruction(solanaWallet, neonPDAWallet, neonEvmProgram, neonRawTransaction, neonKeys, proxyStatus) {
    const count = Number(proxyStatus.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const [treasuryPoolAddress] = (0, utils_2.collateralPoolAddress)(neonEvmProgram, treasuryPoolIndex);
    const a = Buffer.from([50 /* EvmInstruction.TransactionExecuteFromInstruction */]);
    const b = Buffer.from((0, utils_1.toBytesInt32)(treasuryPoolIndex));
    const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
    const data = Buffer.concat([a, b, c]);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
        { pubkey: neonPDAWallet, isSigner: false, isWritable: true },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: neonEvmProgram, isSigner: false, isWritable: false },
        ...neonKeys
    ];
    return new web3_js_1.TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
exports.createExecFromDataInstruction = createExecFromDataInstruction;
function createExecFromDataInstructionV2(solanaWallet, neonWallet, neonEvmProgram, neonRawTransaction, neonKeys, proxyStatus, chainId) {
    var _a;
    const count = Number((_a = proxyStatus.NEON_POOL_COUNT) !== null && _a !== void 0 ? _a : data_1.NEON_STATUS_DEVNET_SNAPSHOT.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const [balanceAccount] = (0, utils_2.neonBalanceProgramAddress)(neonWallet, neonEvmProgram, chainId);
    const [treasuryPoolAddress] = (0, utils_2.collateralPoolAddress)(neonEvmProgram, treasuryPoolIndex);
    const a = Buffer.from([50 /* EvmInstruction.TransactionExecuteFromInstruction */]);
    const b = Buffer.from((0, utils_1.toBytesInt32)(treasuryPoolIndex));
    const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
    const data = Buffer.concat([a, b, c]);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
        { pubkey: balanceAccount, isSigner: false, isWritable: true },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: true },
        ...neonKeys
    ];
    return new web3_js_1.TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
exports.createExecFromDataInstructionV2 = createExecFromDataInstructionV2;
function createMintNeonTransaction(neonWallet, splToken, data) {
    return { data, from: neonWallet, to: splToken.address, value: `0x0` };
}
exports.createMintNeonTransaction = createMintNeonTransaction;
function createMintSolanaTransaction(solanaWallet, tokenMint, associatedToken, proxyStatus) {
    const computedBudgetProgram = new web3_js_1.PublicKey(data_1.COMPUTE_BUDGET_ID);
    const transaction = new web3_js_1.Transaction({ feePayer: solanaWallet });
    transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
    return transaction;
}
exports.createMintSolanaTransaction = createMintSolanaTransaction;
// #region Neon -> Solana
function createAssociatedTokenAccountInstruction(tokenMint, associatedAccount, owner, payer, associatedProgramId = spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, programId = spl_token_1.TOKEN_PROGRAM_ID) {
    const data = Buffer.from([0x01]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedAccount, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: programId, isSigner: false, isWritable: false },
        { pubkey: web3_js_1.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ];
    return new web3_js_1.TransactionInstruction({ programId: associatedProgramId, keys, data });
}
exports.createAssociatedTokenAccountInstruction = createAssociatedTokenAccountInstruction;
function createWrapSOLTransaction(connection, solanaWallet, amount, splToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenMint = new web3_js_1.PublicKey(splToken.address_spl);
        const lamports = (0, utils_1.toFullAmount)(amount, splToken.decimals);
        const associatedToken = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenMint, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedToken);
        const transaction = new web3_js_1.Transaction({ feePayer: solanaWallet });
        const instructions = [];
        if (!wSOLAccount) {
            instructions.push(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
        }
        instructions.push(web3_js_1.SystemProgram.transfer({
            fromPubkey: solanaWallet,
            toPubkey: associatedToken,
            lamports
        }));
        instructions.push((0, spl_token_1.createSyncNativeInstruction)(associatedToken, spl_token_1.TOKEN_PROGRAM_ID));
        transaction.add(...instructions);
        return transaction;
    });
}
exports.createWrapSOLTransaction = createWrapSOLTransaction;
function createUnwrapSOLTransaction(connection, solanaWallet, splToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenMint = new web3_js_1.PublicKey(splToken.address_spl);
        const associatedToken = (0, spl_token_1.getAssociatedTokenAddressSync)(tokenMint, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedToken);
        if (!wSOLAccount) {
            throw new Error(`Error: ${associatedToken.toBase58()} haven't created account...`);
        }
        const transaction = new web3_js_1.Transaction({ feePayer: solanaWallet });
        const instructions = [];
        instructions.push((0, spl_token_1.createCloseAccountInstruction)(associatedToken, solanaWallet, solanaWallet));
        transaction.add(...instructions);
        return transaction;
    });
}
exports.createUnwrapSOLTransaction = createUnwrapSOLTransaction;
