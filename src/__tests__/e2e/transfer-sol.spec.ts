import { beforeAll, describe, expect, it } from '@jest/globals';
import { Connection, Keypair, PublicKey, Signer } from '@solana/web3.js';
import { Account } from 'web3-core';
import Web3 from 'web3';
import { NeonProgramStatus, ProxyStatus, SPLToken } from '../../models';
import {
  createSplAccount,
  delay,
  FaucetDropper,
  getMultiTokenProxy,
  NEON_PRIVATE,
  neonBalance,
  PHANTOM_PRIVATE,
  sendSolanaTransaction,
  SOL_TOKEN_MODEL,
  solanaBalance,
  solanaSignature
} from '../tools';
import { solanaSOLTransferTransaction } from '../../core';
import { itNeonTokenMint, itSolanaTokenSPL } from './erc20.spec';
import { proxyApi, proxyStatus } from '../../react';

require('dotenv').config({ path: `./src/__tests__/env/.env` });

const CHAIN_ID_SOL = Number(process.env.CHAIN_ID_SOL);
const SOLANA_URL = process.env.SOLANA_URL; // clusterApiUrl(CHAIN_NAME);
const SOL_PROXY_URL = `${process.env.NEON_URL}/solana/sol`;

describe(`SOL Transfer tests`, () => {
  const skipPreflight = true;
  const chainId = CHAIN_ID_SOL;
  const faucet = new FaucetDropper(chainId);
  const connection = new Connection(SOLANA_URL!, 'confirmed');
  let signer: Signer;
  let proxyStatus: NeonProgramStatus;
  let evmProgramAddress: PublicKey;
  let tokenMintAddress: PublicKey;
  let web3: Web3;
  let solanaWallet: Keypair;
  let neonWallet: Account;


  beforeAll(async () => {
    const result = await getMultiTokenProxy(SOL_PROXY_URL, SOLANA_URL!, chainId);
    web3 = result.web3;
    proxyStatus = result.proxyStatus;
    evmProgramAddress = result.evmProgramAddress;
    tokenMintAddress = result.tokenMintAddress;
    solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
    neonWallet = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE);
  });

  it.skip(`Should transfer 0.1 SOL from Solana to NeonSolEVM`, async () => {
    const amount = 0.1;
    const id = faucet.tokens.findIndex(i => i.symbol === 'wSOL');
    const solToken: SPLToken = { ...faucet.tokens[id], ...SOL_TOKEN_MODEL, chainId };
    await createSplAccount(connection, signer, solToken);
    const balanceBefore = (await solanaBalance(connection, solanaWallet.publicKey)).toNumber();
    console.log(`Balance: ${balanceBefore} ${solToken.symbol}`);
    try {
      const transaction = await solanaSOLTransferTransaction(connection, solanaWallet.publicKey, neonWallet.address, evmProgramAddress, tokenMintAddress, solToken, amount, chainId);
      transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature, SOLANA_URL!);
      await delay(10e3);
      const balanceAfter = (await solanaBalance(connection, solanaWallet.publicKey)).toNumber();
      const balanceNeon = await neonBalance(web3, neonWallet.address);
      console.log(`Balance: ${balanceBefore} > ${balanceAfter} ${solToken.symbol} ==> ${balanceNeon} ${solToken.symbol} in NeonEVM`);
      expect(balanceAfter).toBeLessThan(balanceBefore);
    } catch (e) {
      console.log(e);
      expect(e instanceof Error ? e.message : '').toBe('');
    }
  });

  // faucet.supportedTokens.forEach(token => itSolanaTokenSPL(connection, web3, proxyApi, proxyStatus, token, evmProgramAddress, solanaWallet, neonWallet, chainId, SOLANA_URL!));
  // faucet.supportedTokens.forEach(token => itNeonTokenMint(connection, web3, faucet, token, proxyStatus, solanaWallet, neonWallet, SOLANA_URL!));
});

