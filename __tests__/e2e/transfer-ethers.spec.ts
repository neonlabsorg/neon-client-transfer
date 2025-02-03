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
  signerPrivateKey,
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
  sendSolanaTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner,
  walletSigner
} from '../tools';

import { itNeonTokenMint, itSolanaTokenSPL } from './erc20';

require('dotenv').config({ path: `./__tests__/env/.env` });
jest.setTimeout(24e4);

const skipPreflight = true;
const CHAIN_ID = Number(process.env.CHAIN_ID);
const SOLANA_URL = process.env.SOLANA_URL;
const NEON_PROXY_URL = process.env.NEON_URL;
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

describe('NEON token transfer tests', () => {

  it(`Should transfer 0.1 NEON from Solana to Neon`, async () => {
    const amount = 0.1;
    const neonToken: SPLToken = {
      ...NEON_TOKEN_MODEL,
      address_spl: gasToken.tokenMint,
      chainId: CHAIN_ID
    };
    await createAssociatedTokenAccount(connection, signer, neonToken);
    const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
    console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${neonToken.symbol}`);
    try {
      const transaction = await solanaNEONTransferTransaction({
        solanaWallet: solanaWallet.publicKey,
        neonWallet: neonWallet.address,
        neonEvmProgram,
        neonTokenMint,
        token: neonToken,
        amount,
        chainId: CHAIN_ID
      });
      transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature, SOLANA_URL!);
      await delay(10e3);
      const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
      const balanceNeon = await neonBalanceEthers(provider, neonWallet);
      console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${neonToken.symbol} ==> ${balanceNeon} ${neonToken.symbol} in Neon`);
      expect(balanceAfter?.uiAmount).toBeLessThan(balanceBefore?.uiAmount!);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it(`Should transfer 0.1 NEON from Neon to Solana`, async () => {
    const amount = 0.1;
    const neonToken: SPLToken = {
      ...NEON_TOKEN_MODEL,
      address_spl: gasToken.tokenMint,
      chainId: CHAIN_ID
    };
    try {
      const balanceBefore = await neonBalanceEthers(provider, neonWallet);
      const transaction = await neonNeonTransactionEthers({ provider, from: neonWallet.address, to: NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet: solanaWallet.publicKey, amount });
      transaction.nonce = await neonWallet.getNonce();
      const hash = await sendNeonTransactionEthers(transaction, neonWallet);
      neonSignature(`Signature`, hash);
      expect(hash.length).toBeGreaterThan(2);
      await delay(20e3);
      const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
      const balanceAfter = await neonBalanceEthers(provider, neonWallet);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} NEON ==> ${balanceSPL?.uiAmount} ${neonToken.symbol} in Solana`);
      expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it('Should wrap 1 NEON to wNEON in Neon network', async () => {
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
      const wneon: SPLToken = faucet.tokens[id];
      const neonBalanceBefore = await neonBalanceEthers(provider, neonWallet);
      const wneonBalanceBefore = await mintTokenBalanceEthers(neonWallet, wneon, neonWrapper2Abi);
      try {
        const wrapTransaction = await neonNeonTransactionEthers({ provider, from: neonWallet.address, to: wneon.address, solanaWallet: solanaWallet.publicKey, amount });
        wrapTransaction.nonce = await neonWallet.getNonce();
        const wrapHash = await sendNeonTransactionEthers(wrapTransaction, neonWallet);
        neonSignature(`NEON wrap signature`, wrapHash);
        expect(wrapHash.length).toBeGreaterThan(2);
        await delay(10e3);

        const wneonBalanceAfter = await mintTokenBalanceEthers(neonWallet, wneon, neonWrapper2Abi);
        const neonBalanceAfter = await neonBalanceEthers(provider, neonWallet);

        console.log(`Balance: ${wneonBalanceBefore} => ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
        console.log(`Balance: ${neonBalanceBefore} => ${neonBalanceAfter} ${neon.symbol} in Neon`);
        expect(wneonBalanceAfter).toBeGreaterThanOrEqual(wneonBalanceBefore);
        expect(neonBalanceAfter.toNumber()).toBeLessThanOrEqual(neonBalanceBefore.toNumber());
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it('Should withdraw 0.1 wNEON from Neon to Solana', async () => {
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = {
        ...NEON_TOKEN_MODEL,
        address_spl: gasToken.tokenMint,
        chainId: CHAIN_ID
      };
      const wneon: SPLToken = faucet.tokens[id];
      const wneonBalanceBefore = await mintTokenBalanceEthers(neonWallet, wneon, neonWrapper2Abi);
      try {
        const data = wrappedNeonTransactionData(wneon, amount);
        const unwrapTransaction = wrappedNeonTransaction<TransactionRequest>(neonWallet.address, wneon.address, data);
        const feeData = await provider.getFeeData();
        unwrapTransaction.gasPrice = feeData.gasPrice;
        unwrapTransaction.gasLimit = await estimateGas(provider, unwrapTransaction);
        unwrapTransaction.nonce = await neonWallet.getNonce();
        const unwrapHash = await sendNeonTransactionEthers(unwrapTransaction, neonWallet);
        neonSignature(`wNEON unwrap signature`, unwrapHash);
        expect(unwrapHash.length).toBeGreaterThan(2);
        await delay(20e3);

        const wneonBalanceAfter = await mintTokenBalanceEthers(neonWallet, wneon, neonWrapper2Abi);
        console.log(`Balance: ${wneonBalanceBefore} > ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
        expect(wneonBalanceAfter).toBeLessThan(wneonBalanceBefore);

        const neonBalanceBefore = await neonBalanceEthers(provider, neonWallet);
        const transaction = await neonNeonTransactionEthers({ provider, from: neonWallet.address, to: NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet: solanaWallet.publicKey, amount });
        transaction.nonce = await neonWallet.getNonce();
        const hash = await sendNeonTransactionEthers(transaction, neonWallet);
        neonSignature(`NEON transfer signature`, hash);
        await delay(20e3);

        const neonBalanceAfter = await neonBalanceEthers(provider, neonWallet);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neon);

        console.log(`Balance: ${neonBalanceBefore} > ${neonBalanceAfter} ${wneon.symbol} ==> ${balanceSPL?.uiAmount} ${neon.symbol} in Solana`);
        expect(neonBalanceAfter.toNumber()).toBeLessThan(neonBalanceBefore.toNumber());
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it(`Should wrap SOL -> wSOL and transfer 0.1 wSOL from Solana to Neon`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    const solBefore = await connection.getBalance(solanaWallet.publicKey);
    console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} SOL`);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const associatedToken = getAssociatedTokenAddressSync(new PublicKey(wSOL.address_spl), solanaWallet.publicKey);
      const wSolBefore = await connection.getBalance(associatedToken);
      const balanceBefore = await getTokenBalance(provider, neonWallet, wSOL);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const solanaWalletSigner: any = walletSigner(provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
        const transaction = await createWrapAndTransferSOLTransaction({ connection, proxyApi: neonProxyRpcApi, neonEvmProgram, solanaWallet: solanaWallet.publicKey, neonWallet: neonWallet.address, walletSigner: solanaWalletSigner, splToken: wSOL, amount, chainId: CHAIN_ID });
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL transfer signature`, signature, SOLANA_URL!);
        await delay(5e3);

        const wSolAfterTransfer = await connection.getBalance(associatedToken);
        const balanceAfter = await getTokenBalance(provider, neonWallet, wSOL);
        console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} < ${wSolAfterTransfer / LAMPORTS_PER_SOL} ${wSOL.symbol} ==> ${balanceBefore} < ${balanceAfter} ${wSOL.symbol} in Neon`);
        expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it(`Should transfer 0.1 wSOL from Neon to Solana and unwrap wSOL -> SOL`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WSOL');
    const signer: Signer = toSigner(solanaWallet);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const mintPubkey = new PublicKey(wSOL.address_spl);
      const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);

      const balanceBefore = await mintTokenBalanceEthers(neonWallet, wSOL);
      console.log(`Balance: ${balanceBefore ?? 0} ${wSOL.symbol}`);
      const solanaTransaction = createAssociatedTokenAccountTransaction({ solanaWallet: solanaWallet.publicKey, tokenMint: mintPubkey, associatedToken: associatedToken });
      solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const neonTransaction = await createMintNeonTransactionEthers({ provider, neonWallet: neonWallet.address, associatedToken: associatedToken, splToken: wSOL, amount });
      neonTransaction.nonce = await neonWallet.getNonce();
      const wSolBefore = await connection.getBalance(associatedToken);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight });
        solanaSignature(`Solana Signature`, signedSolanaTransaction, SOLANA_URL!);
        expect(signedSolanaTransaction.length).toBeGreaterThan(0);
        await delay(1e3);
        const signedNeonTransaction = await sendNeonTransactionEthers(neonTransaction, neonWallet);
        neonSignature(`Neon Signature`, signedNeonTransaction);
        expect(signedNeonTransaction.length).toBeGreaterThan(0);
        await delay(20e3);
        const balanceAfter = await mintTokenBalanceEthers(neonWallet, wSOL);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, wSOL);
        console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} ==> ${balanceSPL?.uiAmount} ${wSOL.symbol} in Solana`);
        expect(balanceAfter).toBeLessThan(balanceBefore);

        const unwrapTransaction = await createUnwrapSOLTransaction(connection, solanaWallet.publicKey, wSOL);
        unwrapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL unwrap signature`, signature, SOLANA_URL!);
        await delay(20e3);

        const wSolAfter = await connection.getBalance(associatedToken);
        console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} > ${wSolAfter / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
        expect(wSolBefore).toBeGreaterThan(wSolAfter);
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  faucet.supportedTokens.forEach(token => {
    it(`Should transfer 0.1 ${token.symbol} from Solana to NeonEVM (NEON)`, _ => {
      itSolanaTokenSPL(provider, connection, NEON_PROXY_URL!, neonProxyRpcApi, token, neonEvmProgram, solanaWallet, neonWallet, CHAIN_ID, SOLANA_URL!).then(() => _());
    });

    it(`Should transfer 0.1 ${token.symbol} from NeonEVM (NEON) to Solana`, _ => {
      itNeonTokenMint(connection, provider, NEON_PROXY_URL!, faucet, token, solanaWallet, neonWallet).then(() => _());
    });
  });
});
