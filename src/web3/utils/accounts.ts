import Web3 from "web3";
import {PublicKey} from "@solana/web3.js";
import { Web3Account, privateKeyToAccount} from "web3-eth-accounts";
import {SHA256} from "crypto-js";

export function solanaWalletSigner(solanaWallet: PublicKey, neonWallet: string): Web3Account {
  const emulateSignerPrivateKey = `0x${SHA256(solanaWallet.toBase58() + neonWallet).toString()}`;
  return privateKeyToAccount(emulateSignerPrivateKey);
}
