import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createClaimInstruction,
  createMintNeonTransaction,
  EthersSignedTransaction,
  NEON_HEAP_FRAME,
  MintNeonTransactionParams,
  MintTransferParams,
  NeonMintTxParams,
  neonTransferMintTransaction,
  toFullAmount
} from '@neonevm/token-transfer-core';
import {
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { JsonRpcProvider, TransactionRequest, Wallet } from 'ethers';
import {
  claimTransactionData,
  mintNeonTransactionData,
  useTransactionFromSignerEthers
} from './utils';

/**
 * Creates and executes a Neon Transfer Mint Transaction using ethers.js.
 *
 * This function is intended for the transfer of SPL tokens to Neon EVM by generating a transaction
 * signed using ethers.js, using the wallet signer.
 *
 * @template W - The wallet signer, generally an instance of the `Wallet` class from ethers.js.
 *
 * @param {MintTransferParams<W>} params - The parameters required to create and execute the mint transaction.
 * @param {Connection} params.connection - The Solana connection object used to interact with the blockchain.
 * @param {ProxyApi} params.proxyApi - The proxy API used for interacting with the blockchain.
 * @param {PublicKey} params.neonEvmProgram - The public key of the Neon EVM program on Solana.
 * @param {PublicKey} params.solanaWallet - The public key of the user's Solana wallet, used as the fee payer.
 * @param {string} params.neonWallet - The address of the Neon wallet.
 * @param {W} params.walletSigner - The wallet signer from ethers.js, used for signing the transaction.
 * @param {SPLToken} params.splToken - The SPL token object representing the token being transferred.
 * @param {Amount} params.amount - The amount of tokens to be transferred.
 * @param {number} params.chainId - Neon EVM chain ID for which the transaction is being created.
 * @param {number} [params.neonHeapFrame=NEON_HEAP_FRAME] - The heap frame value for computing the budget program.
 *
 * @returns {Promise<any>} - A Promise that resolves to the result of the Neon mint transaction.
 *
 * @example
 * ```typescript
 * const connection = new Connection("https://api.devnet.solana.com");
 * const proxyApi = new ProxyApi("https://devnet.neonevm.org");
 * const neonEvmProgram = new PublicKey("neon_evm_program_public_key");
 * const solanaWallet = new PublicKey("your_solana_wallet_public_key");
 * const neonWallet = "neon_wallet_address";
 * const walletSigner = new Wallet(keccak256(Buffer.from(`${neonWallet.slice(2)}${solanaWallet.toBase58()}`, 'utf-8')), new JsonRpcProvider("https://devnet.neonevm.org"));
 * const splToken: SPLToken = {
 *   address: "token_address",
 *   address_spl: "address_spl_value",
 *   chainId: 245022926,
 *   decimals: 9,
 *   logoURI: "logo_url",
 *   name: "USDT Token",
 *   symbol: "USDT",
 * };
 *
 * const transactionResult = await neonTransferMintTransactionEthers({
 *   connection,
 *   proxyApi,
 *   neonEvmProgram,
 *   solanaWallet,
 *   neonWallet,
 *   walletSigner,
 *   splToken,
 *   amount: 1,
 *   chainId: 245022926
 * });
 * console.log("Transaction executed successfully:", transactionResult);
 * ```
 */
export async function neonTransferMintTransactionEthers(params: MintTransferParams<Wallet>): Promise<any> {
  const { connection, proxyApi, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId, neonHeapFrame = NEON_HEAP_FRAME } = params;
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(new PublicKey(splToken.address_spl), solanaWallet);
  const climeData = claimTransactionData(associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await useTransactionFromSignerEthers(climeData, walletSigner, splToken.address);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<EthersSignedTransaction>({
    proxyApi,
    neonTransaction: signedTransaction,
    connection,
    neonEvmProgram,
    splToken,
    associatedTokenAddress,
    signerAddress: walletSigner.address,
    fullAmount
  });
  const neonTxParams: NeonMintTxParams<typeof walletSigner, typeof signedTransaction> = {
    connection,
    neonEvmProgram,
    solanaWallet,
    neonWallet,
    emulateSigner: walletSigner,
    neonKeys,
    legacyAccounts,
    neonTransaction: signedTransaction,
    splToken,
    amount: fullAmount,
    chainId,
    neonHeapFrame
  };

  return neonTransferMintTransaction(neonTxParams);
}

/**
 * Creates a transaction request for transfer ERC20 tokens from Neon EVM to Solana.
 * This function is used for all ERC20 token transactions, including wSOL.
 * It estimates the gas limit and fee required for the transaction,
 * then returns the configured transaction request.
 *
 * @param {MintNeonTransactionParams<JsonRpcProvider>} params - The parameters for creating a mint NEON transaction.
 * @param {JsonRpcProvider} params.provider - The ethers.js provider to interact with the blockchain.
 *                                            Example: `new ethers.providers.JsonRpcProvider("<RPC_ENDPOINT>")`
 * @param {string} params.neonWallet - The address of the Neon wallet initiating the transaction.
 * @param {string} params.associatedToken - The associated token address to receive the minted tokens.
 * @param {SPLToken} params.splToken - The SPL token information representing the token being received.
 * @param {Amount} params.amount - The amount of tokens to be minted.
 * @param {bigint} [params.gasLimit=BigInt(5e4)] - The optional gas limit for the transaction.
 *
 * @returns {Promise<TransactionRequest>} - The configured transaction request for tokens transfer.
 *
 * @example
 * const provider = new JsonRpcProvider("<RPC_ENDPOINT>");
 * const transactionRequest = await createMintNeonTransactionEthers({
 *   provider,
 *   neonWallet: "0xNeonWalletAddress",
 *   associatedToken: "AssociatedTokenAddressOnSolana",
 *   splToken: {
 *     address: "erc20_token_address",
 *     address_spl: "spl_token_address",
 *     chainId: 245022926,
 *     decimals: 9,
 *     logoURI: "https://example.com/logo.png",
 *     name: "USDT Token",
 *     symbol: "USDT"
 *   },
 *   amount: 1
 * });
 */
export async function createMintNeonTransactionEthers({
  provider,
  neonWallet,
  associatedToken,
  splToken,
  amount,
  gasLimit = BigInt(5e4)
}: MintNeonTransactionParams<JsonRpcProvider>): Promise<TransactionRequest> {
  const data = mintNeonTransactionData(associatedToken, splToken, amount);
  const transaction = createMintNeonTransaction<TransactionRequest>(neonWallet, splToken, data);
  const feeData = await provider.getFeeData();
  const gasEstimate = await provider.estimateGas(transaction);
  transaction.gasPrice = feeData.gasPrice;
  transaction.gasLimit = gasEstimate > gasLimit ? gasEstimate + BigInt(1e4) : gasLimit;
  return transaction;
}

export async function createWrapAndTransferSOLTransaction(params: MintTransferParams<Wallet>): Promise<Transaction> {
  const { connection, proxyApi, neonEvmProgram, solanaWallet, neonWallet, walletSigner, splToken, amount, chainId, neonHeapFrame = NEON_HEAP_FRAME } = params;
  const instructions: TransactionInstruction[] = [];
  const transaction: Transaction = new Transaction({ feePayer: solanaWallet });
  const tokenMint = new PublicKey(splToken.address_spl);
  const fullAmount = toFullAmount(amount, splToken.decimals);
  const associatedTokenAddress = getAssociatedTokenAddressSync(tokenMint, solanaWallet);
  const wSOLAccount = await connection.getAccountInfo(associatedTokenAddress);
  const climeData = claimTransactionData(associatedTokenAddress, neonWallet, fullAmount);
  const signedTransaction = await useTransactionFromSignerEthers(climeData, walletSigner, splToken.address);
  const {
    neonKeys,
    legacyAccounts
  } = await createClaimInstruction<EthersSignedTransaction>({
    proxyApi,
    neonTransaction: signedTransaction,
    connection,
    neonEvmProgram,
    splToken,
    associatedTokenAddress,
    signerAddress: walletSigner.address,
    fullAmount
  });

  const neonTxParams: NeonMintTxParams<typeof walletSigner, typeof signedTransaction> = {
    connection,
    neonEvmProgram,
    solanaWallet,
    neonWallet,
    emulateSigner: walletSigner,
    neonKeys,
    legacyAccounts,
    neonTransaction: signedTransaction,
    splToken,
    amount: fullAmount,
    chainId,
    neonHeapFrame
  };

  const mintTransaction = await neonTransferMintTransaction(neonTxParams);

  if (!wSOLAccount) {
    instructions.push(createAssociatedTokenAccountInstruction({ tokenMint, associatedAccount: associatedTokenAddress, owner: solanaWallet, payer: solanaWallet }));
  }

  instructions.push(SystemProgram.transfer({
    fromPubkey: solanaWallet,
    toPubkey: associatedTokenAddress,
    lamports: fullAmount
  }));
  instructions.push(createSyncNativeInstruction(associatedTokenAddress, TOKEN_PROGRAM_ID));
  transaction.add(...instructions);
  transaction.add(...mintTransaction.instructions);

  return transaction;
}
