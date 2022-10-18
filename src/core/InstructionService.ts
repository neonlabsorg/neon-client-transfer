import {
  AccountInfo,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction
} from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AbiItem } from 'web3-utils';
import Big from 'big.js';
import Web3 from 'web3';
import { Account, TransactionConfig } from 'web3-core';
import { Contract } from 'web3-eth-contract';
import { SHA256 } from 'crypto-js';
import { NeonProxyRpcApi } from '../api';
import { etherToProgram, toFullAmount } from '../utils';
import { erc20Abi, NEON_EVM_LOADER_ID, neonWrapperAbi } from '../data';
import {
  EvmInstruction,
  InstructionEvents,
  InstructionParams,
  NeonProgramStatus,
  SPLToken
} from '../models';

Big.PE = 42;

const noop = new Function();

export class InstructionService {
  solanaWalletAddress: PublicKey;
  neonWalletAddress: string;
  web3: Web3;
  proxyApi: NeonProxyRpcApi;
  proxyStatus: NeonProgramStatus;
  connection: Connection;
  events: InstructionEvents;

  constructor(options: InstructionParams) {
    this.web3 = options.web3;
    this.proxyApi = options.proxyApi;
    this.proxyStatus = options.proxyStatus;
    this.solanaWalletAddress = options.solanaWalletAddress || '';
    this.neonWalletAddress = options.neonWalletAddress || '';
    this.connection = options.connection;
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

  get neonAccountAddress(): Promise<[PublicKey, number]> {
    return etherToProgram(this.neonWalletAddress);
  }

  async getNeonAccount(neonAssociatedKey: PublicKey): Promise<AccountInfo<Buffer> | null> {
    return this.connection.getAccountInfo(neonAssociatedKey);
  }

  async neonAccountInstruction(): Promise<TransactionInstruction> {
    const [neonAddress, neonNonce] = await this.neonAccountAddress;
    const keys = [
      { pubkey: this.solanaWalletPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: neonAddress, isSigner: false, isWritable: true }
    ];
    const a = new Buffer([EvmInstruction.CreateAccountV02]);
    const b = Buffer.from(this.neonWalletAddress, 'hex');
    const c = new Buffer([neonNonce]);
    const data = Buffer.concat([a, b, c]);
    return new TransactionInstruction({
      programId: new PublicKey(NEON_EVM_LOADER_ID),
      data,
      keys
    });
  }

  async approveDepositInstruction(solanaPubkey: PublicKey, neonPDAPubkey: PublicKey, token: SPLToken, amount: number): Promise<{ associatedTokenAddress: PublicKey, createApproveInstruction: TransactionInstruction }> {
    const fullAmount = toFullAmount(amount, token.decimals);
    const associatedTokenAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      new PublicKey(token.address_spl),
      solanaPubkey
    );

    const createApproveInstruction = Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      associatedTokenAddress,
      neonPDAPubkey,
      solanaPubkey,
      [],
      Number(fullAmount.toString(10))
    );

    return { associatedTokenAddress, createApproveInstruction };
  }

  _computeWithdrawEthTransactionData(amount: number, splToken: SPLToken): string {
    const approveSolanaMethodID = '0x93e29346';
    const solanaPubkey = this.solanaWalletPubkey;
    // @ts-ignore
    const solanaStr = solanaPubkey.toBytes().toString('hex');
    const amountUnit = Big(amount).times(Big(10).pow(splToken.decimals));
    // @ts-ignore
    const amountStr = BigInt(amountUnit).toString(16).padStart(64, '0');

    return `${approveSolanaMethodID}${solanaStr}${amountStr}`;
  }

  createApproveSolanaData(solanaWallet: PublicKey, splToken: SPLToken, amount: number): string {
    const fullAmount = toFullAmount(amount, splToken.decimals);
    return this.erc20ForSPLContract.methods.approveSolana(solanaWallet.toBytes(), fullAmount).encodeABI();
  }

  getEthereumTransactionParams(amount: number, token: SPLToken): TransactionConfig {
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
