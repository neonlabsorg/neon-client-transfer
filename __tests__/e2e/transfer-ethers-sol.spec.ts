import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  createAssociatedTokenAccountTransaction,
  createUnwrapSOLTransaction,
  GasToken,
  NEON_TRANSFER_CONTRACT_DEVNET,
  NeonProxyRpcApi,
  neonWrapper2Abi,
  signerPrivateKey, SOL_TRANSFER_CONTRACT_DEVNET,
  solanaNEONTransferTransaction,
  SPLToken,
  wrappedNeonTransaction
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionEthers,
  createWrapAndTransferSOLTransaction,
  neonNeonTransactionEthers,
  wrappedNeonTransactionData
} from '@neonevm/token-transfer-ethers';
import { TransactionRequest, Wallet } from 'ethers';

import {
  createAssociatedTokenAccount,
  delay,
  estimateGas,
  FaucetDropper,
  getEthersProvider,
  getGasToken,
  getMultiTokenProxy,
  getTokenBalance,
  mintTokenBalanceEthers,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalanceEthers,
  neonSignature,
  PHANTOM_PRIVATE,
  sendNeonTransactionEthers,
  sendSolanaTransaction, SOL_TOKEN_MODEL,
  solanaSignature,
  splTokenBalance,
  toSigner,
  walletSigner
} from '../tools';

import { itNeonTokenMint, itSolanaTokenSPL } from './erc20';

require('dotenv').config({ path: `./__tests__/env/.env` });
jest.setTimeout(12e4);

const skipPreflight = true;
const CHAIN_ID = Number(process.env.CHAIN_ID);
const CHAIN_ID_SOL = Number(process.env.CHAIN_ID_SOL);
const SOLANA_URL = process.env.SOLANA_URL;
const NEON_PROXY_URL = `${process.env.NEON_URL}/sol`;
const faucet = new FaucetDropper(CHAIN_ID);

let solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
let signer: Signer = toSigner(solanaWallet);
let gasToken: GasToken;
let neonEvmProgram: PublicKey;
let neonTokenMint: PublicKey;
let neonProxyRpcApi: NeonProxyRpcApi;

let provider: any;
let neonWallet: Wallet;
let connection: Connection;

beforeAll(async () => {
  const result = await getMultiTokenProxy(NEON_PROXY_URL!);
  const token = getGasToken(result.tokensList, CHAIN_ID);
  connection = new Connection(SOLANA_URL!, 'confirmed');
  provider = getEthersProvider(NEON_PROXY_URL!);
  neonProxyRpcApi = result.proxyRpc;
  neonEvmProgram = result.evmProgramAddress;
  neonTokenMint = token.tokenMintAddress;
  solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
  neonWallet = new Wallet(NEON_PRIVATE, provider);
  gasToken = token.gasToken;
});

afterEach(async () => {
  await delay(5e3);
});

describe('SOL native token transfer tests', () => {
  it(`Should transfer 0.1 SOL from Neon to Solana`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    console.log(faucet.tokens[id]);
    const solToken: SPLToken = { ...faucet.tokens[id], ...SOL_TOKEN_MODEL, chainId: CHAIN_ID_SOL };
    try {
      const balanceBefore = await neonBalanceEthers(provider, neonWallet);
      const transaction = await neonNeonTransactionEthers({ provider, from: neonWallet.address, to: SOL_TRANSFER_CONTRACT_DEVNET, solanaWallet: solanaWallet.publicKey, amount });
      transaction.nonce = await neonWallet.getNonce();
      const hash = await sendNeonTransactionEthers(transaction, neonWallet);
      neonSignature(`Signature`, hash);
      expect(hash.length).toBeGreaterThan(2);
      await delay(20e3);
      const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, solToken);
      const balanceAfter = await neonBalanceEthers(provider, neonWallet);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${solToken.symbol} ==> ${balanceSPL?.uiAmount} ${solToken.symbol} in Solana`);
      expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });
});
