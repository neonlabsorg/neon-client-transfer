import { defineStore } from 'pinia';
import type { Connection, PublicKey, Transaction as SolanaTransaction } from '@solana/web3.js';
import { PublicKey as SolanaPublicKey } from '@solana/web3.js';
import type { GasToken, SPLToken } from '@neonevm/token-transfer-core';
import {
  createAssociatedTokenAccountTransaction,
  NEON_TOKEN_MINT_DEVNET,
  solanaSOLTransferTransaction
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionWeb3,
  neonNeonTransactionWeb3,
  neonTransferMintTransactionWeb3
} from '@neonevm/token-transfer-web3';
import { useFormStore, useWalletsStore, useWeb3Store } from '@/stores';
import type { TransactionRequest } from 'ethers'
import type { TransferSignature } from '@/types';

interface ITransactionStore {
  signature: TransferSignature
  gasTokens: GasToken[],
  mintPublicKey: PublicKey,
  networkTokenMint: PublicKey
}

export const useTransactionStore = defineStore('transaction', {
  state: (): ITransactionStore => ({
    signature: {} as TransferSignature,
    gasTokens: [] as GasToken[],
    mintPublicKey: {} as PublicKey,
    networkTokenMint: {} as PublicKey
  }),
  actions: {
    async initStore() {
      this.setNetworkTokenMint();
      await this.setGasTokens();
    },
    setSignature(signature: TransferSignature) {
      this.signature = signature;
    },
    setNetworkTokenMint() {
      const web3Store = useWeb3Store();
      const id = this.gasTokens
        .findIndex(i => parseInt(i.tokenChainId, 16) === web3Store.chainId);
      this.networkTokenMint = new SolanaPublicKey(id > -1 ? this.gasTokens[id].tokenMint : NEON_TOKEN_MINT_DEVNET);
    },
    setMintPublicKey() {
      const formSore = useFormStore();
      if (formSore.currentSplToken) {
        this.mintPublicKey = new SolanaPublicKey(formSore.currentSplToken.address_spl);
      }
    },
    createAssociatedTokenAccountTransaction(associatedToken: PublicKey) {
      const walletSore = useWalletsStore();

      return createAssociatedTokenAccountTransaction(
        walletSore.solanaWallet.publicKey,
        this.mintPublicKey,
        associatedToken
      );
    },
    async sendMintNeonTransactionWeb3(associatedToken: PublicKey) {
      const web3Store = useWeb3Store();
      const walletSore = useWalletsStore();
      const formSore = useFormStore();

      return await createMintNeonTransactionWeb3(
        web3Store.networkUrl.neonProxy,
        walletSore.neonWallet.address,
        associatedToken,
        formSore.currentSplToken as SPLToken,
        formSore.inputAmount
      );
    },
    async setGasTokens() {
      const web3Store = useWeb3Store();

      this.gasTokens = await web3Store.apiProxy.nativeTokenList();
    },
    async sendNeonTranaction(transaction: TransactionRequest) {
      const walletStore = useWalletsStore();

      const receipt = await walletStore.neonWallet.sendTransaction(transaction);
      return receipt.hash;
    },
    async sendSolTransaction() {
      const walletStore = useWalletsStore();
      const web3Store = useWeb3Store();
      const formStore = useFormStore();

      return await solanaSOLTransferTransaction(
        web3Store.solanaConnection as Connection,
        walletStore.solanaWallet.publicKey,
        walletStore.neonWallet.address,
        web3Store.neonProgram,
        this.networkTokenMint,
        formStore.currentSplToken as SPLToken,
        formStore.inputAmount,
        web3Store.chainId
      );
    },
    async sendNeonMintTranaction() {
      const walletStore = useWalletsStore();
      const web3Store = useWeb3Store();
      const formStore = useFormStore();

      return await neonTransferMintTransactionWeb3(
        web3Store.solanaConnection as Connection,
        web3Store.networkUrl.neonProxy,
        web3Store.apiProxy,
        web3Store.neonProgram,
        walletStore.solanaWallet.publicKey,
        walletStore.neonWallet.address,
        walletStore.solanaWalletSigner,
        formStore.currentSplToken as SPLToken,
        formStore.inputAmount,
        web3Store.chainId
      );
    },
    async sendNeonWeb3Tranaction() {
      const walletStore = useWalletsStore();
      const web3Store = useWeb3Store();
      const formStore = useFormStore();

      return await neonNeonTransactionWeb3(
        web3Store.networkUrl.neonProxy,
        walletStore.neonWallet.address,
        NEON_TOKEN_MINT_DEVNET,
        walletStore.solanaWallet.publicKey,
        formStore.inputAmount
      );
    },
    async sendTransaction(transaction: SolanaTransaction) {
      const web3Store = useWeb3Store();

      transaction.recentBlockhash = (await web3Store.solanaConnection.getLatestBlockhash()).blockhash;
      transaction.sign(...[web3Store.solanaSigner]);
      const signature = await web3Store.solanaConnection.sendRawTransaction(transaction.serialize(), { skipPreflight: false });

      const {
        blockhash,
        lastValidBlockHeight
      } = await web3Store.solanaConnection.getLatestBlockhash();
      await web3Store.solanaConnection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      });

      return signature;
    },
  },
  getters: {
    solanaSignature: (state) => `https://explorer.solana.com/tx/${state.signature.solana}?cluster=devnet`,
    neonSignature: (state) => `https://devnet.neonscan.org/tx/${state.signature.neon}`
  }
});
