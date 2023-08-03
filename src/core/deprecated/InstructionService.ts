import {
  AccountInfo,
  Connection,
  PublicKey,
  SendOptions,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { AbiItem } from 'web3-utils';
import { Account, TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { SHA256 } from 'crypto-js';
import { NeonProxyRpcApi } from '../../api';
import { isValidHex, toFullAmount } from '../../utils';
import { erc20Abi, neonWrapper2Abi, neonWrapperAbi } from '../../data';
import {
  AccountHex,
  Amount,
  EvmInstruction,
  InstructionEvents,
  InstructionParams,
  NeonProgramStatus,
  SPLToken
} from '../../models';
import { Buffer } from 'buffer';
import { neonWalletProgramAddress } from '../utils';

const noop = new Function();

export class InstructionService {
  solanaWalletAddress: PublicKey;
  neonWalletAddress: string;
  neonContractAddress: string;
  web3: Web3;
  proxyApi: NeonProxyRpcApi;
  proxyStatus: NeonProgramStatus;
  connection: Connection;
  events: InstructionEvents;
  solanaOptions: SendOptions;

  get programId(): PublicKey {
    return new PublicKey(this.proxyStatus.NEON_EVM_ID);
  }

  constructor(options: InstructionParams) {
    this.web3 = options.web3;
    this.proxyApi = options.proxyApi;
    this.proxyStatus = options.proxyStatus;
    this.solanaWalletAddress = options.solanaWalletAddress || '';
    this.neonWalletAddress = options.neonWalletAddress || '';
    this.neonContractAddress = options.neonContractAddress || '';
    this.connection = options.connection;
    this.solanaOptions = options.solanaOptions ?? { skipPreflight: false };
    this.events = {
      onBeforeCreateInstruction: options.onBeforeCreateInstruction || noop,
      onCreateNeonAccountInstruction: options.onCreateNeonAccountInstruction || noop,
      onBeforeSignTransaction: options.onBeforeSignTransaction || noop,
      onBeforeNeonSign: options.onBeforeNeonSign || noop,
      onSuccessSign: options.onSuccessSign || noop,
      onErrorSign: options.onErrorSign || noop
    };
  }

  get erc20ForSPLContract(): Contract {
    return new this.web3.eth.Contract(erc20Abi as AbiItem[]);
  }

  get neonWrapperContract(): Contract {
    return new this.web3.eth.Contract(neonWrapperAbi as AbiItem[]);
  }

  neonWrapper2Contract(address: string): Contract {
    return new this.web3.eth.Contract(neonWrapper2Abi as AbiItem[], address);
  }

  get solana(): any {
    if ('solana' in window) {
      return window['solana'];
    }
    return {};
  }

  get solanaWalletPubkey(): PublicKey {
    return new PublicKey(this.solanaWalletAddress);
  }

  get solanaWalletSigner(): Account {
    const solanaWallet = this.solanaWalletPubkey.toBase58();
    const neonWallet = this.neonWalletAddress;
    const emulateSignerPrivateKey = `0x${SHA256(solanaWallet + neonWallet).toString()}`;
    return this.web3.eth.accounts.privateKeyToAccount(emulateSignerPrivateKey);
  }

  neonAccountAddress(neonWallet: string): [PublicKey, number] {
    return neonWalletProgramAddress(neonWallet, this.programId);
  }

  authAccountAddress(neonWallet: string, token: SPLToken): [PublicKey, number] {
    const neonAccountAddressBytes = Buffer.concat([Buffer.alloc(12), Buffer.from(isValidHex(neonWallet) ? neonWallet.replace(/^0x/i, '') : neonWallet, 'hex')]);
    const neonContractAddressBytes = Buffer.from(isValidHex(token.address) ? token.address.replace(/^0x/i, '') : token.address, 'hex');
    const seed = [
      new Uint8Array([AccountHex.SeedVersion]),
      new Uint8Array(Buffer.from('AUTH', 'utf-8')),
      new Uint8Array(neonContractAddressBytes),
      new Uint8Array(neonAccountAddressBytes)];
    return PublicKey.findProgramAddressSync(seed, this.programId);
  }

  async getNeonAccount(neonAssociatedKey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    return this.connection.getAccountInfo(neonAssociatedKey);
  }

  createAccountV3Instruction(solanaWallet: PublicKey, neonWalletPDA: PublicKey, neonWallet: string): TransactionInstruction {
    const keys = [
      { pubkey: solanaWallet, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: neonWalletPDA, isSigner: false, isWritable: true }
    ];
    const a = Buffer.from([EvmInstruction.CreateAccountV03]);
    const b = Buffer.from(neonWallet.slice(2), 'hex');
    const data = Buffer.concat([a, b]);
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  getAssociatedTokenAddress(mintPubkey: PublicKey, walletPubkey: PublicKey): PublicKey {
    return getAssociatedTokenAddressSync(mintPubkey, walletPubkey);
  }

  approveDepositInstruction(walletPubkey: PublicKey, neonPDAPubkey: PublicKey, associatedTokenPubkey: PublicKey, amount: number | bigint): TransactionInstruction {
    return createApproveInstruction(associatedTokenPubkey, neonPDAPubkey, walletPubkey, amount);
  }

  createApproveSolanaData(solanaWallet: PublicKey, splToken: SPLToken, amount: Amount): string {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    return this.erc20ForSPLContract.methods.approveSolana(solanaWallet.toBuffer(), fullAmount).encodeABI();
  }

  ethereumTransaction(amount: Amount, token: SPLToken): TransactionConfig {
    const solanaWallet = this.solanaWalletPubkey;
    return {
      to: token.address, // Required except during contract publications.
      from: this.neonWalletAddress, // must match user's active address.
      value: '0x00', // Only required to send ether to the recipient from the initiating external account.
      data: this.createApproveSolanaData(solanaWallet, token, amount)
    };
  }

  emitFunction = (functionName?: Function, ...args: any[]): void => {
    if (typeof functionName === 'function') {
      functionName(...args);
    }
  };
}
