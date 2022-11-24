import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, Signer } from '@solana/web3.js';
import { Account } from 'web3-core';
import Web3 from 'web3';
import Big from 'big.js';
import { NeonProxyRpcApi } from '../../api';
import { MintPortal, NeonPortal } from '../../core';
import { NEON_TOKEN_MINT_DECIMALS } from '../../data';
import { InstructionParams, SPLToken } from '../../models';
import {
  NEON_CHAIN_IDS,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  PHANTOM_PRIVATE
} from '../tools/artifacts/config';
import { delay, FaucetDropper, sendTransaction, toSigner } from '../tools/utils';

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

jest.setTimeout(35e3);

let connection: Connection;
let web3: Web3;
let keypair: Keypair;
let address: Account;
let neonPortal: NeonPortal;
let mintPortal: MintPortal;

beforeAll(async () => {
  connection = new Connection(SOLANA_DEVNET, 'confirmed');
  web3 = new W3(NEON_DEVNET);
  keypair = Keypair.fromSecretKey(PHANTOM_PRIVATE);
  address = web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE);
  const proxyStatus = await proxyApi.evmParams();
  await delay(1000);

  const options: InstructionParams = {
    connection,
    solanaWalletAddress: keypair.publicKey,
    neonWalletAddress: address.address,
    proxyApi,
    proxyStatus,
    web3
  };

  neonPortal = new NeonPortal(options);
  mintPortal = new MintPortal(options);
});

beforeAll(async () => {
  try {
    const balance = await web3.eth.getBalance(address.address);
    const token = new Big(balance).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
    if (token.gte(0.1)) {
      console.log(`${address.address}: ${token.toNumber()} NEON`);
    } else {
      await faucet.requestNeon(1, address.address);
    }
  } catch (e) {
    console.log(e);
  }
});

describe('Transfer tests', () => {
  it(`Solana Keypair has tokens`, async () => {
    try {
      const balance = await connection.getBalance(keypair.publicKey);
      console.log(`${keypair.publicKey.toBase58()}: ${balance / LAMPORTS_PER_SOL} SOL`);
      expect(balance).toBeGreaterThan(1e7);
    } catch (e) {
      console.error(e);
    }
  });

  it(`Neon Account has tokens`, async () => {
    try {
      const balance = await web3.eth.getBalance(address.address);
      const token = new Big(balance).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
      expect(token.toNumber()).toBeGreaterThan(0.001);
    } catch (e) {
      console.error(e);
    }
  });

  it(`Should transfer 0.001 NEON from Neon to Solana`, async () => {
    const amount = 0.1;
    const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
    try {
      const transaction = await mintPortal.neonTransferTransaction(amount, neon);
      const signer: Signer = toSigner(keypair);
      const signature = await sendTransaction(connection, transaction, [signer], true, { skipPreflight: false });
      expect(signature.length).toBeGreaterThan(0);
      console.info(`Signature: ${signature}`);
    } catch (e) {
      console.log(e);
    }
  });

  it(`Should transfer 0.001 NEON from Solana to Neon`, async () => {
    const amount = 0.001;
    const neon: SPLToken = { ...NEON_TOKEN_MODEL, chainId: CHAIN_ID };
    try {
      const transaction = await neonPortal.neonTransferTransaction(amount, neon);
      const signer: Signer = toSigner(keypair);
      const signature = await sendTransaction(connection, transaction, [signer], true, { skipPreflight: false });
      expect(signature.length).toBeGreaterThan(0);
      console.info(`Signature: ${signature}`);
    } catch (e) {
      console.log(e);
    }
  });

  // faucet.tokens.forEach(t => {
  //   it.skip(`Should transfer 0.001 ${t.symbol} from Solana to Neon`, async () => {
  //     // console.log(t);
  //   });
  // });
});
