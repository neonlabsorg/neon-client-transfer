import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Signer } from '@solana/web3.js';
import {
  GasToken,
  NeonAddress,
  NeonProxyRpcApi,
  NEON_TRANSFER_CONTRACT_DEVNET,
  solanaNEONTransferTransaction,
  SPLToken
} from '@neonevm/token-transfer-core';
import {
  neonNeonTransactionEthers
} from '@neonevm/token-transfer-ethers';
import {
  createAssociatedTokenAccount,
  delay,
  deployContracts,
  DEVNET_CHAIN_ID,
  FaucetDropper,
  getGasToken,
  getMultiTokenProxy,
  NEON_PRIVATE,
  neonAirdrop,
  solanaAirdrop,
  PHANTOM_PRIVATE,
  NEON_TOKEN_MODEL,
  toSigner,
  splTokenBalance,
  sendSolanaTransaction,
  solanaSignature,
  neonBalanceEthers,
  sendNeonTransactionEthers,
  neonSignature
} from "../tools";
import { JsonRpcProvider, Wallet } from 'ethers';
import { itNeonTokenMint, itSolanaTokenSPL } from "./erc20";
import { isWSolToNeonTransfer, isWSolToSolanaTransfer } from "./wSol";
import { isWNeonWrapInNeon, isWNeonTransferToSolana } from "./wNeon";

jest.setTimeout(32e4);

const PROXY_IP = process.env.PROXY_IP;
const SOLANA_IP = process.env.SOLANA_IP;

const NEON_RPC_URL = `http://${PROXY_IP}:9090/solana`;
const SOLANA_URL = `http://${SOLANA_IP}:8899`;
const NEON_FAUCET_URL = `http://${PROXY_IP}:3333`;
const amount = 0.1;

//Contracts
let neonTransferContract: string;
let factoryAddress: string;

//Wallets
let neonWallet: Wallet;
let solanaWallet: Keypair;
let signer: Signer;
let sender: NeonAddress;

let faucet: FaucetDropper;
let provider: JsonRpcProvider;
let chainId: number;
let connection: Connection;
let skipPreflight = false;

//Proxy data
let neonProxyRpcApi: NeonProxyRpcApi;
let neonEvmProgram: PublicKey;
let neonTokenMint: PublicKey;
let gasToken: GasToken;

//Balances
let solanaBalance: number = 0;
let evmNeonBalance: number = 0;

//Tokens
let NEON: SPLToken;
let wNEON: SPLToken;
let fungibleSplToken: SPLToken;
let wSOL: SPLToken;

const dropTokens = async (faucet: FaucetDropper, solanaWallet: Keypair, neonWallet: Wallet, neonAmount: number) => {
  solanaBalance = await solanaAirdrop(connection, solanaWallet.publicKey, 1e9);
  evmNeonBalance = await neonAirdrop(provider, faucet, neonWallet, neonAmount);
}

