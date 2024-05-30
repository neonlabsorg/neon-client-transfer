import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  TokenAmount
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Web3 } from 'web3';
import { Web3Account } from 'web3-eth-accounts';
import { ContractAbi, Transaction } from 'web3-types';
import {
  createUnwrapSOLTransaction,
  GasToken,
  NEON_TRANSFER_CONTRACT_DEVNET,
  NeonProgramStatus,
  NeonProxyRpcApi,
  neonWrapper2Abi,
  signerPrivateKey,
  solanaNEONTransferTransaction,
  SPLToken,
  TOKEN_LIST_DEVNET_SNAPSHOT,
  wrappedNeonTransaction
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionWeb3,
  createWrapAndTransferSOLTransaction,
  getGasAndEstimationGasPrice,
  neonNeonTransactionWeb3,
  wrappedNeonTransactionData
} from '@neonevm/token-transfer-web3';
import {
  createAssociatedTokenAccount,
  delay,
  FaucetDropper,
  getGasToken,
  getMultiTokenProxy,
  getWeb3Provider,
  mintTokenBalance,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalance,
  neonSignature,
  PHANTOM_PRIVATE,
  sendNeonTransaction,
  sendSolanaTransaction,
  solanaSignature,
  solanaWalletSigner,
  splTokenBalance,
  toSigner
} from '../tools';

import { itNeonTokenMint, itSolanaTokenSPL } from './erc20';

require('dotenv').config({ path: `./__tests__/env/.env` });
jest.setTimeout(12e4);

const skipPreflight = false;
const CHAIN_ID = Number(process.env.CHAIN_ID);
const SOLANA_URL = process.env.SOLANA_URL;
const NEON_PROXY_URL = `${process.env.NEON_URL}/neon`;
const faucet = new FaucetDropper(CHAIN_ID);


let tokensList: GasToken[] = [];
let solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
let signer: Signer = toSigner(solanaWallet);
let gasToken: GasToken;
let neonProxyStatus: Partial<NeonProgramStatus>;
let neonEvmProgram: PublicKey;
let neonTokenMint: PublicKey;
let neonProxyRpcApi: NeonProxyRpcApi;

let web3: Web3;
let neonWallet: Web3Account;
let connection: Connection;

