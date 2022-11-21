import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TransactionConfig } from 'web3-core';
import { InstructionService } from './InstructionService';
import { NEON_EVM_LOADER_ID, NEON_WRAPPER_SOL } from '../data';
import { EvmInstruction, SPLToken } from '../models';
import { toFullAmount } from '../utils';

// Neon-token
export class NeonPortal extends InstructionService {
  // Solana -> Neon
  async createNeonTransfer(amount: number, splToken: SPLToken, events = this.events) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const transaction = await this.neonTransferTransaction(amount, splToken);
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());
      this.emitFunction(events.onSuccessSign, signature);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  // Neon -> Solana
  async createSolanaTransfer(amount: number, splToken: SPLToken, events = this.events) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const transaction = this.getEthereumTransactionParams(amount, splToken);
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const neonTransaction = await this.web3.eth.sendTransaction(transaction);
      this.emitFunction(events.onSuccessSign, undefined, neonTransaction.transactionHash);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  async neonTransferTransaction(amount: number, token: SPLToken): Promise<Transaction> {
    const solanaWallet = this.solanaWalletPubkey;
    const [neonWallet] = await this.neonAccountAddress(this.neonWalletAddress);
    const neonAccount = await this.getNeonAccount(neonWallet);
    const [authorityPoolPubkey] = await this.getAuthorityPoolAddress();
    const { blockhash } = await this.connection.getLatestBlockhash();
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });

    if (!neonAccount) {
      transaction.add(this.createAccountV3Instruction(solanaWallet, neonWallet, this.neonWalletAddress));
    }

    const neonToken: SPLToken = {
      ...token,
      decimals: Number(this.proxyStatus.NEON_TOKEN_MINT_DECIMALS)
    };

    const fullAmount = toFullAmount(amount, neonToken.decimals);
    const associatedTokenAddress = await this.getAssociatedTokenAddress(new PublicKey(neonToken.address_spl), solanaWallet);
    const approveInstruction = await this.approveDepositInstruction(solanaWallet, neonWallet, associatedTokenAddress, fullAmount);
    const depositInstruction = await this.createDepositInstruction(solanaWallet, neonWallet, authorityPoolPubkey, this.neonWalletAddress);

    transaction.add(approveInstruction);
    transaction.add(depositInstruction);
    return transaction;
  }

  async createDepositInstruction(solanaPubkey: PublicKey, neonPubkey: PublicKey, depositPubkey: PublicKey, neonWalletAddress: string): Promise<TransactionInstruction> {
    const neonTokenMint = new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
    const solanaAssociatedTokenAddress = await getAssociatedTokenAddress(neonTokenMint, solanaPubkey);
    const poolKey = await getAssociatedTokenAddress(neonTokenMint, depositPubkey, true);
    const keys = [
      { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: poolKey, isSigner: false, isWritable: true },
      { pubkey: neonPubkey, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: solanaPubkey, isSigner: true, isWritable: true }, // operator
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];

    const a = new Buffer([EvmInstruction.DepositV03]);
    const b = new Buffer(neonWalletAddress.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      keys,
      data
    });
  }

  // #endregion
  async getAuthorityPoolAddress(): Promise<[PublicKey, number]> {
    const enc = new TextEncoder();
    return await PublicKey.findProgramAddress([enc.encode('Deposit')], new PublicKey(NEON_EVM_LOADER_ID));
  }

  createWithdrawEthTransactionData(): string {
    const solanaWallet = this.solanaWalletAddress;
    return this.neonWrapperContract.methods.withdraw(solanaWallet.toBytes()).encodeABI();
  }

  getEthereumTransactionParams(amount: number, token: SPLToken): TransactionConfig {
    const fullAmount = toFullAmount(amount, token.decimals);
    return {
      to: NEON_WRAPPER_SOL,
      from: this.neonWalletAddress,
      value: `0x${fullAmount.toString(16)}`,
      data: this.createWithdrawEthTransactionData()
    };
  }
}
