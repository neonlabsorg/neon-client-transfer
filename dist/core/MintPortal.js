var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { InstructionService } from './InstructionService';
import { COMPUTE_BUDGET_ID, NEON_EVM_LOADER_ID } from '../data';
import { toBytesInt32, toFullAmount } from '../utils';
// ERC-20 Tokens Transfer
export class MintPortal extends InstructionService {
    // Solana -> Neon
    createNeonTransfer(amount, splToken, events = this.events) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emitFunction(events.onBeforeCreateInstruction);
            const transaction = yield this.neonTransferTransaction(amount, splToken);
            this.emitFunction(events.onBeforeSignTransaction);
            try {
                const signedTransaction = yield this.solana.signTransaction(transaction);
                const signature = yield this.connection.sendRawTransaction(signedTransaction.serialize(), this.solanaOptions);
                this.emitFunction(events.onSuccessSign, signature);
            }
            catch (e) {
                this.emitFunction(events.onErrorSign, e);
            }
        });
    }
    // Neon -> Solana
    createSolanaTransfer(amount, splToken, events = this.events) {
        return __awaiter(this, void 0, void 0, function* () {
            const mintPubkey = new PublicKey(splToken.address_spl);
            const walletPubkey = this.solanaWalletPubkey;
            const associatedTokenPubkey = yield this.getAssociatedTokenAddress(mintPubkey, walletPubkey);
            const solanaTransaction = yield this.solanaTransferTransaction(walletPubkey, mintPubkey, associatedTokenPubkey);
            const neonTransaction = yield this.createNeonTransaction(this.neonWalletAddress, associatedTokenPubkey, splToken, amount);
            neonTransaction.nonce = yield this.web3.eth.getTransactionCount(this.neonWalletAddress);
            this.emitFunction(events.onBeforeSignTransaction);
            try {
                const signedSolanaTransaction = yield this.solana.signTransaction(solanaTransaction);
                const signature = yield this.connection.sendRawTransaction(signedSolanaTransaction.serialize(), this.solanaOptions);
                const { transactionHash } = yield this.web3.eth.sendTransaction(neonTransaction);
                this.emitFunction(events.onSuccessSign, signature, transactionHash);
            }
            catch (error) {
                this.emitFunction(events.onErrorSign, error);
            }
        });
    }
    neonTransferTransaction(amount, splToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullAmount = toFullAmount(amount, splToken.decimals);
            const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
            const solanaWallet = this.solanaWalletPubkey;
            const emulateSigner = this.solanaWalletSigner;
            const [neonWalletPDA] = yield this.neonAccountAddress(this.neonWalletAddress);
            const [emulateSignerPDA] = yield this.neonAccountAddress(emulateSigner.address);
            const emulateSignerPDAAccount = yield this.getNeonAccount(emulateSignerPDA);
            const neonWalletAccount = yield this.getNeonAccount(neonWalletPDA);
            const associatedTokenAddress = yield this.getAssociatedTokenAddress(new PublicKey(splToken.address_spl), solanaWallet);
            const { neonKeys, neonTransaction } = yield this.createClaimInstruction(solanaWallet, associatedTokenAddress, this.neonWalletAddress, splToken, emulateSigner, fullAmount);
            const { blockhash } = yield this.connection.getLatestBlockhash();
            const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });
            const computeBudgetUtilsInstruction = this.computeBudgetUtilsInstruction(computedBudgetProgram);
            transaction.add(computeBudgetUtilsInstruction);
            const computeBudgetHeapFrameInstruction = this.computeBudgetHeapFrameInstruction(computedBudgetProgram);
            transaction.add(computeBudgetHeapFrameInstruction);
            const createApproveInstruction = yield this.approveDepositInstruction(solanaWallet, emulateSignerPDA, associatedTokenAddress, fullAmount);
            transaction.add(createApproveInstruction);
            if (!neonWalletAccount) {
                transaction.add(this.createAccountV3Instruction(solanaWallet, neonWalletPDA, this.neonWalletAddress));
            }
            if (!emulateSignerPDAAccount) {
                transaction.add(this.createAccountV3Instruction(solanaWallet, emulateSignerPDA, emulateSigner.address));
            }
            if (neonTransaction === null || neonTransaction === void 0 ? void 0 : neonTransaction.rawTransaction) {
                transaction.add(yield this.makeTrExecFromDataIx(neonWalletPDA, neonTransaction.rawTransaction, neonKeys));
            }
            return transaction;
        });
    }
    computeBudgetUtilsInstruction(programId) {
        const a = Buffer.from([0x00]);
        const b = Buffer.from(toBytesInt32(parseInt(this.proxyStatus.NEON_COMPUTE_UNITS)));
        const c = Buffer.from(toBytesInt32(0));
        const data = Buffer.concat([a, b, c]);
        return new TransactionInstruction({ programId, data, keys: [] });
    }
    computeBudgetHeapFrameInstruction(programId) {
        const a = Buffer.from([0x01]);
        const b = Buffer.from(toBytesInt32(parseInt(this.proxyStatus.NEON_HEAP_FRAME)));
        const data = Buffer.concat([a, b]);
        return new TransactionInstruction({ programId, data, keys: [] });
    }
    createClaimInstruction(owner, from, to, splToken, emulateSigner, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const nonce = yield this.web3.eth.getTransactionCount(emulateSigner.address);
            const chainId = yield this.web3.eth.getChainId();
            try {
                const claimTo = this.erc20ForSPLContract.methods.claimTo(from.toBytes(), to, amount);
                const data = claimTo.encodeABI();
                const transaction = {
                    chainId,
                    data,
                    nonce,
                    gas: `0x5F5E100`,
                    gasPrice: `0x0`,
                    from: this.neonWalletAddress,
                    to: splToken.address // contract address
                };
                const signedTransaction = yield this.solanaWalletSigner.signTransaction(transaction);
                let neonEmulate;
                if (signedTransaction.rawTransaction) {
                    neonEmulate = yield this.proxyApi.neonEmulate([signedTransaction.rawTransaction.slice(2)]);
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
                return {
                    neonKeys: Array.from(accountsMap.values()),
                    neonTransaction: signedTransaction,
                    emulateSigner,
                    nonce
                };
            }
            catch (e) {
                console.log(e);
            }
            // @ts-ignore
            return { neonKeys: [], neonTransaction: null, emulateSigner: null, nonce };
        });
    }
    makeTrExecFromDataIx(neonAddress, neonRawTransaction, neonKeys) {
        return __awaiter(this, void 0, void 0, function* () {
            const programId = new PublicKey(NEON_EVM_LOADER_ID);
            const count = Number(this.proxyStatus.NEON_POOL_COUNT);
            const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
            const [treasuryPoolAddress] = yield this.getCollateralPoolAddress(treasuryPoolIndex);
            const a = Buffer.from([31 /* EvmInstruction.TransactionExecuteFromData */]);
            const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
            const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
            const data = Buffer.concat([a, b, c]);
            const keys = [
                { pubkey: this.solanaWalletPubkey, isSigner: true, isWritable: true },
                { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
                { pubkey: neonAddress, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: programId, isSigner: false, isWritable: false },
                ...neonKeys
            ];
            return new TransactionInstruction({ programId, keys, data });
        });
    }
    getCollateralPoolAddress(collateralPoolIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            const a = Buffer.from('treasury_pool', 'utf8');
            const b = Buffer.from(toBytesInt32(collateralPoolIndex));
            return PublicKey.findProgramAddress([a, b], new PublicKey(NEON_EVM_LOADER_ID));
        });
    }
    createNeonTransaction(neonWallet, solanaWallet, splToken, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const nonce = yield this.web3.eth.getTransactionCount(neonWallet);
            const fullAmount = toFullAmount(amount, splToken.decimals);
            const data = this.erc20ForSPLContract.methods.transferSolana(solanaWallet.toBytes(), fullAmount).encodeABI();
            const transaction = {
                data,
                nonce,
                from: neonWallet,
                to: splToken.address,
                value: `0x0`,
                chainId: splToken.chainId
            };
            transaction.gasPrice = yield this.web3.eth.getGasPrice();
            transaction.gas = yield this.web3.eth.estimateGas(transaction);
            return transaction;
        });
    }
    solanaTransferTransaction(walletPubkey, mintPubkey, associatedTokenPubkey) {
        return __awaiter(this, void 0, void 0, function* () {
            const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
            const computeBudgetUtilsInstruction = this.computeBudgetUtilsInstruction(computedBudgetProgram);
            const computeBudgetHeapFrameInstruction = this.computeBudgetHeapFrameInstruction(computedBudgetProgram);
            const { blockhash } = yield this.connection.getLatestBlockhash();
            const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: walletPubkey });
            transaction.add(computeBudgetUtilsInstruction);
            transaction.add(computeBudgetHeapFrameInstruction);
            const createAccountInstruction = this.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mintPubkey, // token mint
            associatedTokenPubkey, // account to create
            walletPubkey, // new account owner
            walletPubkey // payer
            );
            transaction.add(createAccountInstruction);
            return transaction;
        });
    }
    // #region Neon -> Solana
    createAssociatedTokenAccountInstruction(associatedProgramId, programId, mint, associatedAccount, owner, payer) {
        const data = Buffer.from([0x01]);
        const keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedAccount, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: programId, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
        ];
        return new TransactionInstruction({
            programId: associatedProgramId,
            keys,
            data
        });
    }
}
//# sourceMappingURL=MintPortal.js.map