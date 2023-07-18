var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TokenInstruction, transferInstructionData } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { InstructionService } from './InstructionService';
import { NEON_WRAPPER_SOL } from '../data';
import { toFullAmount } from '../utils';
import { toBigInt } from '../utils/address';
// Neon Token Transfer
export class NeonPortal extends InstructionService {
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
            catch (error) {
                this.emitFunction(events.onErrorSign, error);
            }
        });
    }
    // Neon -> Solana
    createSolanaTransfer(amount, splToken, events = this.events) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emitFunction(events.onBeforeCreateInstruction);
            const transaction = this.ethereumTransaction(amount, splToken);
            this.emitFunction(events.onBeforeSignTransaction);
            try {
                const neonTransaction = yield this.web3.eth.sendTransaction(transaction);
                this.emitFunction(events.onSuccessSign, undefined, neonTransaction.transactionHash);
            }
            catch (error) {
                this.emitFunction(events.onErrorSign, error);
            }
        });
    }
    neonTransferTransaction(amount, token, serviceWallet, rewardAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const solanaWallet = this.solanaWalletPubkey;
            const [neonWallet] = this.neonAccountAddress(this.neonWalletAddress);
            const [authorityPoolPubkey] = this.getAuthorityPoolAddress();
            // const neonAccount = await this.getNeonAccount(neonWallet);
            const { blockhash } = yield this.connection.getLatestBlockhash('finalized');
            const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });
            // if (!neonAccount) {
            //   transaction.add(this.createAccountV3Instruction(solanaWallet, neonWallet, this.neonWalletAddress));
            // }
            const neonToken = Object.assign(Object.assign({}, token), { decimals: Number(this.proxyStatus.NEON_TOKEN_MINT_DECIMALS) });
            const fullAmount = toFullAmount(amount, neonToken.decimals);
            const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(neonToken.address_spl), solanaWallet);
            const approveInstruction = this.approveDepositInstruction(solanaWallet, neonWallet, associatedTokenAddress, fullAmount);
            transaction.add(approveInstruction);
            const depositInstruction = this.createDepositInstruction(solanaWallet, neonWallet, authorityPoolPubkey, this.neonWalletAddress, serviceWallet);
            transaction.add(depositInstruction);
            if (serviceWallet && rewardAmount) {
                transaction.add(this.neonTransferInstruction(solanaWallet, serviceWallet, rewardAmount));
            }
            return transaction;
        });
    }
    createDepositInstruction(solanaPubkey, neonPubkey, depositPubkey, neonWalletAddress, serviceWallet) {
        const neonTokenMint = new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
        const solanaAssociatedTokenAddress = getAssociatedTokenAddressSync(neonTokenMint, solanaPubkey);
        const poolKey = getAssociatedTokenAddressSync(neonTokenMint, depositPubkey, true);
        const keys = [
            { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
            { pubkey: poolKey, isSigner: false, isWritable: true },
            { pubkey: neonPubkey, isSigner: false, isWritable: true },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: serviceWallet ? serviceWallet : solanaPubkey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ];
        const a = Buffer.from([39 /* EvmInstruction.DepositV03 */]);
        const b = Buffer.from(neonWalletAddress.slice(2), 'hex');
        const data = Buffer.concat([a, b]);
        return new TransactionInstruction({
            programId: this.programId,
            keys,
            data
        });
    }
    neonTransferInstruction(solanaWallet, serviceWallet, rewardAmount) {
        const neonTokenMint = new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
        const from = getAssociatedTokenAddressSync(neonTokenMint, solanaWallet, true);
        const to = getAssociatedTokenAddressSync(neonTokenMint, serviceWallet, true);
        const fullAmount = toBigInt(rewardAmount);
        const keys = [
            { pubkey: from, isSigner: false, isWritable: true },
            { pubkey: to, isSigner: false, isWritable: true },
            { pubkey: solanaWallet, isSigner: true, isWritable: false }
        ];
        const data = Buffer.alloc(transferInstructionData.span);
        transferInstructionData.encode({
            instruction: TokenInstruction.Transfer,
            amount: fullAmount
        }, data);
        return new TransactionInstruction({ programId: TOKEN_PROGRAM_ID, keys, data });
    }
    // #endregion
    getAuthorityPoolAddress() {
        const enc = new TextEncoder();
        return PublicKey.findProgramAddressSync([enc.encode('Deposit')], this.programId);
    }
    createWithdrawEthTransactionData() {
        const solanaWallet = this.solanaWalletAddress;
        return this.neonWrapperContract.methods.withdraw(solanaWallet.toBuffer()).encodeABI();
    }
    ethereumTransaction(amount, token, to = NEON_WRAPPER_SOL) {
        const from = this.neonWalletAddress;
        const fullAmount = this.web3.utils.toWei(amount.toString(), 'ether');
        const value = `0x${BigInt(fullAmount).toString(16)}`;
        const data = this.createWithdrawEthTransactionData();
        return { from, to, value, data };
    }
    createWithdrawWNeonTransaction(amount, address) {
        const contract = this.neonWrapper2Contract(address);
        return contract.methods.withdraw(amount).encodeABI();
    }
    wNeonTransaction(amount, token) {
        const fullAmount = this.web3.utils.toWei(amount.toString(), 'ether');
        return {
            to: token.address,
            from: this.neonWalletAddress,
            value: `0x0`,
            data: this.createWithdrawWNeonTransaction(fullAmount, token.address)
        };
    }
    neonTransaction(amount, token) {
        const from = this.neonWalletAddress;
        const to = token.address;
        const value = `0x${BigInt(this.web3.utils.toWei(amount.toString(), 'ether')).toString(16)}`;
        const data = this.createWithdrawEthTransactionData();
        return { from, to, value, data };
    }
}
//# sourceMappingURL=NeonPortal.js.map