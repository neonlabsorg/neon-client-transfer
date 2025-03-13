import { PublicKey } from '@solana/web3.js';
import { Amount, EthersSignedTransaction, SPLToken } from '@neonevm/token-transfer-core';
import { parseUnits, TransactionRequest, Wallet } from 'ethers';
import { erc20ForSPLContract, neonWrapper2Contract, neonWrapperContract } from './contracts';

/**
 * Generates the transaction data for claiming tokens on the Neon EVM.
 *
 * This function encodes the function call data required to claim tokens from an SPL token
 * account to a specified Neon wallet address.
 *
 * @param {PublicKey} associatedToken - The associated SPL token account.
 * @param {string} neonWallet - The Ethereum-style Neon wallet address.
 * @param {Amount} amount - The amount to be claimed.
 * @returns {string} Encoded function call data for the claim transaction.
 *
 * @example
 * ```typescript
 * const txData = claimTransactionData(associatedTokenPK, "0x1234567890abcdef...", amount);
 * ```
 */
export function claimTransactionData(associatedToken: PublicKey, neonWallet: string, amount: Amount): string {
  const fullAmount = BigInt(amount.toString());
  return erc20ForSPLContract().encodeFunctionData('claimTo', [associatedToken.toBuffer(), neonWallet, fullAmount]);
}

/**
 * Generates encoded transaction data for withdrawing NEON tokens from Neon EVM to Solana.
 *
 * This function prepares the encoded function call data required for interacting with
 * the Neon EVM contract to withdraw NEON tokens to a specified Solana wallet. It is primarily
 * used in **Neon-to-Solana transfers**, such as in `neonNeonTransactionEthers`, to create
 * an **Ethers.js** compatible transaction request.
 *
 * @param {PublicKey} solanaWallet - The Solana wallet public key that will receive the withdrawn NEON tokens.
 * @returns {string} Encoded function call data for the withdrawal transaction.
 *
 * @example
 * ```typescript
 * const data = neonTransactionData(solanaWallet);
 * const transactionRequest = await neonNeonTransactionEthers({
 *   from: "0xSenderAddress",
 *   to: "0xRecipientContractAddress",
 *   solanaWallet,
 *   amount: "1.0",
 *   provider
 * });
 * ```
 */
export function neonTransactionData(solanaWallet: PublicKey): string {
  return neonWrapperContract().encodeFunctionData('withdraw', [solanaWallet.toBuffer()]);
}

/**
 * Generates encoded transaction data for transferring ERC-20 tokens from Neon EVM to Solana.
 *
 * This function prepares the encoded function call data required to transfer ERC-20 tokens
 * from the Neon EVM network to an associated SPL token account on Solana. It is primarily
 * used in `createMintNeonTransactionEthers` to create an **Ethers.js** compatible
 * transaction request for cross-chain token transfers.
 *
 * @param {PublicKey} associatedToken - The associated SPL token account that will receive the minted tokens.
 * @param {SPLToken} splToken - The SPL token information, including its decimals and contract details.
 * @param {Amount} amount - The amount of tokens to be transferred from Neon EVM to Solana.
 * @returns {string} Encoded function call data for the Neon-to-Solana token transfer transaction.
 *
 * @example
 * ```typescript
 * const data = mintNeonTransactionData(associatedToken, splToken, amount);
 * const transactionRequest = await createMintNeonTransactionEthers({
 *   provider,
 *   neonWallet: "0xNeonWalletAddress",
 *   associatedToken: "AssociatedTokenAddressOnSolana",
 *   splToken,
 *   amount: 1
 * });
 * ```
 */
export function mintNeonTransactionData(associatedToken: PublicKey, splToken: SPLToken, amount: Amount): string {
  const fullAmount = parseUnits(amount.toString(), splToken.decimals);
  return erc20ForSPLContract().encodeFunctionData('transferSolana', [associatedToken.toBuffer(), fullAmount]);
}

/**
 * Generates the transaction data for withdrawing wrapped Neon tokens.
 *
 * This function encodes the function call data required to withdraw wrapped Neon tokens
 * from a smart contract.
 *
 * @param {SPLToken} token - The SPL token representing the wrapped Neon asset.
 * @param {Amount} amount - The amount to withdraw.
 * @returns {string} Encoded function call data for the wrapped Neon withdrawal transaction.
 *
 * @example
 * ```typescript
 * const txData = wrappedNeonTransactionData(wrappedToken, amount);
 * ```
 */
export function wrappedNeonTransactionData(token: SPLToken, amount: Amount): string {
  return neonWrapper2Contract().encodeFunctionData('withdraw', [parseUnits(amount.toString(), token.decimals)]);
}

/**
 * Signs and prepares a transaction using an Ethers wallet signer.
 *
 * This function constructs an Ethereum transaction request and signs it using the provided wallet signer.
 *
 * @param {string} claimData - The encoded transaction data.
 * @param {Wallet} walletSigner - The Ethers.js wallet signer instance.
 * @param {string} address - The recipient contract address.
 * @returns {Promise<EthersSignedTransaction>} A promise resolving to the signed transaction data.
 *
 * @example
 * ```typescript
 * const signedTx = await useTransactionFromSignerEthers(txData, walletSigner, contractAddress);
 * ```
 */
export async function useTransactionFromSignerEthers(claimData: string, walletSigner: Wallet, address: string): Promise<EthersSignedTransaction> {
  const transaction: TransactionRequest = {
    type: 0,
    data: claimData,
    gasLimit: `0x5F5E100`, // 100000000
    gasPrice: `0x0`,
    to: address // contract address
  };
  transaction.nonce = await walletSigner.getNonce();

  const signedTransaction = await walletSigner.signTransaction(transaction);
  return { rawTransaction: signedTransaction };
}
