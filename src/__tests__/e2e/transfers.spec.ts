import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer
} from '@solana/web3.js';
import { Account } from 'web3-core';
import { AbiItem } from 'web3-utils';
import Web3 from 'web3';

import { NeonProxyRpcApi } from '../../api';
import { MintPortal, NeonPortal } from '../../core';
import { InstructionParams, SPLToken } from '../../models';
import {
  NEON_CHAIN_IDS,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  PHANTOM_PRIVATE
} from '../tools/artifacts';
import {
  delay,
  FaucetDropper,
  mintTokenBalance,
  neonBalance,
  neonSignature,
  sendSignedTransaction,
  sendTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner
} from '../tools/utils';
import neonWrapper2 from '../../data/abi/neonWrapper2';

const CHAIN_NAME = 'devnet';
const CHAIN_ID = NEON_CHAIN_IDS.find(i => i.name === CHAIN_NAME)!.id;
const W3 = require('web3');
const SOLANA_DEVNET = clusterApiUrl(CHAIN_NAME);
const NEON_DEVNET = new W3.providers.HttpProvider('https://devnet.neonevm.org');
const faucet = new FaucetDropper(CHAIN_ID);

const urls = process.env.REACT_APP_URLS ? JSON.parse(process.env.REACT_APP_URLS) : {
  solanaRpcApi: 'https://api.devnet.solana.com',
  neonProxyRpcApi: 'https://devnet.neonevm.org'
};

export const proxyApi = new NeonProxyRpcApi(urls);

jest.setTimeout(12e4);

let connection: Connection;
let web3: Web3;
let keypair: Keypair;
let account: Account;
let neonPortal: NeonPortal;
let mintPortal: MintPortal;

beforeAll(async () => {
  connection = new Connection(SOLANA_DEVNET, 'confirmed');
  web3 = new W3(NEON_DEVNET);
  keypair = Keypair.fromSecretKey(PHANTOM_PRIVATE);
  account = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE);

  const proxyStatus = await proxyApi.evmParams();
  await delay(1000);

  const options: InstructionParams = {
    connection,
    solanaWalletAddress: keypair.publicKey,
    neonWalletAddress: account.address,
    proxyApi,
    proxyStatus,
    web3
  };

  neonPortal = new NeonPortal(options);
  mintPortal = new MintPortal(options);
});

beforeAll(async () => {
  try {
    const token = await neonBalance(web3, account.address);
    if (token.gte(0.1)) {
      console.log(`${account.address}: ${token.toNumber()} NEON`);
    } else {
      await faucet.requestNeon(account.address, 2);
      await delay(1e4);
      const token = await neonBalance(web3, account.address);
      console.log(`${account.address}: ${token.toNumber()} NEON`);
    }
  } catch (e) {
    console.log(e);
  }
});

