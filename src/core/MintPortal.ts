import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import { Account, SignedTransaction, TransactionConfig, TransactionReceipt } from 'web3-core';
import { Buffer } from 'buffer';
import { InstructionService } from './InstructionService';
import { COMPUTE_BUDGET_ID, NEON_EVM_LOADER_ID } from '../data';
import { toBytesInt32, toFullAmount } from '../utils';
import { EvmInstruction, SPLToken } from '../models';

// ERC-20 tokens
export class MintPortal extends InstructionService {
  // Solana -> Neon
  async createNeonTransfer(amount: number, splToken: SPLToken, events = this.events) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const transaction = await this.neonTransferTransaction(amount, splToken);
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      this.emitFunction(events.onSuccessSign, signature);
    } catch (e) {
      this.emitFunction(events.onErrorSign, e);
    }
  }

  // Neon -> Solana
  async createSolanaTransfer(amount: number, splToken: SPLToken, events = this.events) {
    const mintPubkey = new PublicKey(splToken.address_spl);
    const walletPubkey = this.solanaWalletPubkey;
    const associatedTokenPubkey = await this.getAssociatedTokenAddress(mintPubkey, walletPubkey);
    const transaction = await this.solanaTransferTransaction(walletPubkey, mintPubkey, associatedTokenPubkey);
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const neonTransaction = await this.createNeonTransaction(this.neonWalletAddress, associatedTokenPubkey, splToken, amount);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      this.emitFunction(events.onSuccessSign, signature, neonTransaction.transactionHash);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  async neonTransferTransaction(amount: number, splToken: SPLToken): Promise<Transaction> {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const solanaWallet = this.solanaWalletPubkey;
    const emulateSigner = this.solanaWalletSigner;
    const [neonWalletPDA] = await this.neonAccountAddress(this.neonWalletAddress);
    const [emulateSignerPDA] = await this.neonAccountAddress(emulateSigner.address);
    const emulateSignerPDAAccount = await this.getNeonAccount(emulateSignerPDA);
    const neonWalletAccount = await this.getNeonAccount(neonWalletPDA);

    const associatedTokenAddress = await this.getAssociatedTokenAddress(new PublicKey(splToken.address_spl), solanaWallet);

    const { neonKeys, neonTransaction } = await this.createClaimInstruction(
      solanaWallet,
      associatedTokenAddress,
      this.neonWalletAddress,
      splToken,
      emulateSigner,
      fullAmount
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });
    // 0
    const computeBudgetUtilsInstruction = this.computeBudgetUtilsInstruction(computedBudgetProgram);
    transaction.add(computeBudgetUtilsInstruction);
    const computeBudgetHeapFrameInstruction = this.computeBudgetHeapFrameInstruction(computedBudgetProgram);
    transaction.add(computeBudgetHeapFrameInstruction);
    const createApproveInstruction = await this.approveDepositInstruction(solanaWallet, emulateSignerPDA, associatedTokenAddress, fullAmount);
    transaction.add(createApproveInstruction);

    if (!neonWalletAccount) {
      transaction.add(this.createAccountV3Instruction(solanaWallet, neonWalletPDA, this.neonWalletAddress));
    }

    if (!emulateSignerPDAAccount) {
      transaction.add(this.createAccountV3Instruction(solanaWallet, emulateSignerPDA, emulateSigner.address));
    }

    // 4
    if (neonTransaction?.rawTransaction) {
      transaction.add(await this.makeTrExecFromDataIx(neonWalletPDA, neonTransaction.rawTransaction, neonKeys));
    }

    return transaction;
  }

  computeBudgetUtilsInstruction(programId: PublicKey): TransactionInstruction {
    const a = Buffer.from([0x00]);
    const b = Buffer.from(toBytesInt32(parseInt(this.proxyStatus.NEON_COMPUTE_UNITS)));
    const c = Buffer.from(toBytesInt32(0));
    const data = Buffer.concat([a, b, c]);
    return new TransactionInstruction({ programId, data, keys: [] });
  }

  computeBudgetHeapFrameInstruction(programId: PublicKey): TransactionInstruction {
    const a = Buffer.from([0x01]);
    const b = Buffer.from(toBytesInt32(parseInt(this.proxyStatus.NEON_HEAP_FRAME)));
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId, data, keys: [] });
  }

  async createClaimInstruction(owner: PublicKey, from: PublicKey, to: string, splToken: SPLToken, emulateSigner: Account, amount: any): Promise<{ neonKeys: AccountMeta[], neonTransaction: SignedTransaction, emulateSigner: Account, nonce: number }> {
    const nonce = await this.web3.eth.getTransactionCount(emulateSigner.address);
    try {
      const claimTransaction = this.erc20ForSPLContract.methods.claimTo(from.toBytes(), to, amount).encodeABI();
      const transaction: TransactionConfig = {
        nonce: nonce,
        gas: `0x5F5E100`, // 100000000
        gasPrice: `0x0`,
        from: this.neonWalletAddress,
        to: splToken.address, // contract address
        data: claimTransaction,
        chainId: splToken.chainId
      };

      const signedTransaction = await this.solanaWalletSigner.signTransaction(transaction);
      let neonEmulate: any;
      if (signedTransaction.rawTransaction) {
        neonEmulate = await this.proxyApi.neonEmulate([signedTransaction.rawTransaction.slice(2)]);
      }
      const accountsMap = new Map<string, AccountMeta>();
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
    } catch (e) {
      console.log(e);
    }
    // @ts-ignore
    return { neonKeys: [], neonTransaction: null, emulateSigner: null, nonce };
  }

  async makeTrExecFromDataIx(neonAddress: PublicKey, neonRawTransaction: string, neonKeys: AccountMeta[]): Promise<TransactionInstruction> {
    const programId = new PublicKey(NEON_EVM_LOADER_ID);
    const count = Number(this.proxyStatus.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const [treasuryPoolAddress] = await this.getCollateralPoolAddress(treasuryPoolIndex);
    const a = Buffer.from([EvmInstruction.TransactionExecuteFromData]);
    const b = Buffer.from(toBytesInt32(treasuryPoolIndex));
    const c = Buffer.from(neonRawTransaction.slice(2), 'hex');
    const data = Buffer.concat([a, b, c]);
    const keys: AccountMeta[] = [
      { pubkey: this.solanaWalletPubkey, isSigner: true, isWritable: true },
      { pubkey: treasuryPoolAddress, isSigner: false, isWritable: true },
      { pubkey: neonAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
      ...neonKeys
    ];

    return new TransactionInstruction({ programId, keys, data });
  }

  async getCollateralPoolAddress(collateralPoolIndex: number): Promise<[PublicKey, number]> {
    const a = Buffer.from('treasury_pool', 'utf8');
    const b = Buffer.from(toBytesInt32(collateralPoolIndex));
    return PublicKey.findProgramAddress([a, b], new PublicKey(NEON_EVM_LOADER_ID));
  }

  async createNeonTransaction(neonWallet: string, solanaWallet: PublicKey, splToken: SPLToken, amount: number): Promise<TransactionReceipt> {
    const nonce = await this.web3.eth.getTransactionCount(neonWallet);
    const fullAmount = toFullAmount(amount, splToken.decimals);
    const data = this.erc20ForSPLContract.methods.transferSolana(solanaWallet.toBytes(), fullAmount).encodeABI();
    const transaction: TransactionConfig = {
      nonce,
      from: neonWallet,
      to: splToken.address,
      data: data,
      value: `0x0`,
      chainId: splToken.chainId
    };
    const gasPrice = await this.web3.eth.getGasPrice();
    const gas = await this.web3.eth.estimateGas(transaction);
    transaction['gasPrice'] = gasPrice;
    transaction['gas'] = gas;
    return this.web3.eth.sendTransaction(transaction);
  }

  async solanaTransferTransaction(walletPubkey: PublicKey, mintPubkey: PublicKey, associatedTokenPubkey: PublicKey): Promise<Transaction> {
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const computeBudgetUtilsInstruction = this.computeBudgetUtilsInstruction(computedBudgetProgram);
    const computeBudgetHeapFrameInstruction = this.computeBudgetHeapFrameInstruction(computedBudgetProgram);

    const { blockhash } = await this.connection.getLatestBlockhash();
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: walletPubkey });
    transaction.add(computeBudgetUtilsInstruction);
    transaction.add(computeBudgetHeapFrameInstruction);

    const createAccountInstruction = this.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey, // token mint
      associatedTokenPubkey, // account to create
      walletPubkey, // new account owner
      walletPubkey // payer
    );
    transaction.add(createAccountInstruction);
    return transaction;
  }

  // #region Neon -> Solana
  createAssociatedTokenAccountInstruction(associatedProgramId: PublicKey, programId: PublicKey, mint: PublicKey, associatedAccount: PublicKey, owner: PublicKey, payer: PublicKey): TransactionInstruction {
    const data = Buffer.from([0x1]);
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedAccount, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }];

    return new TransactionInstruction({
      programId: associatedProgramId,
      keys,
      data
    });
  }
}
