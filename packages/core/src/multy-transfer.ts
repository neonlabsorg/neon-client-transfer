import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createApproveInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { neonBalanceProgramAddress, toFullAmount } from './utils';
import { createNeonDepositToBalanceInstruction } from './neon-transfer';
import { createWrapSOLTransaction } from './mint-transfer';
import { SolanaSOLTransferTransactionParams } from './models';

/**
 * Creates a transaction to transfer SOL from Solana to the NeonEVM chain.
 *
 * This function generates a transaction for transferring SOL from the Solana blockchain
 * to the NeonEVM chain that uses SOL as the gas token. The NeonEVM can have different chains
 * with different gas tokens (multi-token gas feature). The transaction wraps the SOL token, approves it, and then
 * deposits it to the Neon balance.
 *
 * For more information, see the [NeonEVM Documentation](https://neonevm.org/docs/developing/integrate/neon_transfer#23-multi-token-gas-fee).
 *
 * @param {SolanaSOLTransferTransactionParams} params - The parameters required to create the SOL transfer transaction.
 * @param {Connection} params.connection - The Solana connection object used to interact with the blockchain.
 * @param {PublicKey} params.solanaWallet - The public key of the user's Solana wallet, which will serve as the fee payer.
 * @param {string} params.neonWallet - The address of the Neon wallet.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program on Solana.
 * @param {PublicKey} params.neonTokenMint - The public key of the Neon token mint on Solana.
 * @param {SPLToken} params.splToken - The SPL token object representing the token being transferred.
 * @param {Amount} params.amount - The amount of SOL to be transferred.
 * @param {number} [params.chainId=111] - Neon EVM chain ID.
 * @returns {Promise<Transaction>} - A Promise that resolves to the generated Solana transaction.
 *
 * @example
 * ```typescript
 * const connection = new Connection("https://api.devnet.solana.com");
 * const solanaWallet = new PublicKey("your_solana_wallet_public_key");
 * const neonWallet = "your_neon_wallet_address";
 * const neonEvmProgram = new PublicKey("neon_evm_program_public_key");
 * const neonTokenMint = new PublicKey("neon_token_mint_public_key");
 * const splToken: SPLToken = {
 *   address: "erc20_token_address",
 *   address_spl: "address_spl_value",
 *   chainId: 245022927,
 *   decimals: 9,
 *   logoURI: "logo_url",
 *   name: "SOL Token",
 *   symbol: "SOL",
 * };
 *
 * const transaction = await solanaSOLTransferTransaction({
 *   connection,
 *   solanaWallet,
 *   neonWallet,
 *   neonEvmProgram,
 *   neonTokenMint,
 *   splToken,
 *   amount: 2,
 *   chainId: 245022927
 * });
 * console.log("Transaction created successfully:", transaction);
 * ```
 */
export async function solanaSOLTransferTransaction({
  connection,
  solanaWallet,
  neonWallet,
  neonEvmProgram,
  neonTokenMint,
  splToken,
  amount,
  chainId = 111
}: SolanaSOLTransferTransactionParams): Promise<Transaction> {
  const [balanceAddress] = neonBalanceProgramAddress(neonWallet, neonEvmProgram, chainId);
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const transaction = await createWrapSOLTransaction({ connection, solanaWallet, amount, splToken });

  transaction.add(createApproveInstruction(associatedTokenAddress, balanceAddress, solanaWallet, fullAmount));
  transaction.add(createNeonDepositToBalanceInstruction({ chainId, solanaWallet, tokenAddress: associatedTokenAddress, neonWallet, neonEvmProgram, tokenMint: neonTokenMint }));

  return transaction;
}
