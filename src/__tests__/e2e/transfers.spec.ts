import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import Web3 from 'web3';
import { Account } from 'web3-core';
import { AbiItem } from 'web3-utils';
import { NeonProxyRpcApi } from '../../api';
import {
  createMintNeonWeb3Transaction,
  createMintSolanaTransaction,
  createUnwrapSOLTransaction,
  createWrapSOLTransaction,
  neonNeonWeb3Transaction,
  neonTransferMintWeb3Transaction,
  solanaNEONTransferTransaction,
  wrappedNeonTransaction,
  wrappedNeonTransactionData
} from '../../core';
import { GasToken, NeonProgramStatus, SettingsFormState, SPLToken } from '../../models';
import {
  createSplAccount,
  delay,
  FaucetDropper,
  mintTokenBalance,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalance,
  neonSignature,
  PHANTOM_PRIVATE,
  sendNeonTransaction,
  sendSolanaTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner
} from '../tools';
import { NEON_TRANSFER_CONTRACT_DEVNET, neonWrapper2Abi } from '../../data';

require('dotenv').config({ path: `./src/__tests__/env/.env` });

const W3 = require('web3');
const CHAIN_ID = Number(process.env.CHAIN_ID ?? '111'); // NEON_CHAIN_IDS.find(i => i.name === CHAIN_NAME)!.id;
const SOLANA_URL = process.env.SOLANA_URL; // clusterApiUrl(CHAIN_NAME);
const NEON_URL = process.env.NEON_URL;
const NEON_PROVIDER = new W3.providers.HttpProvider(NEON_URL);
const faucet = new FaucetDropper(CHAIN_ID);
const urls: SettingsFormState = { solanaRpcApi: SOLANA_URL!, neonProxyRpcApi: NEON_URL! };
const proxyApi = new NeonProxyRpcApi(urls);

jest.setTimeout(12e4);

let tokensList: GasToken[] = [];
let gasToken: GasToken;
let connection: Connection;
let web3: Web3;
let solanaWallet: Keypair;
let neonWallet: Account;
let proxyStatus: NeonProgramStatus;
let neonEvmProgram: PublicKey;
let neonTokenMint: PublicKey;
let signer: Signer;

beforeAll(async () => {
  try {
    connection = new Connection(SOLANA_URL!, 'confirmed');
    web3 = new W3(NEON_PROVIDER);
    solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
    neonWallet = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE);

    proxyStatus = await proxyApi.evmParams();
    tokensList = await proxyApi.gasTokenList();
    gasToken = tokensList.find(i => parseInt(i.token_chain_id, 16) === CHAIN_ID)!;
    neonEvmProgram = new PublicKey(proxyStatus.NEON_EVM_ID);
    neonTokenMint = new PublicKey(gasToken.token_mint);
    signer = toSigner(solanaWallet);

    await delay(1e3);
  } catch (e) {
    console.log(e);
  }
});

beforeAll(async () => {
  try {
    const token = await neonBalance(web3, neonWallet.address);
    if (token.gte(0.1)) {
      console.log(`${neonWallet.address}: ${token.toNumber()} NEON`);
    } else {
      await faucet.requestNeon(neonWallet.address, 2);
      await delay(1e4);
      const token = await neonBalance(web3, neonWallet.address);
      console.log(`${neonWallet.address}: ${token.toNumber()} NEON`);
    }
  } catch (e) {
    console.log(e);
  }
});

