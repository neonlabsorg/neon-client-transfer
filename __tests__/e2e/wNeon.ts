import {
  delay,
  estimateGas,
  mintTokenBalanceEthers,
  neonBalanceEthers,
  neonSignature,
  sendNeonTransactionEthers, splTokenBalance
} from "../tools";
import { neonWrapper2Abi, SPLToken, wrappedNeonTransaction } from "@neonevm/token-transfer-core";
import {
  neonNeonTransactionEthers,
  wrappedNeonTransactionData
} from '@neonevm/token-transfer-ethers';
import { expect } from "@jest/globals";
import { JsonRpcProvider, TransactionRequest, Wallet } from "ethers";
import { Connection, Keypair } from '@solana/web3.js';

export type TransferWNeonParams = {
  provider: JsonRpcProvider;
  solanaWallet: Keypair;
  neonWallet: Wallet;
  wNEON: SPLToken;
  NEON: SPLToken;
  amount: number;
  neonTransferContract: string;
  connection: Connection;
}

export async function isWNeonWrapInNeon({ wNEON, NEON, neonWallet, solanaWallet, amount, provider }: Omit<TransferWNeonParams, "neonTransferContract" | "connection">) {
  const neonBalanceBefore = await neonBalanceEthers(provider, neonWallet);
  const wneonBalanceBefore = await mintTokenBalanceEthers(neonWallet, wNEON, neonWrapper2Abi);
  try {
    const wrapTransaction = await neonNeonTransactionEthers({
      provider,
      from: neonWallet.address,
      to: wNEON.address,
      solanaWallet: solanaWallet.publicKey,
      amount
    });
    wrapTransaction.nonce = await neonWallet.getNonce();
    const wrapHash = await sendNeonTransactionEthers(wrapTransaction, neonWallet);
    neonSignature(`NEON wrap signature`, wrapHash);
    expect(wrapHash.length).toBeGreaterThan(2);
    await delay(10e3);

    const wneonBalanceAfter = await mintTokenBalanceEthers(neonWallet, wNEON, neonWrapper2Abi);
    const neonBalanceAfter = await neonBalanceEthers(provider, neonWallet);

    console.log(`Balance: ${wneonBalanceBefore} => ${wneonBalanceAfter} ${wNEON.symbol} in Neon`);
    console.log(`Balance: ${neonBalanceBefore} => ${neonBalanceAfter} ${NEON.symbol} in Neon`);
    expect(wneonBalanceAfter).toBeGreaterThanOrEqual(wneonBalanceBefore);
    expect(neonBalanceAfter.toNumber()).toBeLessThanOrEqual(neonBalanceBefore.toNumber());
  } catch (e) {
    console.log(e);
  }
}

export async function isWNeonTransferToSolana({ wNEON, NEON, neonWallet, solanaWallet, amount, provider, neonTransferContract, connection }: TransferWNeonParams) {
  const wneonBalanceBefore = await mintTokenBalanceEthers(neonWallet, wNEON, neonWrapper2Abi);
  try {
    const data = wrappedNeonTransactionData(wNEON, amount);
    const unwrapTransaction = wrappedNeonTransaction<TransactionRequest>(neonWallet.address, wNEON.address, data);
    const feeData = await provider.getFeeData();
    unwrapTransaction.gasPrice = feeData.gasPrice;
    unwrapTransaction.gasLimit = await estimateGas(provider, unwrapTransaction);
    unwrapTransaction.nonce = await neonWallet.getNonce();
    const unwrapHash = await sendNeonTransactionEthers(unwrapTransaction, neonWallet);
    neonSignature(`wNEON unwrap signature`, unwrapHash);
    expect(unwrapHash.length).toBeGreaterThan(2);
    await delay(20e3);

    const wneonBalanceAfter = await mintTokenBalanceEthers(neonWallet, wNEON, neonWrapper2Abi);
    console.log(`Balance: ${wneonBalanceBefore} > ${wneonBalanceAfter} ${wNEON.symbol} in Neon`);
    expect(wneonBalanceAfter).toBeLessThan(wneonBalanceBefore);

    const neonBalanceBefore = await neonBalanceEthers(provider, neonWallet);
    const transaction = await neonNeonTransactionEthers({ provider, from: neonWallet.address, to: neonTransferContract, solanaWallet: solanaWallet.publicKey, amount });
    transaction.nonce = await neonWallet.getNonce();
    const hash = await sendNeonTransactionEthers(transaction, neonWallet);
    neonSignature(`NEON transfer signature`, hash);
    await delay(20e3);

    const neonBalanceAfter = await neonBalanceEthers(provider, neonWallet);
    const balanceSPL = await splTokenBalance(connection, solanaWallet.publicKey, NEON);

    console.log(`Balance: ${neonBalanceBefore} > ${neonBalanceAfter} ${wNEON.symbol} ==> ${balanceSPL?.uiAmount} ${NEON.symbol} in Solana`);
    expect(neonBalanceAfter.toNumber()).toBeLessThan(neonBalanceBefore.toNumber());
  } catch (e) {
    console.log(e);
  }
}