beforeAll(async () => {
  const result = await getMultiTokenProxy(NEON_RPC_URL);
  provider = new JsonRpcProvider(NEON_RPC_URL);
  chainId = Number((await provider.getNetwork())?.chainId);
  const token = getGasToken(result.tokensList, chainId);
  connection = new Connection(SOLANA_URL, 'confirmed');
  neonProxyRpcApi = result.proxyRpc;
  neonEvmProgram = result.evmProgramAddress;
  neonTokenMint = token.tokenMintAddress;
  gasToken = token.gasToken;
  faucet = new FaucetDropper(chainId, NEON_FAUCET_URL);
  const neonAirdropAmount = chainId === DEVNET_CHAIN_ID ? 1e2 : 1e3;

  //Define Gas token token on EVM
  NEON = {
    ...NEON_TOKEN_MODEL,
    address_spl: gasToken.tokenMint,
    chainId
  };

  console.log('PROXY DATA: ', gasToken, neonEvmProgram.toBase58(), neonTokenMint.toBase58());
  console.log('CHAIN ID: ', chainId);

  if(chainId === DEVNET_CHAIN_ID) {
    //Retrieve Devnet configuration
    solanaWallet = Keypair.fromSecretKey(PHANTOM_PRIVATE);
    neonWallet = new Wallet(NEON_PRIVATE, provider);
    neonTransferContract = NEON_TRANSFER_CONTRACT_DEVNET;
    wNEON = faucet.tokens.find(t => t.symbol.toUpperCase() === 'WNEON');
    wSOL = faucet.tokens.find(t => t.symbol.toUpperCase() === 'WSOL');
    fungibleSplToken = faucet.tokens.find(t => t.symbol.toUpperCase() === 'USDT');
    await dropTokens(faucet, solanaWallet, neonWallet, neonAirdropAmount);
  } else {
   /*
    * Create wallets and airdrop tokens
    */
    solanaWallet = Keypair.generate();
    const hdWallet = Wallet.createRandom(provider);
    neonWallet = new Wallet(hdWallet.privateKey, provider);
    await dropTokens(faucet, solanaWallet, neonWallet, neonAirdropAmount);
    console.log(`BALANCES: ${solanaBalance/LAMPORTS_PER_SOL} SOL, ${evmNeonBalance} NEON`, "NEON WALLET - ", neonWallet.address);

   /*
    * Deploy contracts
    */
    ({ sender, factoryAddress, neonTransferContract, wNEON, fungibleSplToken, wSOL } = await deployContracts({ provider, connection, neonWallet, solanaWallet, chainId }));
  }

  const pendingTxs = await provider.getTransactionCount(neonWallet.address, "pending");
  console.log(`Pending transactions: ${pendingTxs}`);

  signer = toSigner(solanaWallet);
});

