var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TokenInstruction, transferInstructionData } from '@solana/spl-token';
import { toWei } from 'web3-utils';
import { toBigInt, toFullAmount } from '../utils';
import { NEON_TOKEN_DECIMALS } from '../data';
import { authorityPoolAddress, neonWalletProgramAddress, neonWrapper2Contract, neonWrapperContract } from './utils';
export function solanaNEONTransferTransaction(solanaWallet, neonWallet, neonEvmProgram, neonTokenMint, token, amount, serviceWallet, rewardAmount) {
    return __awaiter(this, void 0, void 0, function* () {
        const [neonPubkey] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
        const [authorityPoolPubkey] = authorityPoolAddress(neonEvmProgram);
        const neonToken = Object.assign(Object.assign({}, token), { decimals: Number(NEON_TOKEN_DECIMALS) });
        const fullAmount = toFullAmount(amount, neonToken.decimals);
        const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(neonToken.address_spl), solanaWallet);
        const transaction = new Transaction({ feePayer: solanaWallet });
        transaction.add(createApproveInstruction(associatedTokenAddress, neonPubkey, solanaWallet, fullAmount));
        transaction.add(createNeonDepositInstruction(solanaWallet, neonPubkey, authorityPoolPubkey, neonWallet, neonEvmProgram, neonTokenMint, serviceWallet));
        if (serviceWallet && rewardAmount) {
            transaction.add(createNeonTransferInstruction(neonTokenMint, solanaWallet, serviceWallet, rewardAmount));
        }
        return transaction;
    });
}
export function createNeonDepositInstruction(solanaPubkey, neonPubkey, depositPubkey, neonWallet, neonEvmProgram, neonTokenMint, serviceWallet) {
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
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export function createNeonTransferInstruction(neonTokenMint, solanaWallet, serviceWallet, rewardAmount) {
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
export function neonTransactionData(web3, solanaWallet) {
    return neonWrapperContract(web3).methods.withdraw(solanaWallet.toBuffer()).encodeABI();
}
export function wrappedNeonTransactionData(web3, token, amount) {
    const value = toWei(amount.toString(), 'ether');
    const contract = neonWrapper2Contract(web3, token.address);
    return contract.methods.withdraw(value).encodeABI();
}
export function wrappedNeonTransaction(from, to, data) {
    const value = `0x0`;
    return { from, to, value, data };
}
export function neonNeonTransaction(from, to, solanaWallet, amount, data) {
    const value = `0x${BigInt(toWei(amount.toString(), 'ether')).toString(16)}`;
    return { from, to, value, data };
}
export function neonNeonWeb3Transaction(web3, from, to, solanaWallet, amount, gasLimit = 5e4) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = neonTransactionData(web3, solanaWallet);
        const transaction = neonNeonTransaction(from, to, solanaWallet, amount, data);
        transaction.gasPrice = yield web3.eth.getGasPrice();
        transaction.gas = yield web3.eth.estimateGas(transaction);
        // @ts-ignore
        transaction['gasLimit'] = gasLimit;
        return transaction;
    });
}
//# sourceMappingURL=neon-transfer.js.map