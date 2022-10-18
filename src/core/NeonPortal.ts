import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import Big from 'big.js';
import { TransactionConfig } from 'web3-core';
import { InstructionService } from './InstructionService';
import { NEON_EVM_LOADER_ID, NEON_WRAPPER_SOL, SPL_TOKEN_DEFAULT } from '../data';
import { EvmInstruction, SPLToken } from '../models';

// Neon-token
export class NeonPortal extends InstructionService {
  // #region Solana -> Neon
  async createNeonTransfer(events = this.events, amount = 0, token: SPLToken) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const solanaWallet = this.solanaWalletPubkey;
    const [neonWallet] = await this.neonAccountAddress;
    const neonAccount = await this.getNeonAccount(neonWallet);
    const [authorityPoolPubkey] = await this.getAuthorityPoolAddress();
    const { blockhash } = await this.connection.getRecentBlockhash();
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });

    if (!neonAccount) {
      const neonAccountInstruction = await this.neonAccountInstruction();
      transaction.add(neonAccountInstruction);
      this.emitFunction(events.onCreateNeonAccountInstruction);
    }

    // console.log(this.proxyStatus);
    const neonToken: SPLToken = {
      ...token,
      decimals: Number(this.proxyStatus.NEON_TOKEN_MINT_DECIMALS)
    };
    const { createApproveInstruction } = await this.approveDepositInstruction(solanaWallet, neonWallet, neonToken, amount);
    transaction.add(createApproveInstruction);

    const depositInstruction = await this.createDepositInstruction(solanaWallet, neonWallet, authorityPoolPubkey, this.neonWalletAddress);
    transaction.add(depositInstruction);
    this.emitFunction(events.onBeforeSignTransaction);

    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const sig = await this.connection.sendRawTransaction(signedTransaction.serialize());
      this.emitFunction(events.onSuccessSign, sig);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  async createDepositInstruction(solanaPubkey: PublicKey, neonPubkey: PublicKey, depositPubkey: PublicKey, neonWalletAddress: string): Promise<TransactionInstruction> {
    const neonTokenMint = new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
    const solanaAssociatedTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      neonTokenMint,
      solanaPubkey
    );
    const poolKey = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      neonTokenMint,
      depositPubkey,
      true
    );
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

  // #region Neon -> Solana
  async createSolanaTransfer(events = this.events, amount = 0, splToken = SPL_TOKEN_DEFAULT) {
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const transaction = await this.web3.eth.sendTransaction(this.getEthereumTransactionParams(amount, splToken));
      this.emitFunction(events.onSuccessSign, undefined, transaction.transactionHash);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  getEthereumTransactionParams(amount: number, token: SPLToken): TransactionConfig {
    return {
      to: NEON_WRAPPER_SOL,
      from: this.neonWalletAddress,
      value: this._computeWithdrawAmountValue(amount, token),
      data: this._computeWithdrawEthTransactionData()
    };
  }

  _computeWithdrawEthTransactionData(): string {
    const withdrawMethodID = '0x8e19899e';
    const solanaPubkey = this.solanaPubkey();
    // @ts-ignore
    const solanaStr = solanaPubkey.toBytes().toString('hex');
    return `${withdrawMethodID}${solanaStr}`;
  }

  _computeWithdrawAmountValue(amount: any, { decimals }: SPLToken): string {
    const result = Big(amount).times(Big(10).pow(decimals));
    // @ts-ignore
    return `0x${BigInt(result).toString(16)}`;
  }
}
