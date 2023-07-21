import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TokenInstruction,
  transferInstructionData
} from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { TransactionConfig } from 'web3-core';
import { InstructionService } from './InstructionService';
import { Amount, EvmInstruction, SPLToken } from '../models';
import { toFullAmount } from '../utils';
import { toBigInt } from '../utils/address';

// Neon Token Transfer
export class NeonPortal extends InstructionService {
  // Solana -> Neon
  async createNeonTransfer(amount: number, splToken: SPLToken, events = this.events) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const transaction = await this.neonTransferTransaction(amount, splToken);
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const signedTransaction = await this.solana.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), this.solanaOptions);
      this.emitFunction(events.onSuccessSign, signature);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  // Neon -> Solana
  async createSolanaTransfer(amount: number, splToken: SPLToken, events = this.events) {
    this.emitFunction(events.onBeforeCreateInstruction);
    const transaction = this.ethereumTransaction(amount, splToken);
    this.emitFunction(events.onBeforeSignTransaction);
    try {
      const neonTransaction = await this.web3.eth.sendTransaction(transaction);
      this.emitFunction(events.onSuccessSign, undefined, neonTransaction.transactionHash);
    } catch (error) {
      this.emitFunction(events.onErrorSign, error);
    }
  }

  async neonTransferTransaction(amount: Amount, token: SPLToken, serviceWallet?: PublicKey, rewardAmount?: Amount): Promise<Transaction> {
    const solanaWallet = this.solanaWalletPubkey;
    const [neonWallet] = this.neonAccountAddress(this.neonWalletAddress);
    const [authorityPoolPubkey] = this.getAuthorityPoolAddress();
    // const neonAccount = await this.getNeonAccount(neonWallet);
    const { blockhash } = await this.connection.getLatestBlockhash('finalized');
    const transaction = new Transaction({ recentBlockhash: blockhash, feePayer: solanaWallet });

    // if (!neonAccount) {
    //   transaction.add(this.createAccountV3Instruction(solanaWallet, neonWallet, this.neonWalletAddress));
    // }

    const neonToken: SPLToken = {
      ...token,
      decimals: Number(this.proxyStatus.NEON_TOKEN_MINT_DECIMALS)
    };

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
  }

  createDepositInstruction(solanaPubkey: PublicKey, neonPubkey: PublicKey, depositPubkey: PublicKey, neonWalletAddress: string, serviceWallet?: PublicKey): TransactionInstruction {
    const neonTokenMint = new PublicKey(this.proxyStatus.NEON_TOKEN_MINT);
    const solanaAssociatedTokenAddress = getAssociatedTokenAddressSync(neonTokenMint, solanaPubkey);
    const poolKey = getAssociatedTokenAddressSync(neonTokenMint, depositPubkey, true);
    const keys = [
      { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: poolKey, isSigner: false, isWritable: true },
      { pubkey: neonPubkey, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: serviceWallet ? serviceWallet : solanaPubkey, isSigner: true, isWritable: true }, // operator
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ];

    const a = Buffer.from([EvmInstruction.DepositV03]);
    const b = Buffer.from(neonWalletAddress.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  neonTransferInstruction(solanaWallet: PublicKey, serviceWallet: PublicKey, rewardAmount: Amount): TransactionInstruction {
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
  getAuthorityPoolAddress(): [PublicKey, number] {
    const enc = new TextEncoder();
    return PublicKey.findProgramAddressSync([enc.encode('Deposit')], this.programId);
  }

  createWithdrawEthTransactionData(): string {
    const solanaWallet = this.solanaWalletAddress;
    return this.neonWrapperContract.methods.withdraw(solanaWallet.toBuffer()).encodeABI();
  }

  ethereumTransaction(amount: Amount, token: SPLToken): TransactionConfig {
    const from = this.neonWalletAddress;
    const to = this.neonContractAddress;
    const value = `0x${BigInt(this.web3.utils.toWei(amount.toString(), 'ether')).toString(16)}`;
    const data = this.createWithdrawEthTransactionData();
    return { from, to, value, data };
  }

  createWithdrawWNeonTransaction(amount: Amount, address: string): string {
    const contract = this.neonWrapper2Contract(address);
    return contract.methods.withdraw(amount).encodeABI();
  }

  wNeonTransaction(amount: Amount, token: SPLToken): TransactionConfig {
    const from = this.neonWalletAddress;
    const to = token.address;
    const value = `0x0`;
    const data = this.createWithdrawWNeonTransaction(this.web3.utils.toWei(amount.toString(), 'ether'), to);
    return { from, to, value, data };
  }

  neonTransaction(amount: Amount, token: SPLToken): TransactionConfig {
    const from = this.neonWalletAddress;
    const to = token.address;
    const value = `0x${BigInt(this.web3.utils.toWei(amount.toString(), 'ether')).toString(16)}`;
    const data = this.createWithdrawEthTransactionData();
    return { from, to, value, data };
  }
}
