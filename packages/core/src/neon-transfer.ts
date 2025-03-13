import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  createApproveInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TokenInstruction,
  transferInstructionData
} from '@solana/spl-token';
import { parseUnits } from 'ethers';
import { NEON_TOKEN_DECIMALS } from './data';
import {
  Amount,
  EvmInstruction,
  NeonDepositToBalanceInstructionParams,
  NeonTransferInstructionParams,
  SolanaNEONTransferTransactionParams,
  SPLToken
} from './models';
import {
  authorityPoolAddress,
  neonBalanceProgramAddress,
  neonWalletProgramAddress,
  numberTo64BitLittleEndian,
  toBigInt,
  toFullAmount
} from './utils';

/**
 * Creates a Solana transaction to transfer NEON tokens.
 *
 * This function generates a transaction for transferring NEON tokens from the Solana blockchain to Neon EVM.
 * It creates the necessary instructions to approve the associated token account and deposit to
 * a balance program address. Optionally, it adds a reward transfer instruction if a service wallet
 * and reward amount are provided.
 *
 * @param {SolanaNEONTransferTransactionParams} params - An object containing the parameters required to perform the NEON token transfer.
 * @param {PublicKey} params.solanaWallet - The public key of the user's Solana wallet, which will serve as the fee payer.
 * @param {string} params.neonWallet - The address of the NEON wallet - receiver of NEON tokens.
 * @param {PublicKey} params.neonEvmProgram - The public key of the NEON EVM program on Solana.
 * @param {PublicKey} params.neonTokenMint - The public key of the NEON token mint on Solana.
 * @param {SPLToken} params.token - The SPL token object representing the NEON token being transferred.
 * @param {Amount} params.amount - The amount of NEON tokens to transfer.
 * @param {number} [params.chainId=111] - Neon EVM chain ID.
 * @param {PublicKey} [params.serviceWallet] - An optional public key of a service wallet to which rewards should be transferred.
 * @param {Amount} [params.rewardAmount] - An optional reward amount to be transferred to the service wallet.
 * @returns {Promise<Transaction>} - A Promise that resolves to the generated Solana transaction.
 *
 * @example
 * ```typescript
 * const connection = new Connection("https://api.devnet.solana.com");
 * const solanaWallet = new PublicKey("your_solana_wallet_public_key");
 * const neonWallet = "your_neon_wallet_address";
 * const neonEvmProgram = new PublicKey("neon_evm_program_public_key");
 * const neonTokenMint = new PublicKey("neon_token_mint_public_key");
 * const token: SPLToken = {
 *   address: "erc20_token_address",
 *   address_spl: "address_spl_value",
 *   chainId: 245022926,
 *   decimals: 18,
 *   logoURI: "logo_url",
 *   name: "NEON Token",
 *   symbol: "NEON",
 * };
 *
 * const transaction = await solanaNEONTransferTransaction({
 *   solanaWallet,
 *   neonWallet,
 *   neonEvmProgram,
 *   neonTokenMint,
 *   token,
 *   amount: 1,
 *   chainId: 245022926
 * });
 * console.log("Transaction created successfully:", transaction);
 * ```
 */
export async function solanaNEONTransferTransaction({
  solanaWallet,
  neonWallet,
  neonEvmProgram,
  neonTokenMint,
  token,
  amount,
  chainId = 111,
  serviceWallet,
  rewardAmount,
}: SolanaNEONTransferTransactionParams): Promise<Transaction> {
  const neonToken: SPLToken = { ...token, decimals: Number(NEON_TOKEN_DECIMALS) };
  const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const fullAmount = toFullAmount(amount, neonToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(neonToken.address_spl), solanaWallet);
  const transaction = new Transaction({ feePayer: solanaWallet });

  transaction.add(createApproveInstruction(associatedTokenAddress, balanceAddress, solanaWallet, fullAmount));
  transaction.add(createNeonDepositToBalanceInstruction({ chainId, solanaWallet, tokenAddress: associatedTokenAddress, neonWallet, neonEvmProgram, tokenMint: neonTokenMint, serviceWallet }));

  if (serviceWallet && rewardAmount) {
    transaction.add(createNeonTransferInstruction({ neonTokenMint, solanaWallet, serviceWallet, rewardAmount }));
  }

  return transaction;
}

/**
 * Creates a Solana transaction instruction to deposit tokens into a Neon EVM balance.
 *
 * This function generates a `TransactionInstruction` that facilitates the deposit of SPL tokens
 * into a Neon EVM balance.
 *
 * @param {NeonDepositToBalanceInstructionParams} params - The parameters required for the deposit transaction.
 * @param {number} params.chainId - The chain ID of the target blockchain.
 * @param {PublicKey} params.solanaWallet - The public key of the Solana wallet initiating the transaction.
 * @param {PublicKey} params.tokenAddress - The public key of the source token account.
 * @param {string} params.neonWallet - The Ethereum-style Neon wallet address in hex format.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program.
 * @param {PublicKey} params.tokenMint - The public key of the SPL token mint.
 * @param {PublicKey} [params.serviceWallet] - The optional service wallet used for operational transactions.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for depositing tokens into the Neon EVM balance.
 *
 * @example
 * ```typescript
 * const instruction = createNeonDepositToBalanceInstruction({
 *   chainId: 245022926,
 *   solanaWallet: userWallet,
 *   tokenAddress: userTokenAccount,
 *   neonWallet: "0x1234567890abcdef1234567890abcdef12345678",
 *   neonEvmProgram: neonProgram,
 *   tokenMint: tokenMintAddress,
 *   serviceWallet: serviceWalletAddress
 * });
 * transaction.add(instruction);
 * ```
 */
