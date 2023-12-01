import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, createApproveInstruction, createCloseAccountInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
import { numberTo64BitLittleEndian, toBytesInt32, toFullAmount } from '../utils';
import { COMPUTE_BUDGET_ID, NEON_STATUS_DEVNET_SNAPSHOT, NEON_STATUS_MAINNET_SNAPSHOT } from '../data';
import { authAccountAddress, collateralPoolAddress, erc20ForSPLContract, neonBalanceProgramAddress, neonWalletProgramAddress, solanaWalletSigner } from './utils';
export async function neonTransferMintWeb3Transaction(connection, web3, proxyApi, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, splToken, amount, chainId) {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
    const climeData = climeTransactionData(web3, associatedTokenAddress, neonWallet, fullAmount);
    const walletSigner = solanaWalletSigner(web3, solanaWallet, neonWallet);
    const signedTransaction = await neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken);
    const { neonKeys, neonTransaction, legacyAccounts } = await createClaimInstruction(proxyApi, signedTransaction);
    return neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, walletSigner, neonKeys, legacyAccounts, neonTransaction, splToken, fullAmount, chainId);
}
export async function neonTransferMintTransaction(connection, proxyStatus, neonEvmProgram, solanaWallet, neonWallet, emulateSigner, neonKeys, legacyAccounts, neonTransaction, splToken, amount, chainId) {
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const [delegatePDA] = authAccountAddress(emulateSigner.address, neonEvmProgram, splToken);
    const [neonWalletBalanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
    const [emulateSignerBalanceAddress] = neonBalanceProgramAddress(emulateSigner.address, neonEvmProgram, chainId);
    const neonWalletBalanceAccount = await connection.getAccountInfo(neonWalletBalanceAddress);
    const emulateSignerBalanceAccount = await connection.getAccountInfo(emulateSignerBalanceAddress);
    const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
    const transaction = new Transaction({ feePayer: solanaWallet });
    // transaction.add(createComputeBudgetUtilsInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createApproveDepositInstruction(solanaWallet, delegatePDA, associatedTokenAddress, amount));
    if (!neonWalletBalanceAccount) {
        transaction.add(createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonWallet, chainId));
    }
    if (!emulateSignerBalanceAccount) {
        transaction.add(createAccountBalanceInstruction(solanaWallet, neonEvmProgram, emulateSigner.address, chainId));
    }
    for (const account of legacyAccounts) {
        const instruction = await createAccountBalanceForLegacyAccountInstruction(connection, account, solanaWallet, neonEvmProgram, chainId);
        if (instruction) {
            transaction.add(instruction);
        }
    }
    if (neonTransaction?.rawTransaction) {
        transaction.add(createExecFromDataInstructionV2(solanaWallet, neonWallet, neonEvmProgram, neonTransaction.rawTransaction, neonKeys, proxyStatus, chainId));
    }
    return transaction;
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
    const b = Buffer.from(toBytesInt32(parseInt(proxyStatus.NEON_HEAP_FRAME ?? NEON_STATUS_MAINNET_SNAPSHOT.NEON_HEAP_FRAME)));
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId, data, keys: [] });
}
export function createApproveDepositInstruction(solanaWallet, neonPDAWallet, associatedToken, amount) {
    return createApproveInstruction(associatedToken, neonPDAWallet, solanaWallet, amount);
}
export function createAccountV3Instruction(solanaWallet, neonPDAWallet, neonEvmProgram, neonWallet) {
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: neonPDAWallet, isSigner: false, isWritable: true }
    ];
    const a = Buffer.from([40 /* EvmInstruction.CreateAccountV03 */]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export async function createAccountBalanceForLegacyAccountInstruction(connection, account, solanaWallet, neonEvmProgram, chainId) {
    const accountAddress = new PublicKey(account.pubkey);
    const accountInfo = await connection.getAccountInfo(accountAddress);
    if (accountInfo) {
        const neonAddress = `0x${accountInfo?.data.slice(1, 21).toString('hex')}`;
        return createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonAddress, chainId);
    }
    return null;
}
export function createAccountBalanceInstruction(solanaWallet, neonEvmProgram, neonWallet, chainId) {
    const [neonWalletAddress] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
    const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: balanceAddress, isSigner: false, isWritable: true },
        { pubkey: neonWalletAddress, isSigner: false, isWritable: true }
    ];
    const a = Buffer.from([48 /* EvmInstruction.AccountCreateBalance */]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const c = numberTo64BitLittleEndian(chainId);
    const data = Buffer.concat([a, b, c]);
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export function climeTransactionData(web3, associatedToken, neonWallet, amount) {
    const claimTo = erc20ForSPLContract(web3).methods.claimTo(associatedToken.toBuffer(), neonWallet, amount);
    return claimTo.encodeABI();
}
export async function neonClaimTransactionFromSigner(climeData, walletSigner, neonWallet, splToken) {
    const transaction = {
        data: climeData,
        gas: `0x5F5E100`,
        gasPrice: `0x0`,
        from: neonWallet,
        to: splToken.address // contract address
    };
    return walletSigner.signTransaction(transaction);
}
export async function createClaimInstruction(proxyApi, neonTransaction) {
    try {
        let neonEmulate;
        const legacyAccounts = [];
        if (neonTransaction.rawTransaction) {
            neonEmulate = await proxyApi.neonEmulate([neonTransaction.rawTransaction.slice(2)]);
        }
        const accountsMap = new Map();
        if (neonEmulate) {
            const { accounts = [], solana_accounts = [] } = neonEmulate;
            for (const account of accounts) {
                const key = account['account'];
                accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
                if (account['contract']) {
                    const key = account['contract'];
                    accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
                }
            }
            for (const account of solana_accounts) {
                const { pubkey, is_legacy, is_writable } = account;
                accountsMap.set(pubkey, {
                    pubkey: new PublicKey(pubkey),
                    isSigner: false,
                    isWritable: is_writable
                });
                if (is_legacy) {
                    legacyAccounts.push(account);
                }
            }
        }
        return { neonKeys: Array.from(accountsMap.values()), neonTransaction, legacyAccounts };
    }
    catch (e) {
        console.log(e);
    }
    // @ts-ignore
    return { neonKeys: [], neonTransaction: null };
}
export function createExecFromDataInstruction(solanaWallet, neonPDAWallet, neonEvmProgram, neonRawTransaction, neonKeys, proxyStatus) {
    const count = Number(proxyStatus.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
    const a = Buffer.from([50 /* EvmInstruction.TransactionExecuteFromInstruction */]);
    const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
    const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
    const data = Buffer.concat([a, b, c]);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
        { pubkey: neonPDAWallet, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: neonEvmProgram, isSigner: false, isWritable: false },
        ...neonKeys
    ];
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export function createExecFromDataInstructionV2(solanaWallet, neonWallet, neonEvmProgram, neonRawTransaction, neonKeys, proxyStatus, chainId) {
    const count = Number(proxyStatus.NEON_POOL_COUNT ?? NEON_STATUS_DEVNET_SNAPSHOT.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const [balanceAccount] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
    const [treasuryPoolAddress] = collateralPoolAddress(neonEvmProgram, treasuryPoolIndex);
    const a = Buffer.from([50 /* EvmInstruction.TransactionExecuteFromInstruction */]);
    const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
    const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
    const data = Buffer.concat([a, b, c]);
    const keys = [
        { pubkey: solanaWallet, isSigner: true, isWritable: true },
        { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
        { pubkey: balanceAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: true },
        ...neonKeys
    ];
    return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}
export async function createMintNeonWeb3Transaction(web3, neonWallet, associatedToken, splToken, amount, gasLimit = 5e4) {
    const data = mintNeonTransactionData(web3, associatedToken, splToken, amount);
    const transaction = createMintNeonTransaction(neonWallet, splToken, data);
    transaction.gasPrice = await web3.eth.getGasPrice();
    transaction.gas = await web3.eth.estimateGas(transaction);
    transaction.nonce = (await web3.eth.getTransactionCount(neonWallet));
    // @ts-ignore
    transaction['gasLimit'] = gasLimit;
    return transaction;
}
export function mintNeonTransactionData(web3, associatedToken, splToken, amount) {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    return erc20ForSPLContract(web3).methods.transferSolana(associatedToken.toBuffer(), fullAmount).encodeABI();
}
export function createMintNeonTransaction(neonWallet, splToken, data) {
    return { data, from: neonWallet, to: splToken.address, value: `0x0` };
}
export function createMintSolanaTransaction(solanaWallet, tokenMint, associatedToken, proxyStatus) {
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const transaction = new Transaction({ feePayer: solanaWallet });
    // transaction.add(createComputeBudgetUtilsInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createComputeBudgetHeapFrameInstruction(computedBudgetProgram, proxyStatus));
    transaction.add(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
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
export async function createWrapSOLTransaction(connection, solanaWallet, amount, splToken) {
    const tokenMint = new PublicKey(splToken.address_spl);
    const lamports = toFullAmount(amount, splToken.decimals);
    const associatedToken = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
    const wSOLAccount = await connection.getAccountInfo(associatedToken);
    const transaction = new Transaction({ feePayer: solanaWallet });
    const instructions = [];
    if (!wSOLAccount) {
        instructions.push(createAssociatedTokenAccountInstruction(tokenMint, associatedToken, solanaWallet, solanaWallet));
    }
    instructions.push(SystemProgram.transfer({
        fromPubkey: solanaWallet,
        toPubkey: associatedToken,
        lamports
    }));
    instructions.push(createSyncNativeInstruction(associatedToken, TOKEN_PROGRAM_ID));
    transaction.add(...instructions);
    return transaction;
}
export async function createUnwrapSOLTransaction(connection, solanaWallet, splToken) {
    const tokenMint = new PublicKey(splToken.address_spl);
    const associatedToken = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
    const wSOLAccount = await connection.getAccountInfo(associatedToken);
    if (!wSOLAccount) {
        throw new Error(`Error: ${associatedToken.toBase58()} haven't created account...`);
    }
    const transaction = new Transaction({ feePayer: solanaWallet });
    const instructions = [];
    instructions.push(createCloseAccountInstruction(associatedToken, solanaWallet, solanaWallet));
    transaction.add(...instructions);
    return transaction;
}
//# sourceMappingURL=mint-transfer.js.map