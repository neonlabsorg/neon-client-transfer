import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { NeonProxyRpcApi } from '../../api';
import {
  createMintSolanaTransaction,
  createUnwrapSOLTransaction,
  wrappedNeonTransaction,
  signerPrivateKey
} from '../../core';

import {
  neonNeonTransactionWeb3,
  createWrapAndTransferSOLTransaction,
  createMintNeonTransactionEthers,
} from '../../ethers';
import { wrappedNeonTransactionData } from '../../ethers/utils';
import { GasToken, NeonProgramStatus, SPLToken } from '../../models';
import {
  NEON_TRANSFER_CONTRACT_DEVNET,
  neonWrapper2Abi,
  TOKEN_LIST_DEVNET_SNAPSHOT
} from '../../data';
import {
  delay,
  estimateGas,
  FaucetDropper,
  getGasToken,
  getMultiTokenProxy,
  getEthersProvider,
  mintTokenBalance,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalance,
  neonSignature,
  PHANTOM_PRIVATE,
  sendNeonTransactionEthers,
  sendSolanaTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner,
  getTokenBalance,
  walletSigner
} from '../tools';

import { itSolanaTokenSPL, itNeonTokenMint } from "./erc20";
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import { TransactionRequest } from "@ethersproject/providers";

require('dotenv').config({ path: `./src/__tests__/env/.env` });
jest.setTimeout(12e4);

const skipPreflight = true;
const CHAIN_ID = Number(process.env.CHAIN_ID);
const SOLANA_URL = process.env.SOLANA_URL;
const NEON_PROXY_URL = process.env.NEON_URL;
const faucet = new FaucetDropper(CHAIN_ID);

let tokensList: GasToken[] = [];
let solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
let signer: Signer = toSigner(solanaWallet);
let gasToken: GasToken;
let neonProxyStatus: NeonProgramStatus;
let neonEvmProgram: PublicKey;
let neonTokenMint: PublicKey;
let neonProxyRpcApi: NeonProxyRpcApi;

let provider: JsonRpcProvider;
let neonWallet: Wallet;
let connection: Connection;

beforeAll(async () => {
  const result = await getMultiTokenProxy(NEON_PROXY_URL!, SOLANA_URL!);
  const token = getGasToken(result.tokensList, CHAIN_ID);
  connection = new Connection(SOLANA_URL!, 'confirmed');
  provider = getEthersProvider(NEON_PROXY_URL!);
  neonProxyRpcApi = result.proxyRpc;
  neonProxyStatus = result.proxyStatus;
  neonEvmProgram = result.evmProgramAddress;
  neonTokenMint = token.tokenMintAddress;
  solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
  neonWallet = new Wallet(NEON_PRIVATE, provider);
  tokensList = (await neonProxyRpcApi.nativeTokenList()) || TOKEN_LIST_DEVNET_SNAPSHOT;
  gasToken = tokensList.find(i => parseInt(i.token_chain_id, 16) === CHAIN_ID)!;

});

afterEach(async () => {
  await delay(5e3);
});