export function createNeonDepositToBalanceInstruction({
  chainId,
  solanaWallet,
  tokenAddress,
  neonWallet,
  neonEvmProgram,
  tokenMint,
  serviceWallet,
}: NeonDepositToBalanceInstructionParams): TransactionInstruction {
  const [depositWallet] = authorityPoolAddress(neonEvmProgram);
  const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const [contractAddress] = neonWalletProgramAddress(neonWallet, neonEvmProgram);
  const poolAddress = getAssociatedTokenAddressSync(tokenMint, depositWallet, true);
  const keys = [
    { pubkey: tokenMint, isSigner: false, isWritable: true }, // mint address
    { pubkey: tokenAddress, isSigner: false, isWritable: true }, // source
    { pubkey: poolAddress, isSigner: false, isWritable: true }, // pool key
    { pubkey: balanceAddress, isSigner: false, isWritable: true },
    { pubkey: contractAddress, isSigner: false, isWritable: true }, // contract_account
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: serviceWallet ? serviceWallet : solanaWallet, isSigner: true, isWritable: true }, // operator
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  const a = Buffer.from([EvmInstruction.DepositToBalance]);
  const b = Buffer.from(neonWallet.slice(2), 'hex');
  const c = Buffer.from(numberTo64BitLittleEndian(chainId));
  const data = Buffer.concat([a, b, c]);
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

/**
 * Not used
 *
 * Creates a Solana transaction instruction to deposit tokens into a Neon EVM account.
 *
 * This function generates a `TransactionInstruction` that facilitates the deposit of SPL tokens
 * into a Neon EVM-compatible account.
 *
 * @param {PublicKey} solanaWallet - The public key of the Solana wallet initiating the deposit.
 * @param {PublicKey} neonPDAWallet - The public key of the Neon PDA wallet.
 * @param {PublicKey} depositWallet - The public key of the deposit wallet.
 * @param {string} neonWallet - The Ethereum-style Neon wallet address in hex format.
 * @param {PublicKey} neonEvmProgram - The public key of the Neon EVM program.
 * @param {PublicKey} neonTokenMint - The public key of the SPL token mint.
 * @param {PublicKey} [serviceWallet] - The optional service wallet used for operational transactions.
 * @returns {TransactionInstruction} A Solana `TransactionInstruction` for depositing tokens into the Neon EVM account.
 */
export function createNeonDepositInstruction(solanaWallet: PublicKey, neonPDAWallet: PublicKey, depositWallet: PublicKey, neonWallet: string, neonEvmProgram: PublicKey, neonTokenMint: PublicKey, serviceWallet?: PublicKey): TransactionInstruction {
  const solanaAssociatedTokenAddress = getAssociatedTokenAddressSync(neonTokenMint, solanaWallet);
  const poolKey = getAssociatedTokenAddressSync(neonTokenMint, depositWallet, true);
  const keys = [
    { pubkey: solanaAssociatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: poolKey, isSigner: false, isWritable: true },
    { pubkey: neonPDAWallet, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: serviceWallet ? serviceWallet : solanaWallet, isSigner: true, isWritable: true }, // operator
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  const a = Buffer.from([EvmInstruction.DepositV03]);
  const b = Buffer.from(neonWallet.slice(2), 'hex');
  const data = Buffer.concat([a, b]);
  return new TransactionInstruction({ programId: neonEvmProgram, keys, data });
}

export function createNeonTransferInstruction({
  neonTokenMint,
  solanaWallet,
  serviceWallet,
  rewardAmount,
}: NeonTransferInstructionParams): TransactionInstruction {
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

/**
 * Creates a transaction-like object that represents an unwrap WNEON in NEON token.
 *
 * @template T - The expected type of the transaction-like object, commonly `TransactionRequest` from ethers.js.
 * @param from - The sender address in hexadecimal format.
 * @param to - The recipient address in hexadecimal format - commonly wneon token contract address.
 * @param data - The additional data to include in the transaction, represented as a string.
 * @returns An object representing the transaction, cast to the expected type `T`.
 *
 * @example
 * ```typescript
 * import { TransactionRequest } from 'ethers';
 *
 * const fromAddress = "0x1234567890abcdef1234567890abcdef12345678";
 * const toAddress = wneon.address;
 * const data = "0x";
 *
 * const unwrapTransaction = wrappedNeonTransaction<TransactionRequest>(fromAddress, toAddress, data);
 * ```
 */
export function wrappedNeonTransaction<T>(from: string, to: string, data: string): T {
  const value = `0x0`;
  return { from, to, value, data } as T;
}

/**
 * Creates a transaction-like object that represents a NEON token transfer.
 *
 * @template T - The expected type of the transaction-like object, commonly `TransactionRequest` from ethers.js.
 * @param from - The sender address in hexadecimal format - Neon EVM address.
 * @param to - The recipient address in hexadecimal format - commonly token transfer contract address.
 * @param amount - The amount of tokens to transfer, represented as a number, string, or bigint.
 * @param data - The additional data to include in the transaction, represented as a string.
 * @returns An object representing the transaction, cast to the expected type `T`.
 *
 * @example
 * ```typescript
 * import { TransactionRequest } from 'ethers';
 *
 * const fromAddress = "0x1234567890abcdef1234567890abcdef12345678";
 * const toAddress = "0xabcdef1234567890abcdef1234567890abcdef12";
 * const amount = "10";
 * const data = "0x";
 *
 * const transaction: TransactionRequest = neonNeonTransaction<TransactionRequest>(fromAddress, toAddress, amount, data);
 * ```
 */
export function neonNeonTransaction<T>(from: string, to: string, amount: Amount, data: string): T {
  const value = `0x${parseUnits(amount.toString(), 'ether').toString(16)}`;
  return { from, to, value, data } as T;
}