beforeAll(async () => {
  try {
    const balance = await connection.getBalance(solanaWallet.publicKey);
    if (balance) {
      console.log(`${solanaWallet.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
    } else {
      await connection.requestAirdrop(solanaWallet.publicKey, 2 * LAMPORTS_PER_SOL);
      await delay(1e4);
      const balance = await connection.getBalance(solanaWallet.publicKey);
      console.log(`${solanaWallet.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
    }
  } catch (e) {
    console.log(e);
  }
});

afterEach(async () => {
  await delay(5e3);
});

describe('Neon transfer tests', () => {

  it.skip(`Solana Keypair has tokens`, async () => {
    try {
      const balance = await connection.getBalance(solanaWallet.publicKey);
      expect(balance).toBeGreaterThan(1e9);
    } catch (e) {
      console.error(e);
    }
  });

  it.skip(`Neon Account has tokens`, async () => {
    try {
      const token = await neonBalance(web3, neonWallet.address);
      expect(token.toNumber()).toBeGreaterThan(0.1);
    } catch (e) {
      console.error(e);
    }
  });

  it.skip(`Should transfer 0.1 NEON from Solana to Neon`, async () => {
    const amount = 0.1;
    const neonToken: SPLToken = {
      ...NEON_TOKEN_MODEL,
      address_spl: gasToken.token_mint,
      chainId: CHAIN_ID
    };
    await createSplAccount(connection, signer, neonToken);
    const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
    console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${neonToken.symbol}`);
    try {
      const transaction = await solanaNEONTransferTransaction(solanaWallet.publicKey, neonWallet.address, neonEvmProgram, neonTokenMint, neonToken, amount);
      transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight: false });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature);
      await delay(5e3);
      const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
      const balanceNeon = await neonBalance(web3, neonWallet.address);
      console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${neonToken.symbol} ==> ${balanceNeon} ${neonToken.symbol} in Neon`);
      expect(balanceAfter.uiAmount).toBeLessThan(balanceBefore.uiAmount!);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it(`Should transfer 0.1 NEON from Neon to Solana`, async () => {
    const amount = 0.1;
    const neonToken: SPLToken = {
      ...NEON_TOKEN_MODEL,
      address_spl: gasToken.token_mint,
      chainId: CHAIN_ID
    };
    try {
      // const { contractAddress } = await deployContract(web3, '/data/contract/NeonToken.sol', neonWallet);
      const balanceBefore = await neonBalance(web3, neonWallet.address);
      const transaction = await neonNeonWeb3Transaction(web3, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET /*contractAddress*/, solanaWallet.publicKey, amount);
      const hash = await sendNeonTransaction(web3, transaction, neonWallet);
      neonSignature(`Signature`, hash);
      expect(hash.length).toBeGreaterThan(2);
      await delay(5e3);
      const balanceAfter = await neonBalance(web3, neonWallet.address);
      const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} NEON ==> ${balanceSPL?.uiAmount} ${neonToken.symbol} in Solana`);
      expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it.skip('Should wrap 1 NEON to wNEON in Neon network', async () => {
    const id = faucet.tokens.findIndex(i => i.symbol === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
      const wneon: SPLToken = faucet.tokens[id];
      const neonBalanceBefore = await neonBalance(web3, neonWallet.address);
      const wneonBalanceBefore = await mintTokenBalance(web3, neonWallet.address, wneon, neonWrapper2Abi as AbiItem[]);
      try {
        const wrapTransaction = await neonNeonWeb3Transaction(web3, neonWallet.address, wneon.address, solanaWallet.publicKey, amount);
        const wrapHash = await sendNeonTransaction(web3, wrapTransaction, neonWallet);
        neonSignature(`NEON wrap signature`, wrapHash);
        expect(wrapHash.length).toBeGreaterThan(2);
        await delay(5e3);

        const wneonBalanceAfter = await mintTokenBalance(web3, neonWallet.address, wneon, neonWrapper2Abi as AbiItem[]);
        const neonBalanceAfter = await neonBalance(web3, neonWallet.address);

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
    const id = faucet.tokens.findIndex(i => i.symbol === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
      const wneon: SPLToken = faucet.tokens[id];
      const wneonBalanceBefore = await mintTokenBalance(web3, neonWallet.address, wneon, neonWrapper2Abi as AbiItem[]);
      try {
        const data = wrappedNeonTransactionData(web3, wneon, amount);
        const unwrapTransaction = wrappedNeonTransaction(neonWallet.address, wneon.address, data);
        unwrapTransaction.gasPrice = await web3.eth.getGasPrice();
        unwrapTransaction.gas = await web3.eth.estimateGas(unwrapTransaction);
        const unwrapHash = await sendNeonTransaction(web3, unwrapTransaction, neonWallet);
        neonSignature(`wNEON unwrap signature`, unwrapHash);
        expect(unwrapHash.length).toBeGreaterThan(2);
        await delay(5e3);

        const wneonBalanceAfter = await mintTokenBalance(web3, neonWallet.address, wneon, neonWrapper2Abi as AbiItem[]);
        console.log(`Balance: ${wneonBalanceBefore} > ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
        expect(wneonBalanceAfter).toBeLessThan(wneonBalanceBefore);

        const neonBalanceBefore = await neonBalance(web3, neonWallet.address);
        const transaction = await neonNeonWeb3Transaction(web3, neonWallet.address, neon.address, solanaWallet.publicKey, amount);
        const hash = await sendNeonTransaction(web3, transaction, neonWallet);
        neonSignature(`NEON transfer signature`, hash);
        await delay(5e3);

        const neonBalanceAfter = await neonBalance(web3, neonWallet.address);
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
      const balanceBefore = 0; // await mintTokenBalance(web3, neonWallet.address, wSOL);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const wrapTransaction = await createWrapSOLTransaction(connection, solanaWallet.publicKey, amount, wSOL);
        wrapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const wrapSignature = await sendSolanaTransaction(connection, wrapTransaction, [signer], true, { skipPreflight: false });
        expect(wrapSignature.length).toBeGreaterThan(0);
        solanaSignature(`SOL wrap signature`, wrapSignature);
        const solAfter = await connection.getBalance(solanaWallet.publicKey);
        const wSolAfterWrapping = await connection.getBalance(associatedToken);
        console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} > ${solAfter / LAMPORTS_PER_SOL} SOL; ${wSolBefore / LAMPORTS_PER_SOL} > ${wSolAfterWrapping / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
        await delay(5e3);

        const transaction = await neonTransferMintWeb3Transaction(connection, web3, proxyApi, proxyStatus, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, wSOL, amount, CHAIN_ID);
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight: false });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL transfer signature`, signature);
        await delay(5e3);

        const wSolAfterTransfer = await connection.getBalance(associatedToken);
        const balanceAfter = await mintTokenBalance(web3, neonWallet.address, wSOL);
        console.log(`Balance: ${wSolAfterWrapping / LAMPORTS_PER_SOL} > ${wSolAfterTransfer / LAMPORTS_PER_SOL} ${wSOL.symbol} ==> ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} in Neon`);
        expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it.skip(`Should transfer 0.1 wSOL from Neon to Solana and unwrap wSOL -> SOL`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    const signer: Signer = toSigner(solanaWallet);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const mintPubkey = new PublicKey(wSOL.address_spl);
      const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);

      const balanceBefore = await mintTokenBalance(web3, neonWallet.address, wSOL);
      console.log(`Balance: ${balanceBefore ?? 0} ${wSOL.symbol}`);
      const solanaTransaction = createMintSolanaTransaction(solanaWallet.publicKey, mintPubkey, associatedToken, proxyStatus);
      solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const neonTransaction = await createMintNeonWeb3Transaction(web3, neonWallet.address, associatedToken, wSOL, amount);
      const wSolBefore = await connection.getBalance(associatedToken);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight: false });
        solanaSignature(`Solana Signature`, signedSolanaTransaction);
        expect(signedSolanaTransaction.length).toBeGreaterThan(0);
        await delay(1e3);
        const signedNeonTransaction = await sendNeonTransaction(web3, neonTransaction, neonWallet);
        neonSignature(`Neon Signature`, signedNeonTransaction);
        expect(signedNeonTransaction.length).toBeGreaterThan(0);
        await delay(15e3);
        const balanceAfter = await mintTokenBalance(web3, neonWallet.address, wSOL);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, wSOL);
        console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} ==> ${balanceSPL?.uiAmount} ${wSOL.symbol} in Solana`);
        expect(balanceAfter).toBeLessThan(balanceBefore);

        const unwrapTransaction = await createUnwrapSOLTransaction(connection, solanaWallet.publicKey, wSOL);
        unwrapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight: false });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL unwrap signature`, signature);
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

  // faucet.supportedTokens.forEach(token => itNeonTokenMint(token));
  // faucet.supportedTokens.forEach(token => itSolanaTokenSPL(token));
});

function itSolanaTokenSPL(token: SPLToken): void {
  it(`Should transfer 0.1 ${token.symbol} from Solana to Neon`, async () => {
    const amount = 0.1;
    const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, token);
    console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${token.symbol}`);
    try {
      const transaction = await neonTransferMintWeb3Transaction(connection, web3, proxyApi, proxyStatus, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, token, amount, CHAIN_ID);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const signer: Signer = toSigner(solanaWallet);
      const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight: false });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature);
      await delay(5e3);

      const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, token);
      const balanceMint = await mintTokenBalance(web3, neonWallet.address, token);
      console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${token.symbol} ==> ${balanceMint} ${token.symbol} in Neon`);
      expect(balanceAfter.uiAmount).toBeLessThan(balanceBefore.uiAmount!);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });
}

function itNeonTokenMint(token: SPLToken): void {
  it(`Should transfer 0.1 ${token.symbol} from Neon to Solana`, async () => {
    const amount = 0.1;
    const mintPubkey = new PublicKey(token.address_spl);
    let balanceBefore = await mintTokenBalance(web3, neonWallet.address, token);
    if (!balanceBefore) {
      await faucet.requestERC20(neonWallet.address, token, 1);
      balanceBefore = await mintTokenBalance(web3, neonWallet.address, token);
      await delay(30e6);
    }
    console.log(`Balance: ${balanceBefore ?? 0} ${token.symbol}`);
    const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);
    const solanaTransaction = createMintSolanaTransaction(solanaWallet.publicKey, mintPubkey, associatedToken, proxyStatus);
    solanaTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const neonTransaction = await createMintNeonWeb3Transaction(web3, neonWallet.address, associatedToken, token, amount);
    const signer: Signer = toSigner(solanaWallet);
    try {
      const signedSolanaTransaction = await sendSolanaTransaction(connection, solanaTransaction, [signer], true, { skipPreflight: false });
      solanaSignature(`Solana Signature`, signedSolanaTransaction);
      expect(signedSolanaTransaction.length).toBeGreaterThan(0);
      await delay(1e3);
      const signedNeonTransaction = await sendNeonTransaction(web3, neonTransaction, neonWallet);
      neonSignature(`Neon Signature`, signedNeonTransaction);
      expect(signedNeonTransaction.length).toBeGreaterThan(0);
      await delay(15e3);
      const balanceAfter = await mintTokenBalance(web3, neonWallet.address, token);
      const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, token);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${token.symbol} ==> ${balanceSPL?.uiAmount} ${token.symbol} in Solana`);
      expect(balanceAfter).toBeLessThan(balanceBefore);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });
}
