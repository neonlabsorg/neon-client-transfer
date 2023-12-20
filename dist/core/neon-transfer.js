import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TokenInstruction, transferInstructionData } from '@solana/spl-token';
import { toWei } from 'web3-utils';
import { numberTo64BitLittleEndian, toBigInt, toFullAmount } from '../utils';
import { NEON_TOKEN_DECIMALS } from '../data';
import { authorityPoolAddress, neonBalanceProgramAddress, neonWalletProgramAddress, neonWrapper2Contract, neonWrapperContract } from './utils';
export async function solanaNEONTransferTransaction(solanaWallet, neonWallet, neonEvmProgram, neonTokenMint, token, amount, chainId = 111, serviceWallet, rewardAmount) {
    const neonToken = { ...token, decimals: Number(NEON_TOKEN_DECIMALS) };
    const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
    const fullAmount = toFullAmount(amount, neonToken.decimals);
    const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(neonToken.address_spl), solanaWallet);
    const transaction = new Transaction({ feePayer: solanaWallet });
    transaction.add(createApproveInstruction(associatedTokenAddress, balanceAddress, solanaWallet, fullAmount));
    transaction.add(createNeonDepositToBalanceInstruction(chainId, solanaWallet, associatedTokenAddress, neonWallet, neonEvmProgram, neonTokenMint, serviceWallet));
    if (serviceWallet && rewardAmount) {
        transaction.add(createNeonTransferInstruction(neonTokenMint, solanaWallet, serviceWallet, rewardAmount));
    }
    return transaction;
}
export function createNeonDepositToBalanceInstruction(chainId, solanaWallet, tokenAddress, neonWallet, neonEvmProgram, tokenMint, serviceWallet) {
    const [depositWallet] = authorityPoolAddress(neonEvmProgram);
    const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
    const [contractAddress] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
    const poolAddress = getAssociatedTokenAddressSync(tokenMint, depositWallet, true);
    const keys = [
        { pubkey: tokenMint, isSigner: false, isWritable: true },
        { pubkey: tokenAddress, isSigner: false, isWritable: true },
        { pubkey: poolAddress, isSigner: false, isWritable: true },
        { pubkey: balanceAddress, isSigner: false, isWritable: true },
        { pubkey: contractAddress, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: serviceWallet ? serviceWallet : solanaWallet, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];
    const a = Buffer.from([49 /* EvmInstruction.DepositToBalance */]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const c = numberTo64BitLittleEndian(chainId);
    const data = Buffer.concat([a, b, c]);
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export function createNeonDepositInstruction(solanaWallet, neonPDAWallet, depositWallet, neonWallet, neonEvmProgram, neonTokenMint, serviceWallet) {
    const solanaAssociatedTokenAddress = getAssociatedTokenAddressSync(neonTokenMint, solanaWallet);
    const poolKey = getAssociatedTokenAddressSync(neonTokenMint, depositWallet, true);
    const keys = [
        { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
        { pubkey: poolKey, isSigner: false, isWritable: true },
        { pubkey: neonPDAWallet, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: serviceWallet ? serviceWallet : solanaWallet, isSigner: true, isWritable: true },
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
export function neonNeonTransaction(from, to, amount, data) {
    const value = `0x${BigInt(toWei(amount.toString(), 'ether')).toString(16)}`;
    return { from, to, value, data };
}
export async function neonNeonWeb3Transaction(web3, from, to, solanaWallet, amount, gasLimit = 5e4) {
    const data = neonTransactionData(web3, solanaWallet);
    const transaction = neonNeonTransaction(from, to, amount, data);
    transaction.gasPrice = await web3.eth.getGasPrice();
    transaction.gas = await web3.eth.estimateGas(transaction);
    // @ts-ignore
    transaction['gasLimit'] = transaction.gas > gasLimit ? transaction.gas + 1e4 : gasLimit;
    return transaction;
}
//# sourceMappingURL=neon-transfer.js.map