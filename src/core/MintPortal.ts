import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
import { COMPUTE_BUDGET_ID, NEON_EVM_LOADER_ID, SPL_TOKEN_DEFAULT } from '../data';
import { etherToProgram, toBytesInt32, toFullAmount } from '../utils';
import { EvmInstruction, SPLToken } from '../models';

// ERC-20 tokens
export class MintPortal extends InstructionService {
  // #region Solana -> Neon
  async createNeonTransfer(events = this.events, amount: number, splToken = SPL_TOKEN_DEFAULT) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const fullAmount = toFullAmount(amount, splToken.decimals);
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const solanaWallet = this.solanaWalletPubkey;
    const emulateSigner = this.solanaWalletSigner;
    const [neonAddress] = await this.neonAccountAddress;
    const [accountPDA] = await etherToProgram(emulateSigner.address);

    const computeBudgetUtilsInstruction = this.computeBudgetUtilsInstruction(computedBudgetProgram);
    const computeBudgetHeapFrameInstruction = this.computeBudgetHeapFrameInstruction(computedBudgetProgram);
    const {
      createApproveInstruction,
      associatedTokenAddress
    } = await this.approveDepositInstruction(solanaWallet, accountPDA, splToken, amount);

    const { neonKeys, neonTransaction, nonce } = await this.createClaimInstruction(
      solanaWallet,
      associatedTokenAddress,
      this.neonWalletAddress,
      splToken,
      emulateSigner,
      fullAmount
    );

    const { blockhash } = await this.connection.getRecentBlockhash();
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });
    // 0, 1, 2, 3
    transaction.add(computeBudgetUtilsInstruction);
    transaction.add(computeBudgetHeapFrameInstruction);
    transaction.add(createApproveInstruction);

    if (nonce === 0) {
      transaction.add(this.createAccountV3Instruction(solanaWallet, accountPDA, emulateSigner));
    }

    // 4
    if (neonTransaction?.rawTransaction) {
      transaction.add(await this.makeTrExecFromDataIx(neonAddress, neonTransaction.rawTransaction, neonKeys));
    }

    this.emitFunction(events.onBeforeSignTransaction);

    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const sign = await this.connection.sendRawTransaction(signedTransaction.serialize(), { skipPreflight: true });
      this.emitFunction(events.onSuccessSign, sign);
    } catch (e) {
      this.emitFunction(events.onErrorSign, e);
    }
  }

  createAccountV3Instruction(solanaWallet: PublicKey, emulateSignerPDA: PublicKey, emulateSigner: Account): TransactionInstruction {
    const a = new Buffer([EvmInstruction.CreateAccountV03]);
    const b = new Buffer(emulateSigner.address.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      keys: [
        { pubkey: solanaWallet, isWritable: true, isSigner: true },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        { pubkey: emulateSignerPDA, isWritable: true, isSigner: false }
      ],
      data
    });
  }

  computeBudgetUtilsInstruction(programId: PublicKey): TransactionInstruction {
    const a = Buffer.from([0x00]);
    const b = Buffer.from(toBytesInt32(parseInt(this.proxyStatus.NEON_COMPUTE_UNITS)));
    const c = Buffer.from(toBytesInt32(0));
    const data = Buffer.concat([a, b, c]);
    return new TransactionInstruction({ programId, data, keys: [] });
  }

  computeBudgetHeapFrameInstruction(programId: PublicKey): TransactionInstruction {
    const a = new Buffer([0x01]);
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
      // @ts-ignore
      const neonEmulate = await this.proxyApi.neonEmulate([signedTransaction.rawTransaction.slice(2)]);

      const accountsMap = new Map<string, AccountMeta>();
      if (neonEmulate) {
        // @ts-ignore
        for (const account of neonEmulate['accounts']) {
          const key = account['account'];
          accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
          if (account['contract']) {
            const key = account['contract'];
            accountsMap.set(key, { pubkey: new PublicKey(key), isSigner: false, isWritable: true });
          }
        }

        // @ts-ignore
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
    const count = 10;
    // const count = Number(this.proxyStatus.NEON_POOL_COUNT);
    const treasuryPoolIndex = Math.floor(Math.random() * count) % count;
    const treasuryPoolAddress = await this.createCollateralPoolAddress(treasuryPoolIndex);
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

  async createCollateralPoolAddress(collateralPoolIndex: number): Promise<PublicKey> {
    const seed = `collateral_seed_${collateralPoolIndex}`;
    const collateralPoolBase = new PublicKey(this.proxyStatus.NEON_POOL_BASE);
    return PublicKey.createWithSeed(collateralPoolBase, seed, new PublicKey(NEON_EVM_LOADER_ID));
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

  // #endregion
  async createSolanaTransfer(events = this.events, amount = 0, splToken = SPL_TOKEN_DEFAULT) {
    const solanaWallet = this.solanaWalletAddress;
    const computedBudgetProgram = new PublicKey(COMPUTE_BUDGET_ID);
    const computeBudgetUtilsInstruction = this.computeBudgetUtilsInstruction(computedBudgetProgram);
    const computeBudgetHeapFrameInstruction = this.computeBudgetHeapFrameInstruction(computedBudgetProgram);

    const mintPubkey = new PublicKey(splToken.address_spl);
    const assocTokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey,
      solanaWallet
    );

    const { blockhash } = await this.connection.getRecentBlockhash();
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });
    transaction.add(computeBudgetUtilsInstruction);
    transaction.add(computeBudgetHeapFrameInstruction);

    const createAccountInstruction = this.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mintPubkey, // token mint
      assocTokenAccountAddress, // account to create
      solanaWallet, // new account owner
      solanaWallet // payer
    );
    transaction.add(createAccountInstruction);

    this.emitFunction(events.onBeforeSignTransaction);

    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const sig = await this.connection.sendRawTransaction(signedTransaction.serialize());
      const tr = await this.createNeonTransaction(this.neonWalletAddress, assocTokenAccountAddress, splToken, amount);
      this.emitFunction(events.onSuccessSign, sig, tr.transactionHash);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  // #region Neon -> Solana
  createAssociatedTokenAccountInstruction(associatedProgramId: PublicKey, programId: PublicKey, mint: PublicKey, associatedAccount: PublicKey, owner: PublicKey, payer: PublicKey): TransactionInstruction {
    const data = new Buffer([0x1]);
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedAccount, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }];

    return new TransactionInstruction({ keys, programId: associatedProgramId, data });
  }
}
