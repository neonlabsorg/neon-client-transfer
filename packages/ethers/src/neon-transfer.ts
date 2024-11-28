import { neonNeonTransaction, NeonTransactionParams } from '@neonevm/token-transfer-core';
import { JsonRpcProvider, TransactionRequest } from 'ethers';
import { neonTransactionData } from './utils';

/**
 * Creates and returns a transaction request for transferring NEON tokens from Neon EVM to Solana,
 * designed to interact with Neon EVM using ethers.js.
 * This function estimates the gas limit and fee required for the transaction
 * and returns the configured transaction request.
 *
 * @param {NeonTransactionParams<JsonRpcProvider>} params - The parameters for creating a NEON transaction.
 * @param {string} params.from - The address of the sender.
 * @param {string} params.to - The address of the recipient contract. Example: `NEON_TRANSFER_CONTRACT_DEVNET`
 * @param {PublicKey} params.solanaWallet - The Solana wallet public key to be used as an input for generating the contract interaction data.
 * @param {Amount} params.amount - The amount of tokens to be transferred.
 * @param {JsonRpcProvider} params.provider - The ethers.js provider to interact with the blockchain.
 * @param {bigint} [params.gasLimit=BigInt(5e4)] - The optional gas limit for the transaction.
 *
 * @returns {Promise<TransactionRequest>} - The configured transaction request for the NEON transfer.
 *
 * @example
 * const provider = new JsonRpcProvider("<RPC_ENDPOINT>");
 * const transactionRequest = await neonNeonTransactionEthers({
 *   from: "0xSenderAddress",
 *   to: "0xRecipientContractAddress",
 *   solanaWallet: new PublicKey("<SolanaWalletPublicKey>"),
 *   amount: "1.0",
 *   provider
 * });
 */
export async function neonNeonTransactionEthers({
  from,
  to,
  solanaWallet,
  amount,
  provider,
  gasLimit = BigInt(5e4)
}: NeonTransactionParams<JsonRpcProvider>): Promise<TransactionRequest> {
  const data = neonTransactionData(solanaWallet);
  const transaction = neonNeonTransaction<TransactionRequest>(from, to, amount, data);
  const feeData = await provider.getFeeData();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasPrice = feeData.gasPrice;
  transaction.gasLimit = gasEstimate > gasLimit? gasEstimate + BigInt(1e4) : gasLimit;
  return transaction;
}
