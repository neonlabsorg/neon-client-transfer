var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { InstructionService } from './InstructionService';
import { NEON_EVM_LOADER_ID, NEON_WRAPPER_SOL, SPL_TOKEN_DEFAULT } from '../data';
import { toFullAmount } from '../utils';
// Neon-token
export class NeonPortal extends InstructionService {
    // #region Solana -> Neon
    createNeonTransfer(events = this.events, amount = 0, token) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emitFunction(events.onBeforeCreateInstruction);
            const solanaWallet = this.solanaWalletPubkey;
            const [neonWallet] = yield this.neonAccountAddress(this.neonWalletAddress);
            const neonAccount = yield this.getNeonAccount(neonWallet);
            const [authorityPoolPubkey] = yield this.getAuthorityPoolAddress();
            const { blockhash } = yield this.connection.getRecentBlockhash();
            const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });
            if (!neonAccount) {
                transaction.add(this.createAccountV3Instruction(solanaWallet, neonWallet, this.neonWalletAddress));
                this.emitFunction(events.onCreateNeonAccountInstruction);
            }
            const neonToken = Object.assign(Object.assign({}, token), { decimals: Number(this.proxyStatus.NEON_TOKEN_MINT_DECIMALS) });
            const { createApproveInstruction } = yield this.approveDepositInstruction(solanaWallet, neonWallet, neonToken, amount);
            transaction.add(createApproveInstruction);
            const depositInstruction = yield this.createDepositInstruction(solanaWallet, neonWallet, authorityPoolPubkey, this.neonWalletAddress);
            transaction.add(depositInstruction);
            this.emitFunction(events.onBeforeSignTransaction);
            try {
                const signedTransaction = yield this.solana.signTransaction(transaction);
                const sig = yield this.connection.sendRawTransaction(signedTransaction.serialize());
                this.emitFunction(events.onSuccessSign, sig);
            }
            catch (error) {
                this.emitFunction(events.onErrorSign, error);
            }
        });
    }
    createDepositInstruction(solanaPubkey, neonPubkey, depositPubkey, neonWalletAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const neonTokenMint = new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
            const solanaAssociatedTokenAddress = yield Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, neonTokenMint, solanaPubkey);
            const poolKey = yield Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, neonTokenMint, depositPubkey, true);
            const keys = [
                { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
                { pubkey: poolKey, isSigner: false, isWritable: true },
                { pubkey: neonPubkey, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: solanaPubkey, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
            ];
            const a = new Buffer([39 /* EvmInstruction.DepositV03 */]);
            const b = new Buffer(neonWalletAddress.slice(2), 'hex');
            const data = Buffer.concat([a, b]);
            return new TransactionInstruction({
                programId: new PublicKey(NEON_EVM_LOADER_ID),
                keys,
                data
            });
        });
    }
    // #endregion
    getAuthorityPoolAddress() {
        return __awaiter(this, void 0, void 0, function* () {
            const enc = new TextEncoder();
            return yield PublicKey.findProgramAddress([enc.encode('Deposit')], new PublicKey(NEON_EVM_LOADER_ID));
        });
    }
    // #region Neon -> Solana
    createSolanaTransfer(events = this.events, amount = 0, splToken = SPL_TOKEN_DEFAULT) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emitFunction(events.onBeforeSignTransaction);
            try {
                const transaction = yield this.web3.eth.sendTransaction(this.getEthereumTransactionParams(amount, splToken));
                this.emitFunction(events.onSuccessSign, undefined, transaction.transactionHash);
            }
            catch (error) {
                this.emitFunction(events.onErrorSign, error);
            }
        });
    }
    createWithdrawEthTransactionData() {
        const solanaWallet = this.solanaWalletAddress;
        return this.neonWrapperContract.methods.withdraw(solanaWallet.toBytes()).encodeABI();
    }
    getEthereumTransactionParams(amount, token) {
        const fullAmount = toFullAmount(amount, token.decimals);
        return {
            to: NEON_WRAPPER_SOL,
            from: this.neonWalletAddress,
            value: `0x${fullAmount.toString(16)}`,
            data: this.createWithdrawEthTransactionData()
        };
    }
}
//# sourceMappingURL=NeonPortal.js.map