describe('NEON token transfer tests', () => {

  it.skip(`Should transfer 0.1 NEON from Neon to Solana`, async () => {
    const amount = 0.1;
    const neonToken: SPLToken = {
      ...NEON_TOKEN_MODEL,
      address_spl: gasToken.token_mint,
      chainId: CHAIN_ID
    };
    try {
      const balanceBefore = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
      const transaction = await neonNeonTransactionWeb3(provider, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
      const hash = await sendNeonTransactionEthers(transaction, neonWallet);
      neonSignature(`Signature`, hash);
      expect(hash.length).toBeGreaterThan(2);
      await delay(5e3);
      const balanceAfter = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
      const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} NEON ==> ${balanceSPL?.uiAmount} ${neonToken.symbol} in Solana`);
      expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it.skip('Should wrap 1 NEON to wNEON in Neon network', async () => {
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
      const wneon: SPLToken = faucet.tokens[id];
      const neonBalanceBefore = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
      const wneonBalanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi);
      try {
        const wrapTransaction = await neonNeonTransactionWeb3(provider, neonWallet.address, wneon.address, solanaWallet.publicKey, amount);
        const wrapHash = await sendNeonTransactionEthers(wrapTransaction, neonWallet);
        neonSignature(`NEON wrap signature`, wrapHash);
        expect(wrapHash.length).toBeGreaterThan(2);
        await delay(5e3);

        const wneonBalanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi);
        const neonBalanceAfter = await neonBalance(NEON_PROXY_URL!, neonWallet.address);

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

  it.skip('Should withdraw 0.1 wNEON from Neon to Solana', async () => {
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = {
        ...NEON_TOKEN_MODEL,
        address_spl: gasToken.token_mint,
        chainId: CHAIN_ID
      };
      const wneon: SPLToken = faucet.tokens[id];
      const wneonBalanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi);
      try {
        const data = await wrappedNeonTransactionData(wneon, amount, neonWallet);
        const unwrapTransaction = wrappedNeonTransaction<TransactionRequest>(neonWallet.address, wneon.address, data.hash) as TransactionRequest;
        unwrapTransaction.gasPrice = await provider.getGasPrice();
        unwrapTransaction.gasLimit = await estimateGas(provider, unwrapTransaction);
        const unwrapHash = await sendNeonTransactionEthers(unwrapTransaction, neonWallet);
        neonSignature(`wNEON unwrap signature`, unwrapHash);
        expect(unwrapHash.length).toBeGreaterThan(2);
        await delay(5e3);

        const wneonBalanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi);
        console.log(`Balance: ${wneonBalanceBefore} > ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
        expect(wneonBalanceAfter).toBeLessThan(wneonBalanceBefore);

        const neonBalanceBefore = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
        const transaction = await neonNeonTransactionWeb3(provider, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
        const hash = await sendNeonTransactionEthers(transaction, neonWallet);
        neonSignature(`NEON transfer signature`, hash);
        await delay(5e3);

        const neonBalanceAfter = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neon);

        console.log(`Balance: ${neonBalanceBefore} > ${neonBalanceAfter} ${wneon.symbol} ==> ${balanceSPL.uiAmount} ${neon.symbol} in Solana`);
        expect(neonBalanceAfter.toNumber()).toBeLessThan(neonBalanceBefore.toNumber());
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it.skip(`Should wrap SOL -> wSOL and transfer 0.1 wSOL from Solana to Neon`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    const solBefore = await connection.getBalance(solanaWallet.publicKey);
    console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} SOL`);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const associatedToken = getAssociatedTokenAddressSync(new PublicKey(wSOL.address_spl), solanaWallet.publicKey);
      const wSolBefore = await connection.getBalance(associatedToken);
      const balanceBefore = await getTokenBalance(provider, neonWallet.address, wSOL);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const solanaWalletSigner = walletSigner(<JsonRpcProvider>provider, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
        const transaction = await createWrapAndTransferSOLTransaction(connection, neonProxyRpcApi, neonProxyStatus, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, solanaWalletSigner, wSOL, amount, CHAIN_ID);
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL transfer signature`, signature, SOLANA_URL!);
        await delay(5e3);

        const wSolAfterTransfer = await connection.getBalance(associatedToken);
        const balanceAfter = await getTokenBalance(provider, neonWallet.address, wSOL);
        console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} < ${wSolAfterTransfer / LAMPORTS_PER_SOL} ${wSOL.symbol} ==> ${balanceBefore} < ${balanceAfter} ${wSOL.symbol} in Neon`);
        expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it.skip(`Should transfer 0.1 wSOL from Neon to Solana and unwrap wSOL -> SOL`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WSOL');
    const signer: Signer = toSigner(solanaWallet);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const mintPubkey = new PublicKey(wSOL.address_spl);
      const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);

      const balanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wSOL);
      console.log(`Balance: ${balanceBefore ?? 0} ${wSOL.symbol}`);
      const solanaTransaction = createMintSolanaTransaction(solanaWallet.publicKey, mintPubkey, associatedToken, neonProxyStatus);
      solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const neonTransaction = await createMintNeonTransactionEthers(provider, neonWallet.address, associatedToken, wSOL, amount);
      const wSolBefore = await connection.getBalance(associatedToken);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight: false });
        solanaSignature(`Solana Signature`, signedSolanaTransaction, SOLANA_URL!);
        expect(signedSolanaTransaction.length).toBeGreaterThan(0);
        await delay(1e3);
        const signedNeonTransaction = await sendNeonTransactionEthers(neonTransaction, neonWallet);
        neonSignature(`Neon Signature`, signedNeonTransaction);
        expect(signedNeonTransaction.length).toBeGreaterThan(0);
        await delay(15e3);
        const balanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wSOL);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, wSOL);
        console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} ==> ${balanceSPL?.uiAmount} ${wSOL.symbol} in Solana`);
        expect(balanceAfter).toBeLessThan(balanceBefore);

        const unwrapTransaction = await createUnwrapSOLTransaction(connection, solanaWallet.publicKey, wSOL);
        unwrapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight: false });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL unwrap signature`, signature, SOLANA_URL!);
        await delay(5e3);

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
      itSolanaTokenSPL(provider, connection, NEON_PROXY_URL!, neonProxyRpcApi, neonProxyStatus, token, neonEvmProgram, solanaWallet, neonWallet, CHAIN_ID, SOLANA_URL!).then(() => _());
    });

    it.skip(`Should transfer 0.1 ${token.symbol} from NeonEVM (NEON) to Solana`, _ => {
      itNeonTokenMint(connection, provider, NEON_PROXY_URL!, faucet, neonProxyStatus, token, solanaWallet, neonWallet, SOLANA_URL!).then(() => _());
    });
  });
});
