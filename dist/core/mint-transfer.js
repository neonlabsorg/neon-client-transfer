var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, createApproveInstruction, createCloseAccountInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
import { toBytesInt32, toFullAmount } from '../utils';
import { COMPUTE_BUDGET_ID } from '../data';
import { authAccountAddress, collateralPoolAddress, erc20ForSPLContract, neonWalletProgramAddress, solanaWalletSigner } from './utils';
export function neonTransferMintWeb3Transaction(connection, web3, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, splToken, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullAmount = toFullAmount(amount, splToken.decimals);
        const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
        const climeData = climeTransactionData(web3, associatedTokenAddress, neonWallet, fullAmount);
        const walletSigner = yield solanaWalletSigner(web3, solanaWallet, neonWallet);
        const signedTransaction = yield neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken);
        const { neonKeys, neonTransaction } = yield createClaimInstruction(proxyApi, signedTransaction);
        return neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, neonTransaction, splToken, fullAmount);
    });
}
export function neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, emulateSigner, neonKeys, neonTransaction, splToken, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
        const [neonWalletPDA] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
        const [emulateSignerPDA] = neonWalletProgramAddress(emulateSigner.address, neonEvmProgram);
        const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
        const emulateSignerPDAAccount = yield connection.getAccountInfo(emulateSignerPDA);
        const neonWalletAccount = yield connection.getAccountInfo(neonWalletPDA);
        const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
        const transaction = new Transaction({ feePayer: solanaWallet });
        transaction.add(createComputeBudgetUtilsInstruction(computedBudgetProgram, proxyStatus));
        transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
        transaction.add(createApproveDepositInstruction(solanaWallet, delegatePDA, associatedTokenAddress, amount));
        if (!neonWalletAccount) {
            transaction.add(createAccountV3Instruction(solanaWallet, neonWalletPDA, neonEvmProgram, neonWallet));
        }
        if (!emulateSignerPDAAccount) {
            transaction.add(createAccountV3Instruction(solanaWallet, emulateSignerPDA, neonEvmProgram, emulateSigner.address));
        }
        if (neonTransaction === null || neonTransaction === void 0 ? void 0 : neonTransaction.rawTransaction) {
            transaction.add(createExecFromDataInstruction(solanaWallet, neonWalletPDA, neonEvmProgram, neonTransaction.rawTransaction, neonKeys, proxyStatus));
        }
        return transaction;
    });
}
export function createComputeBudgetUtilsInstruction(programId, proxyStatus) {
    const a = Buffer.from([0x00]);
    const b = Buffer.from(toBytesInt32(parseInt(proxyStatus.NEON_COMPUTE_UNITS)));
    const c = Buffer.from(toBytesInt32(0));
    const data = Buffer.concat([a, b, c]);
    return new TransactionInstruction({ programId, data, keys: [] });
}
export function createComputeBudgetHeapFrameInstruction(programId, proxyStatus) {
    const a = Buffer.from([0x01]);
    const b = Buffer.from(toBytesInt32(parseInt(proxyStatus.NEON_HEAP_FRAME)));
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId, data, keys: [] });
}
export function createApproveDepositInstruction(walletPubkey, neonPDAPubkey, associatedTokenPubkey, amount) {
    return createApproveInstruction(associatedTokenPubkey, neonPDAPubkey, walletPubkey, amount);
}
export function createAccountV3Instruction(solanaWallet, neonWalletPDA, neonEvmProgram, neonWallet) {
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: neonWalletPDA, isSigner: false, isWritable: true }
    ];
    const a = Buffer.from([40 /* EvmInstruction.CreateAccountV03 */]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export function climeTransactionData(web3, associatedTokenAddress, neonWallet, amount) {
    const claimTo = erc20ForSPLContract(web3).methods.claimTo(associatedTokenAddress.toBuffer(), neonWallet, amount);
    return claimTo.encodeABI();
}
export function neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const transaction = {
            data: climeData,
            gas: `0x5F5E100`,
            gasPrice: `0x0`,
            from: neonWallet,
            to: splToken.address // contract address
        };
        return walletSigner.signTransaction(transaction);
    });
}
export function createClaimInstruction(proxyApi, signedTransaction) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let neonEmulate;
            if (signedTransaction.rawTransaction) {
                neonEmulate = yield proxyApi.neonEmulate([signedTransaction.rawTransaction.slice(2)]);
            }
            const accountsMap = new Map();
            if (neonEmulate) {
                for (const account of neonEmulate['accounts']) {
                    const key = account['account'];
                    accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
                    if (account['contract']) {
                        const key = account['contract'];
                        accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
                    }
                }
                for (const account of neonEmulate['solana_accounts']) {
                    const key = account['pubkey'];
                    accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
                }
            }
            return { neonKeys: Array.from(accountsMap.values()), neonTransaction: signedTransaction };
        }
        catch (e) {
            console.log(e);
        }
        // @ts-ignore
        return { neonKeys: [], neonTransaction: null };
    });
}
export function createExecFromDataInstruction(solanaWallet, neonWalletPDA, neonEvmProgram, neonRawTransaction, neonKeys, proxyStatus) {
    const count = Number(proxyStatus.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
    const a = Buffer.from([31 /* EvmInstruction.TransactionExecuteFromData */]);
    const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
    const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
    const data = Buffer.concat([a, b, c]);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
        { pubkey: neonWalletPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: neonEvmProgram, isSigner: false, isWritable: false },
        ...neonKeys
    ];
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export function createMintNeonWeb3Transaction(web3, neonWallet, solanaWallet, splToken, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = mintNeonTransactionData(web3, solanaWallet, splToken, amount);
        const transaction = createMintNeonTransaction(neonWallet, splToken, data);
        transaction.gasPrice = yield web3.eth.getGasPrice();
        transaction.gas = yield web3.eth.estimateGas(transaction);
        transaction.nonce = (yield web3.eth.getTransactionCount(neonWallet));
        // @ts-ignore
        transaction['gasLimit'] = gasLimit;
        return transaction;
    });
}
export function mintNeonTransactionData(web3, solanaWallet, splToken, amount) {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    return erc20ForSPLContract(web3).methods.transferSolana(solanaWallet.toBuffer(), fullAmount).encodeABI();
}
export function createMintNeonTransaction(neonWallet, splToken, data) {
    return { data, from: neonWallet, to: splToken.address, value: `0x0` };
}
export function createMintSolanaTransaction(walletPubkey, mintPubkey, associatedTokenPubkey, proxyStatus) {
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const transaction = new Transaction({ feePayer: walletPubkey });
    transaction.add(createComputeBudgetUtilsInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createAssociatedTokenAccountInstruction(mintPubkey, associatedTokenPubkey, walletPubkey, walletPubkey));
    return transaction;
}
// #region Neon -> Solana
export function createAssociatedTokenAccountInstruction(tokenMint, associatedAccount, owner, payer, associatedProgramId = ASSOCIATED_TOKEN_PROGRAM_ID, programId = TOKEN_PROGRAM_ID) {
    const data = Buffer.from([0x01]);
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedAccount, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
    ];
    return new TransactionInstruction({ programId: associatedProgramId, keys, data });
}
export function createWrapSOLTransaction(connection, solanaWallet, amount, splToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const mintPubkey = new PublicKey(splToken.address_spl);
        const lamports = toFullAmount(amount, splToken.decimals);
        const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedToken);
        const transaction = new Transaction({ feePayer: solanaWallet });
        const instructions = [];
        if (!wSOLAccount) {
            instructions.push(createAssociatedTokenAccountInstruction(mintPubkey, associatedToken, solanaWallet, solanaWallet));
        }
        instructions.push(SystemProgram.transfer({
            fromPubkey: solanaWallet,
            toPubkey: associatedToken,
            lamports
        }));
        instructions.push(createSyncNativeInstruction(associatedToken, TOKEN_PROGRAM_ID));
        transaction.add(...instructions);
        return transaction;
    });
}
export function createUnwrapSOLTransaction(connection, solanaWallet, splToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const mintPubkey = new PublicKey(splToken.address_spl);
        const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet);
        const wSOLAccount = yield connection.getAccountInfo(associatedToken);
        if (!wSOLAccount) {
            throw new Error(`Error: ${associatedToken.toBase58()} haven't created account...`);
        }
        const transaction = new Transaction({ feePayer: solanaWallet });
        const instructions = [];
        instructions.push(createCloseAccountInstruction(associatedToken, solanaWallet, solanaWallet));
        transaction.add(...instructions);
        return transaction;
    });
}
//# sourceMappingURL=mint-transfer.js.map