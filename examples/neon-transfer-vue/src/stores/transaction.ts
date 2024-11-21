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

      return createAssociatedTokenAccountTransaction({
        solanaWallet: walletSore.solanaWallet.publicKey,
        tokenMint: this.mintPublicKey,
        associatedToken
      });
    },
    async sendMintNeonTransactionWeb3(associatedToken: PublicKey) {
      const web3Store = useWeb3Store();
      const walletSore = useWalletsStore();
      const formSore = useFormStore();

      return await createMintNeonTransactionWeb3({
        provider: web3Store.networkUrl.neonProxy,
        neonWallet: walletSore.neonWallet.address,
        associatedToken,
        splToken: formSore.currentSplToken as SPLToken,
        amount: formSore.inputAmount
      });
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

      return await solanaSOLTransferTransaction({
        connection: web3Store.solanaConnection as Connection,
        solanaWallet: walletStore.solanaWallet.publicKey,
        neonWallet: walletStore.neonWallet.address,
        neonEvmProgram: web3Store.neonProgram,
        neonTokenMint: this.networkTokenMint,
        splToken: formStore.currentSplToken as SPLToken,
        amount: formStore.inputAmount,
        chainId: web3Store.chainId
      });
    },
    async sendNeonMintTranaction() {
      const walletStore = useWalletsStore();
      const web3Store = useWeb3Store();
      const formStore = useFormStore();

      return await neonTransferMintTransactionWeb3({
        connection: web3Store.solanaConnection as Connection,
        proxyUrl: web3Store.networkUrl.neonProxy,
        proxyApi: web3Store.apiProxy,
        neonEvmProgram: web3Store.neonProgram,
        solanaWallet: walletStore.solanaWallet.publicKey,
        neonWallet: walletStore.neonWallet.address,
        walletSigner: walletStore.solanaWalletSigner,
        splToken: formStore.currentSplToken as SPLToken,
        amount: formStore.inputAmount,
        chainId: web3Store.chainId
      });
    },
    async sendNeonWeb3Tranaction() {
      const walletStore = useWalletsStore();
      const web3Store = useWeb3Store();
      const formStore = useFormStore();

      return await neonNeonTransactionWeb3({
        provider: web3Store.networkUrl.neonProxy,
        from: walletStore.neonWallet.address,
        to: NEON_TOKEN_MINT_DEVNET,
        solanaWallet: walletStore.solanaWallet.publicKey,
        amount: formStore.inputAmount
      });
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
