import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import {
  createAssociatedTokenAccount,
  delay,
  FaucetDropper, getEthersProvider,
  getGasToken,
  getMultiTokenProxy,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalanceEthers,
  PHANTOM_PRIVATE,
  sendSolanaTransaction,
  solanaSignature,
  splTokenBalance,
  toSigner
} from '../tools';
import {
  GasToken,
  NeonProgramStatus,
  NeonProxyRpcApi,
  solanaNEONTransferTransaction,
  SPLToken,
  TOKEN_LIST_DEVNET_SNAPSHOT
} from '@neonevm/token-transfer-core';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from '@solana/web3.js';
import { JsonRpcProvider, Wallet } from "ethers";

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

let neonWallet: Wallet;
let provider: JsonRpcProvider;
let connection: Connection;

describe('NEON token transfer tests', () => {
  beforeAll(async () => {
    try {
      provider = getEthersProvider(NEON_PROXY_URL!);
      const result = await getMultiTokenProxy(NEON_PROXY_URL!);
      const token = getGasToken(result.tokensList, CHAIN_ID);
      connection = new Connection(SOLANA_URL!, 'confirmed');
      neonProxyRpcApi = result.proxyRpc;
      neonProxyStatus = result.proxyStatus;
      neonEvmProgram = result.evmProgramAddress;
      neonTokenMint = token.tokenMintAddress;
      solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
      neonWallet = new Wallet(NEON_PRIVATE, provider);
      tokensList = (await neonProxyRpcApi.nativeTokenList()) || TOKEN_LIST_DEVNET_SNAPSHOT;
      gasToken = token.gasToken;
    } catch (e) {
      console.log(e);
    }
  });

  beforeAll(async () => {
    try {
      const token = await neonBalanceEthers(provider, neonWallet);
      if (token.gte(0.1)) {
        console.log(`Neon wallet: ${neonWallet.address}: ${token.toNumber()} NEON`);
      } else {
        await faucet.requestNeon(neonWallet.address, 2);
        await delay(1e4);
        const token = await neonBalanceEthers(provider, neonWallet);
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

  it(`Should transfer 0.1 NEON with NEON fee from Solana to Neon`, async () => {
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
});