describe('NEON token transfer tests', () => {
  beforeAll(async () => {
    try {
      const result = await getMultiTokenProxy(NEON_PROXY_URL!);
      const token = getGasToken(result.tokensList, CHAIN_ID);
      connection = new Connection(SOLANA_URL!, 'confirmed');
      web3 = getWeb3Provider(NEON_PROXY_URL!);
      neonProxyRpcApi = result.proxyRpc;
      neonProxyStatus = result.proxyStatus;
      neonEvmProgram = result.evmProgramAddress;
      neonTokenMint = token.tokenMintAddress;
      solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
      neonWallet = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE);
      tokensList = (await neonProxyRpcApi.nativeTokenList()) || TOKEN_LIST_DEVNET_SNAPSHOT;
      gasToken = token.gasToken;
    } catch (e) {
      console.log(e);
    }
  });

  beforeAll(async () => {
    try {
      const token = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
      if (token.gte(0.1)) {
        console.log(`Neon wallet: ${neonWallet.address}: ${token.toNumber()} NEON`);
      } else {
        await faucet.requestNeon(neonWallet.address, 2);
        await delay(1e4);
        const token = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
        console.log(`Neon wallet: ${neonWallet.address}: ${token.toNumber()} NEON`);
      }
    } catch (e) {
      console.log(e);
    }
  });

  beforeAll(async () => {
    try {
      const balance = await connection.getBalance(solanaWallet.publicKey);
      if (balance) {
        console.log(`Solana wallet: ${solanaWallet.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
      } else {
        await connection.requestAirdrop(solanaWallet.publicKey, LAMPORTS_PER_SOL);
        await delay(1e4);
        const balance = await connection.getBalance(solanaWallet.publicKey);
        console.log(`Solana wallet: ${solanaWallet.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
      }
    } catch (e) {
      console.log(e);
    }
  });

  afterEach(async () => {
    await delay(5e3);
  });

  it(`Solana Keypair has tokens`, async () => {
    try {
      const balance = await connection.getBalance(solanaWallet.publicKey);
      expect(balance).toBeGreaterThan(1e8);
    } catch (e) {
      console.error(e);
    }
  });

  it(`Neon Account has tokens`, async () => {
    try {
      const token = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
      expect(token.toNumber()).toBeGreaterThan(0.1);
    } catch (e) {
      console.error(e);
    }
  });

  // it(`Should transfer 1 NEON from Neon to Solana`, async () => {
  //   const amount = 0.1;
  //   const neonToken: SPLToken = {
  //     ...NEON_TOKEN_MODEL,
  //     address_spl: gasToken.tokenMint,
  //     chainId: CHAIN_ID
  //   };
  //   try {
  //     const balanceBefore = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
  //     const transaction = await neonNeonTransactionWeb3(NEON_PROXY_URL!, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
  //     const hash = await sendNeonTransaction(web3, transaction, neonWallet);
  //     neonSignature(`Signature`, hash);
  //     expect(hash.length).toBeGreaterThan(2);
  //     await delay(5e3);
  //     const balanceAfter = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
  //     const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
  //     console.log(`Balance: ${balanceBefore} > ${balanceAfter} NEON ==> ${balanceSPL?.uiAmount} ${neonToken.symbol} in Solana`);
  //     expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
  //   } catch (e) {
  //     console.log(e);
  //     expect(e instanceof Error ? e.message : '').toBe('');
  //   }
  // });
  //
  // it(`Should transfer 0.1 NEON from Solana to Neon`, async () => {
  //   const amount = 0.1;
  //   const neonToken: SPLToken = {
  //     ...NEON_TOKEN_MODEL,
  //     address_spl: gasToken.tokenMint,
  //     chainId: CHAIN_ID
  //   };
  //   await createAssociatedTokenAccount(connection, signer, neonToken);
  //   const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
  //   console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${neonToken.symbol}`);
  //   try {
  //     const transaction = await solanaNEONTransferTransaction(solanaWallet.publicKey, neonWallet.address, neonEvmProgram, neonTokenMint, neonToken, amount, CHAIN_ID);
  //     transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
  //     const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight });
  //     expect(signature.length).toBeGreaterThan(0);
  //     solanaSignature(`Signature`, signature, SOLANA_URL!);
  //     await delay(10e3);
  //     const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, neonToken);
  //     const balanceNeon = await neonBalance(NEON_PROXY_URL!
  //       , neonWallet.address);
  //     console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${neonToken.symbol} ==> ${balanceNeon} ${neonToken.symbol} in Neon`);
  //     expect(balanceAfter.uiAmount).toBeLessThan(balanceBefore.uiAmount!);
  //   } catch (e) {
  //     console.log(e);
  //     expect(e instanceof Error ? e.message : '').toBe('');
  //   }
  // });

  // it('Should wrap 1 NEON to wNEON in Neon network', async () => {
  //   const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WNEON');
  //   if (id > -1) {
  //     const amount = 0.1;
  //     const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
  //     const wneon: SPLToken = faucet.tokens[id];
  //     const neonBalanceBefore = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
  //     const wneonBalanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi as ContractAbi);
  //     try {
  //       const wrapTransaction = await neonNeonTransactionWeb3(NEON_PROXY_URL!, neonWallet.address, wneon.address, solanaWallet.publicKey, amount);
  //       const wrapHash = await sendNeonTransaction(web3, wrapTransaction, neonWallet);
  //       neonSignature(`NEON wrap signature`, wrapHash);
  //       expect(wrapHash.length).toBeGreaterThan(2);
  //       await delay(5e3);
  //
  //       const wneonBalanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi as ContractAbi);
  //       const neonBalanceAfter = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
  //
  //       console.log(`Balance: ${wneonBalanceBefore} => ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
  //       console.log(`Balance: ${neonBalanceBefore} => ${neonBalanceAfter} ${neon.symbol} in Neon`);
  //       expect(wneonBalanceAfter).toBeGreaterThanOrEqual(wneonBalanceBefore);
  //       expect(neonBalanceAfter.toNumber()).toBeLessThanOrEqual(neonBalanceBefore.toNumber());
  //     } catch (e) {
  //       console.log(e);
  //       expect(e instanceof Error ? e.message : '').toBe('');
  //     }
  //   }
  // });
  //
  // it('Should withdraw 0.1 wNEON from Neon to Solana', async () => {
  //   const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WNEON');
  //   if (id > -1) {
  //     const amount = 0.1;
  //     const neon: SPLToken = {
  //       ...NEON_TOKEN_MODEL,
  //       address_spl: gasToken.tokenMint,
  //       chainId: CHAIN_ID
  //     };
  //     const wneon: SPLToken = faucet.tokens[id];
  //     const wneonBalanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi as ContractAbi);
  //     try {
  //       const data = wrappedNeonTransactionData(NEON_PROXY_URL!, wneon, amount);
  //       const unwrapTransaction = wrappedNeonTransaction<Transaction>(neonWallet.address, wneon.address, data as string) as Transaction;
  //       const {
  //         gasPrice,
  //         gas
  //       } = await getGasAndEstimationGasPrice(NEON_PROXY_URL!, unwrapTransaction);
  //       unwrapTransaction.gasPrice = gasPrice;
  //       unwrapTransaction.gas = gas;
  //       const unwrapHash = await sendNeonTransaction(web3, unwrapTransaction, neonWallet);
  //       neonSignature(`wNEON unwrap signature`, unwrapHash);
  //       expect(unwrapHash.length).toBeGreaterThan(2);
  //       await delay(5e3);
  //
  //       const wneonBalanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wneon, neonWrapper2Abi as ContractAbi);
  //       console.log(`Balance: ${wneonBalanceBefore} > ${wneonBalanceAfter} ${wneon.symbol} in Neon`);
  //       expect(wneonBalanceAfter).toBeLessThan(wneonBalanceBefore);
  //
  //       const neonBalanceBefore = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
  //
  //       const transaction = await neonNeonTransactionWeb3(NEON_PROXY_URL!, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
  //       const hash = await sendNeonTransaction(web3, transaction, neonWallet);
  //       neonSignature(`NEON transfer signature`, hash);
  //       await delay(5e3);
  //
  //       const neonBalanceAfter = await neonBalance(NEON_PROXY_URL!, neonWallet.address);
  //       const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, neon);
  //
  //       console.log(`Balance: ${neonBalanceBefore} > ${neonBalanceAfter} ${wneon.symbol} ==> ${balanceSPL.uiAmount} ${neon.symbol} in Solana`);
  //       expect(neonBalanceAfter.toNumber()).toBeLessThan(neonBalanceBefore.toNumber());
  //     } catch (e) {
  //       console.log(e);
  //       expect(e instanceof Error ? e.message : '').toBe('');
  //     }
  //   }
  // });

  it(`Should wrap SOL -> wSOL and transfer 0.1 wSOL from Solana to Neon`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol.toUpperCase() === 'WSOL');
    const solBefore = await connection.getBalance(solanaWallet.publicKey);
    console.log(`Balance: ${solBefore / LAMPORTS_PER_SOL} SOL`);
    if (id > -1) {
      const wSOL = faucet.tokens[id];
      const associatedToken = getAssociatedTokenAddressSync(new PublicKey(wSOL.address_spl), solanaWallet.publicKey);
      const wSolBefore = await connection.getBalance(associatedToken);
      const balanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wSOL);
      console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
      try {
        const walletSigner = solanaWalletSigner(web3, signerPrivateKey(solanaWallet.publicKey, neonWallet.address));
        const transaction = await createWrapAndTransferSOLTransaction(connection, NEON_PROXY_URL!, neonProxyRpcApi, neonEvmProgram, solanaWallet.publicKey, neonWallet.address, walletSigner, wSOL, amount, CHAIN_ID);
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, transaction, [signer], true, { skipPreflight });
        expect(signature.length).toBeGreaterThan(0);
        solanaSignature(`wSOL transfer signature`, signature, SOLANA_URL!);
        await delay(5e3);

        const wSolAfterTransfer = await connection.getBalance(associatedToken);
        const balanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wSOL);
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
      try {
        const balanceBefore = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wSOL);
        console.log(`Balance: ${balanceBefore ?? 0} ${wSOL.symbol}`);
        const signer: Signer = toSigner(solanaWallet);
        await createAssociatedTokenAccount(connection, signer, wSOL);
        const neonTransaction = await createMintNeonTransactionWeb3(NEON_PROXY_URL!, neonWallet.address, associatedToken, wSOL, amount);
        const wSolBefore = await connection.getBalance(associatedToken);
        console.log(`Balance: ${wSolBefore / LAMPORTS_PER_SOL} ${wSOL.symbol}`);
        const signedNeonTransaction = await sendNeonTransaction(web3, neonTransaction, neonWallet);
        neonSignature(`Neon Signature`, signedNeonTransaction);
        expect(signedNeonTransaction.length).toBeGreaterThan(0);
        await delay(15e3);
        const balanceAfter = await mintTokenBalance(NEON_PROXY_URL!, neonWallet.address, wSOL);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, wSOL);
        console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${wSOL.symbol} ==> ${balanceSPL?.uiAmount} ${wSOL.symbol} in Solana`);
        expect(balanceAfter).toBeLessThan(balanceBefore);

        const unwrapTransaction = await createUnwrapSOLTransaction(connection, solanaWallet.publicKey, wSOL);
        unwrapTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const signature = await sendSolanaTransaction(connection, unwrapTransaction, [signer], true, { skipPreflight });
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
      itSolanaTokenSPL(web3, connection, NEON_PROXY_URL!, neonProxyRpcApi, token, neonEvmProgram, solanaWallet, neonWallet, CHAIN_ID, SOLANA_URL!).then(() => _());
    });

    it(`Should transfer 0.1 ${token.symbol} from NeonEVM (NEON) to Solana`, _ => {
      itNeonTokenMint(connection, web3, NEON_PROXY_URL!, faucet, token, solanaWallet, neonWallet).then(() => _());
    });
  });
});