describe("Wallets Test", () => {
  it("Should be generated a random Solana wallet with balance", () => {
    console.log("Solana Wallet:", solanaWallet.publicKey.toBase58());
    expect(solanaWallet.publicKey).toBeDefined();
    expect(solanaWallet.secretKey.length).toBe(64);
    console.log(`${solanaWallet.publicKey.toBase58()} balance: ${solanaBalance / LAMPORTS_PER_SOL} SOL`);
    expect(solanaBalance).toBeGreaterThan(0);
  });

  it("Should be generated a random EVM wallet with balance", () => {
    console.log("EVM Wallet:", neonWallet.address);
    expect(neonWallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(neonWallet.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    console.log(`${neonWallet.address} balance: ${evmNeonBalance} NEON`);
    expect(evmNeonBalance).toBeGreaterThan(0);
  });

  it("Sender address should be defined", async () => {
    const balance = (await neonBalanceEthers(provider, sender)).toNumber();
    console.log(`Sender ${sender} balance: ${balance} NEON`);
    expect(sender).toBeDefined();
    expect(balance).toBeGreaterThanOrEqual(0);
  });
});

describe("Tokens trasfer test", () => {
  it("Should transfer 0.1 NEON from Neon to Solana", async () => {
    const amount = 1;
    if (neonTransferContract) {
      await createAssociatedTokenAccount(connection, signer, NEON);
      await delay(2e3);
      const balanceSPLBefore = await splTokenBalance(connection, solanaWallet.publicKey, NEON);
      console.log(`NEON balance in solana: ${balanceSPLBefore?.uiAmount}`);
      try {
        const balanceBefore = await neonBalanceEthers(provider, neonWallet);
        const transaction = await neonNeonTransactionEthers({
          provider,
          from: neonWallet.address,
          to: neonTransferContract,
          solanaWallet: solanaWallet.publicKey,
          amount
        });
        transaction.nonce = await neonWallet.getNonce();
        const hash = await sendNeonTransactionEthers(transaction, neonWallet);
        neonSignature(`Signature`, hash);
        expect(hash.length).toBeGreaterThan(2);
        await delay(20e3);
        const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, NEON);
        const balanceAfter = await neonBalanceEthers(provider, neonWallet);
        console.log(`Balance: ${balanceBefore} > ${balanceAfter} NEON ==> ${balanceSPL?.uiAmount} ${NEON.symbol} in Solana`);
        expect(balanceAfter.toNumber()).toBeLessThan(balanceBefore.toNumber());
      } catch (e) {
        console.log(e);
      }
    } else {
      throw new Error('neonTransferContract wasn\'t deployed');
    }
  });

  it("Should transfer 0.1 NEON from Solana to Neon", async () => {
    await createAssociatedTokenAccount(connection, signer, NEON);
    const balanceBefore = await splTokenBalance(connection, solanaWallet.publicKey, NEON);
    console.log(`Balance: ${balanceBefore?.uiAmount ?? 0} ${NEON.symbol}`);
    try {
      const transaction = await solanaNEONTransferTransaction({
        solanaWallet: solanaWallet.publicKey,
        neonWallet: neonWallet.address,
        neonEvmProgram,
        neonTokenMint,
        token: NEON,
        amount,
        chainId
      });
      transaction.recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;
      const signature = await sendSolanaTransaction(connection, transaction, [signer], false, { skipPreflight });
      expect(signature.length).toBeGreaterThan(0);
      solanaSignature(`Signature`, signature);
      await delay(10e3);
      const balanceAfter = await splTokenBalance(connection, solanaWallet.publicKey, NEON);
      const balanceNeon = await neonBalanceEthers(provider, neonWallet);
      console.log(`Balance: ${balanceBefore?.uiAmount} > ${balanceAfter?.uiAmount} ${NEON.symbol} ==> ${balanceNeon} ${NEON.symbol} in Neon`);
      expect(balanceAfter?.uiAmount).toBeLessThan(balanceBefore?.uiAmount!);
    } catch (e) {
      console.log(e);
    }
  });

  it("Should wrap 1 NEON to wNEON in Neon network", async () => {
    if(wNEON) {
      await isWNeonWrapInNeon({ wNEON, NEON, neonWallet, solanaWallet, amount, provider });
    } else {
      throw new Error('ERC20 wrapper for wNEON wasn\'t deployed');
    }
  });

  it("Should withdraw 0.1 wNEON from Neon to Solana", async () => {
    if (wNEON && neonTransferContract) {
      await isWNeonTransferToSolana({ wNEON, NEON, neonWallet, solanaWallet, amount, provider, neonTransferContract, connection });
    } else {
      throw new Error('ERC20 wrapper for wNEON or neonTransferContract wasn\'t deployed');
    }
  });

  it("Should wrap SOL -> wSOL and transfer 0.1 wSOL from Solana to Neon", async () => {
    if(wSOL) {
      await isWSolToNeonTransfer({ connection, wSOL, neonWallet, solanaWallet, chainId, neonEvmProgram, solanaUrl: SOLANA_URL!, signer, amount, neonProxyRpcApi, provider, skipPreflight });
    } else {
      throw new Error('ERC20 wrapper for WSOL wasn\'t deployed');
    }
  });

  it("Should transfer 0.1 wSOL from Neon to Solana and unwrap wSOL -> SOL", async () => {
    if(wSOL) {
      await isWSolToSolanaTransfer({ connection, wSOL, neonWallet, solanaWallet, solanaUrl: SOLANA_URL!, signer, amount, provider, skipPreflight });
    } else {
      throw new Error('ERC20 wrapper for WSOL wasn\'t deployed');
    }
  });
});

describe("SPL tokens trasfer test", () => {
    it("Should transfer 0.1 SPL token from Solana to Neon EVM (NEON)", async () => {
      fungibleSplToken?.address_spl && await itSolanaTokenSPL(provider, connection, NEON_RPC_URL!, neonProxyRpcApi, fungibleSplToken, neonEvmProgram, solanaWallet, neonWallet, chainId, SOLANA_URL!);
    });

    it("Should transfer 0.1 SPL token from NeonEVM (NEON) to Solana", async () => {
      fungibleSplToken?.address_spl && await itNeonTokenMint(connection, provider, NEON_RPC_URL!, faucet, fungibleSplToken, solanaWallet, neonWallet);
    });
});