beforeAll(async () => {
  try {
    const balance = await connection.getBalance(keypair.publicKey);
    if (balance) {
      console.log(`${keypair.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
    } else {
      await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
      await delay(1e4);
      const balance = await connection.getBalance(keypair.publicKey);
      console.log(`${keypair.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
    }
  } catch (e) {
    console.log(e);
  }
});

afterEach(async () => {
  await delay(5e3);
});

describe('Transfer tests', () => {
  it(`Solana Keypair has tokens`, async () => {
    try {
      const balance = await connection.getBalance(keypair.publicKey);
      expect(balance).toBeGreaterThan(1e9);
    } catch (e) {
      console.error(e);
    }
  });

  it(`Neon Account has tokens`, async () => {
    try {
      const token = await neonBalance(web3, account.address);
      expect(token.toNumber()).toBeGreaterThan(0.1);
    } catch (e) {
      console.error(e);
    }
  });

  it(`Should transfer 0.1 NEON from Solana to Neon`, async () => {
    const amount = 0.1;
    const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
    const balanceBefore = await splTokenBalance(connection, keypair.publicKey, neon);
    console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${neon.symbol}`);
    try {
      const transaction = await neonPortal.neonTransferTransaction(amount, neon);
      const signer: Signer = toSigner(keypair);
      const signature = await sendTransaction(connection, transaction, [signer], true, { skipPreflight: false });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature);
      await delay(5e3);
      const balanceAfter = await splTokenBalance(connection, keypair.publicKey, neon);
      const balanceMint = await mintTokenBalance(web3, account.address, neon);
      console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${neon.symbol} ==> ${balanceMint} ${neon.symbol} in Neon`);
      expect(balanceAfter.uiAmount).toBeLessThan(balanceBefore.uiAmount!);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it(`Should transfer 0.1 NEON from Neon to Solana`, async () => {
    const amount = 0.1;
    const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
    const balanceBefore = await neonBalance(web3, account.address);
    try {
      const transaction = neonPortal.ethereumTransaction(amount, neon);
      transaction.gas = await web3.eth.estimateGas(transaction);
      transaction.gasPrice = await web3.eth.getGasPrice();
      transaction['gasLimit'] = 5e4;
      const hash = await sendSignedTransaction(web3, transaction, account);
      neonSignature(`Signature`, hash);
      expect(hash.length).toBeGreaterThan(2);
      await delay(5e3);
      const balanceAfter = await neonBalance(web3, account.address);
      const balanceSPL = await splTokenBalance(connection, keypair.publicKey, neon);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} NEON ==> ${balanceSPL?.uiAmount} ${neon.symbol} in Solana`);
      expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  it('Should wrap 1 NEON to wNEON in Neon network', async () => {
    const id = faucet.tokens.findIndex(i => i.symbol === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
      const wneon: SPLToken = faucet.tokens[id];
      const neonBalanceBefore = await neonBalance(web3, account.address);
      const wneonBalanceBefore = await mintTokenBalance(web3, account.address, wneon, neonWrapper2 as AbiItem[]);
      try {
        const wrapTransaction = neonPortal.neonTransaction(amount, wneon);
        wrapTransaction.gasPrice = await web3.eth.getGasPrice();
        wrapTransaction.gas = await web3.eth.estimateGas(wrapTransaction);
        const wrapHash = await sendSignedTransaction(web3, wrapTransaction, account);
        neonSignature(`NEON wrap signature`, wrapHash);
        expect(wrapHash.length).toBeGreaterThan(2);
        await delay(5e3);

        const wneonBalanceAfter = await mintTokenBalance(web3, account.address, wneon, neonWrapper2 as AbiItem[]);
        const neonBalanceAfter = await neonBalance(web3, account.address);

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
    const id = faucet.tokens.findIndex(i => i.symbol === 'WNEON');
    if (id > -1) {
      const amount = 0.1;
      const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
      const wneon: SPLToken = faucet.tokens[id];
      const wneonBalanceBefore = await mintTokenBalance(web3, account.address, wneon, neonWrapper2 as AbiItem[]);
      try {
        const unwrapTransaction = neonPortal.wNeonTransaction(amount, wneon);
        unwrapTransaction.gasPrice = await web3.eth.getGasPrice();
        unwrapTransaction.gas = await web3.eth.estimateGas(unwrapTransaction);
        const unwrapHash = await sendSignedTransaction(web3, unwrapTransaction, account);
        neonSignature(`wNEON unwrap signature`, unwrapHash);
        expect(unwrapHash.length).toBeGreaterThan(2);
        await delay(5e3);

        const wneonBalanceAfter = await mintTokenBalance(web3, account.address, wneon, neonWrapper2 as AbiItem[]);
        console.log(`Balance: ${wneonBalanceBefore} > ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
        expect(wneonBalanceAfter).toBeLessThan(wneonBalanceBefore);

        const neonBalanceBefore = await neonBalance(web3, account.address);
        const transaction = neonPortal.ethereumTransaction(amount, neon);
        transaction.gasPrice = await web3.eth.getGasPrice();
        transaction.gas = await web3.eth.estimateGas(transaction);
        const hash = await sendSignedTransaction(web3, transaction, account);
        neonSignature(`NEON transfer signature`, hash);
        await delay(5e3);

        const neonBalanceAfter = await neonBalance(web3, account.address);
        const balanceSPL = await splTokenBalance(connection, keypair.publicKey, neon);

        console.log(`Balance: ${neonBalanceBefore} > ${neonBalanceAfter} ${wneon.symbol} ==> ${balanceSPL.uiAmount} ${neon.symbol} in Solana`);
        expect(neonBalanceAfter.toNumber()).toBeLessThan(neonBalanceBefore.toNumber());
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it.skip('Should wrap and unwrap 0.1 SOL <-> wSOL', async () => {
    const amount = 0.1;
    const signer: Signer = toSigner(keypair);
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const associatedToken = await mintPortal.getAssociatedTokenAddress(new PublicKey(wSOL.address_spl), mintPortal.solanaWalletPubkey);
      const solBefore = await connection.getBalance(keypair.publicKey);
      const wSolBefore = await connection.getBalance(associatedToken);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} SOL`);

      try {
        const wrapTransaction = await mintPortal.wrapSOLTransaction(amount, wSOL);
        const wrapSignature = await sendTransaction(connection, wrapTransaction, [signer], true, { skipPreflight: false });
        expect(wrapSignature.length).toBeGreaterThan(0);
        solanaSignature(`SOL wrap signature`, wrapSignature);
        const solAfter = await connection.getBalance(keypair.publicKey);
        console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} > ${solAfter / LAMPORTS_PER_SOL} SOL`);
        await delay(5e3);

        const unwrapTransaction = await mintPortal.unwrapSOLTransaction(amount, wSOL);
        unwrapTransaction.partialSign(signer);
        const signature = await sendTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight: true });
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

  it(`Should wrap SOL -> wSOL and transfer 0.1 wSOL from Solana to Neon`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    const signer: Signer = toSigner(keypair);
    const solBefore = await connection.getBalance(keypair.publicKey);
    console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} SOL`);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const associatedToken = await mintPortal.getAssociatedTokenAddress(new PublicKey(wSOL.address_spl), mintPortal.solanaWalletPubkey);
      const wSolBefore = await connection.getBalance(associatedToken);
      const balanceBefore = await mintTokenBalance(web3, account.address, wSOL);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const wrapTransaction = await mintPortal.wrapSOLTransaction(amount, wSOL);
        const wrapSignature = await sendTransaction(connection, wrapTransaction, [signer], true, { skipPreflight: false });
        expect(wrapSignature.length).toBeGreaterThan(0);
        solanaSignature(`SOL wrap signature`, wrapSignature);
        const solAfter = await connection.getBalance(keypair.publicKey);
        const wSolAfterWrapping = await connection.getBalance(associatedToken);
        console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} > ${solAfter / LAMPORTS_PER_SOL} SOL; ${wSolBefore / LAMPORTS_PER_SOL} > ${wSolAfterWrapping / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
        await delay(5e3);

        const transaction = await mintPortal.neonTransferTransaction(amount, wSOL);
        const signature = await sendTransaction(connection, transaction, [signer], true, { skipPreflight: false });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL transfer signature`, signature);
        await delay(5e3);

        const wSolAfterTransfer = await connection.getBalance(associatedToken);
        const balanceAfter = await mintTokenBalance(web3, account.address, wSOL);
        console.log(`Balance: ${wSolAfterWrapping / LAMPORTS_PER_SOL} > ${wSolAfterTransfer / LAMPORTS_PER_SOL} ${wSOL.symbol} ==> ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} in Neon`);
        expect(balanceAfter).toBeGreaterThanOrEqual(balanceBefore);
      } catch (e) {
        console.log(e);
        expect(e instanceof Error ? e.message : '').toBe('');
      }
    }
  });

  it(`Should transfer 0.1 wSOL from Neon to Solana and unwrap wSOL -> SOL`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    const signer: Signer = toSigner(keypair);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const mintPubkey = new PublicKey(wSOL.address_spl);
      const solBefore = await connection.getBalance(keypair.publicKey);
      const associatedToken = await mintPortal.getAssociatedTokenAddress(mintPubkey, keypair.publicKey);

      const balanceBefore = await mintTokenBalance(web3, account.address, wSOL);
      console.log(`Balance: ${balanceBefore ?? 0} ${wSOL.symbol}`);
      const solanaTransaction = await mintPortal.solanaTransferTransaction(keypair.publicKey, mintPubkey, associatedToken);
      const neonTransaction = await mintPortal.createNeonTransaction(account.address, associatedToken, wSOL, amount);
      neonTransaction['gasLimit'] = 50000;
      neonTransaction.nonce = (await web3.eth.getTransactionCount(account.address));
      const wSolBefore = await connection.getBalance(associatedToken);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const signedSolanaTransaction = await sendTransaction(connection, solanaTransaction, [signer], true, { skipPreflight: false });
        solanaSignature(`Solana Signature`, signedSolanaTransaction);
        expect(signedSolanaTransaction.length).toBeGreaterThan(0);
        await delay(1e3);
        const signedNeonTransaction = await sendSignedTransaction(web3, neonTransaction, account);
        neonSignature(`Neon Signature`, signedNeonTransaction);
        expect(signedNeonTransaction.length).toBeGreaterThan(0);
        await delay(15e3);
        const balanceAfter = await mintTokenBalance(web3, account.address, wSOL);
        const balanceSPL = await splTokenBalance(connection, keypair.publicKey, wSOL);
        console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} ==> ${balanceSPL?.uiAmount} ${wSOL.symbol} in Solana`);
        expect(balanceAfter).toBeLessThan(balanceBefore);

        const unwrapTransaction = await mintPortal.unwrapSOLTransaction(amount, wSOL);
        unwrapTransaction.partialSign(signer);
        const signature = await sendTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight: true });
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

  faucet.supportedTokens.forEach(token => itSolanaTokenSPL(token));
  faucet.supportedTokens.forEach(token => itNeonTokenMint(token));
});

function itSolanaTokenSPL(token: SPLToken): void {
  it(`Should transfer 0.1 ${token.symbol} from Solana to Neon`, async () => {
    const amount = 0.1;
    const balanceBefore = await splTokenBalance(connection, keypair.publicKey, token);
    console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${token.symbol}`);
    try {
      const transaction = await mintPortal.neonTransferTransaction(amount, token);
      const signer: Signer = toSigner(keypair);
      const signature = await sendTransaction(connection, transaction, [signer], true, { skipPreflight: false });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature);
      await delay(5e3);

      const balanceAfter = await splTokenBalance(connection, keypair.publicKey, token);
      const balanceMint = await mintTokenBalance(web3, account.address, token);
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
    const balanceBefore = await mintTokenBalance(web3, account.address, token);
    console.log(`Balance: ${balanceBefore ?? 0} ${token.symbol}`);
    const associatedTokenPubkey = await mintPortal.getAssociatedTokenAddress(mintPubkey, keypair.publicKey);
    const solanaTransaction = await mintPortal.solanaTransferTransaction(keypair.publicKey, mintPubkey, associatedTokenPubkey);
    const neonTransaction = await mintPortal.createNeonTransaction(account.address, associatedTokenPubkey, token, amount);
    neonTransaction['gasLimit'] = 50000;
    neonTransaction.nonce = (await web3.eth.getTransactionCount(account.address));
    const signer: Signer = toSigner(keypair);
    try {
      const signedSolanaTransaction = await sendTransaction(connection, solanaTransaction, [signer], true, { skipPreflight: false });
      solanaSignature(`Solana Signature`, signedSolanaTransaction);

      expect(signedSolanaTransaction.length).toBeGreaterThan(0);
      await delay(1e3);
      const signedNeonTransaction = await sendSignedTransaction(web3, neonTransaction, account);
      neonSignature(`Neon Signature`, signedNeonTransaction);
      expect(signedNeonTransaction.length).toBeGreaterThan(0);
      await delay(15e3);
      const balanceAfter = await mintTokenBalance(web3, account.address, token);
      const balanceSPL = await splTokenBalance(connection, keypair.publicKey, token);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${token.symbol} ==> ${balanceSPL?.uiAmount} ${token.symbol} in Solana`);
      expect(balanceAfter).toBeLessThan(balanceBefore);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });
}
