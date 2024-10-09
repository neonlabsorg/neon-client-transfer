import { defineStore } from 'pinia';
import {
  NEON_TOKEN_MODEL,
  networkUrls,
  SOL_TOKEN_MODEL,
  supportedTokens,
  TOKEN_LIST
} from '@/utils';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

import { useTransactionStore, useWalletsStore, useWeb3Store } from '@/stores';

import type { TransferDirection } from '@/types';
import type { SPLToken } from '@neonevm/token-transfer-core';

interface IFormStore {
  amount: string
  isLoading: boolean,
  isPendingTokenChange: boolean,
  isSubmitting: boolean,
  hasError: boolean,
  currentSplToken: SPLToken | null
  tokenList: SPLToken[]
  transferDirection: TransferDirection
}

export const useFormStore = defineStore('form', {
  state: (): IFormStore => ({
    amount: '0.1',
    isLoading: true,
    hasError: false,
    isSubmitting: false,
    isPendingTokenChange: false,
    currentSplToken: null,
    transferDirection: {} as TransferDirection,
    tokenList: [] as SPLToken[]
  }),
  actions: {
    initStore() {
      const walletStore = useWalletsStore();

      this.setTrtansferDirection({
        direction: 'solana',
        from: walletStore.solanaWallet.publicKey.toBase58(),
        to: walletStore.neonWallet.address.toString()
      });
      this.setTokenList();

      this.isLoading = false;
    },
    setCurrentSplToken(symbol: string) {
      const walletStore = useWalletsStore();
      this.currentSplToken = this.tokenList.find(token => token.symbol === symbol) || null;

      if (this.currentSplToken) {
        walletStore.getTokenBalance(this.currentSplToken);
      }
    },
    setSplToken() {

    },
    setTrtansferDirection(direction: TransferDirection) {
      this.transferDirection = direction;
    },
    setIsSubmitting(isSubmitting: boolean) {
      this.isSubmitting = isSubmitting;
    },
    setIsPendingTokenChange(isPending: boolean) {
      this.isPendingTokenChange = isPending;
    },
    setInputAmount(amount: string) {
      this.amount = amount;
    },
    setError(error: boolean) {
      this.hasError = error;
    },
    setTokenList() {
      const web3Store = useWeb3Store();
      const transactionStore = useTransactionStore();

      this.tokenList = TOKEN_LIST.filter(i => supportedTokens.includes(i.symbol));

      if (web3Store.chainId === networkUrls[0].id) {
        this.tokenList.unshift({
          ...NEON_TOKEN_MODEL,
          address_spl: transactionStore.networkTokenMint.toBase58()
        });
      } else {
        const wSOL = this.tokenList.find(i => i.symbol === 'wSOL');
        this.tokenList.unshift({
          ...wSOL, ...SOL_TOKEN_MODEL,
          address_spl: transactionStore.networkTokenMint.toBase58()
        });
      }
    },
    handleDelay(timestamp: number): Promise<void> {
      return new Promise((resolve) => {
        setTimeout(() => resolve(), timestamp);
      });
    },
    async initTransfer() {
      const web3Store = useWeb3Store();
      const transactionStore = useTransactionStore();
      const walletSore = useWalletsStore();

      this.setIsSubmitting(true);

      if (this.transferDirection.direction === 'solana') {
        switch (this.currentSplToken?.symbol) {
          case 'NEON': {
            const transaction = await transactionStore.sendNeonTranaction();
            const solana = await transactionStore.sendTransaction(transaction);
            transactionStore.setSignature({ solana });
            break;
          }
          case 'SOL': {
            const transaction = await transactionStore.sendSolTransaction();
            const solana = await transactionStore.sendTransaction(transaction);
            transactionStore.setSignature({ solana });
            break;
          }
          case 'wSOL': {
            const transaction = await transactionStore.sendNeonMintTranaction();
            const solana = await transactionStore.sendTransaction(transaction);
            transactionStore.setSignature({ solana });
            break;
          }
          default: {
            const transaction = await transactionStore.sendNeonMintTranaction();
            const solana = await transactionStore.sendTransaction(transaction);
            transactionStore.setSignature({ solana });
            break;
          }
        }
      } else {
        const associatedToken = getAssociatedTokenAddressSync(transactionStore.mintPublicKey, walletSore.solanaWallet.publicKey);
        switch (this.currentSplToken?.symbol) {
          case 'NEON': {
            const transaction = await transactionStore.sendNeonWeb3Tranaction();
            const neon = await transactionStore.sendSignedTransaction(transaction);
            transactionStore.setSignature({ neon });
            break;
          }
          case 'SOL': {
            const transaction = await transactionStore.sendNeonWeb3Tranaction();
            const neon = await transactionStore.sendSignedTransaction(transaction);
            transactionStore.setSignature({ neon });
            break;
          }
          case 'wSOL': {
            let solana = ``;
            if (!(await web3Store.solanaConnection.getAccountInfo(associatedToken))) {
              const transaction = transactionStore.createAssociatedTokenAccountTransaction(associatedToken);
              solana = await transactionStore.sendTransaction(transaction);
              this.handleDelay(1e3);
            }
            const transaction = await transactionStore.sendMintNeonTransactionWeb3(associatedToken);
            const neon = await transactionStore.sendSignedTransaction(transaction);
            transactionStore.setSignature({ solana, neon });
            break;
          }
          default: {
            let solana = ``;
            if (!(await web3Store.solanaConnection.getAccountInfo(associatedToken))) {
              const transaction = transactionStore.createAssociatedTokenAccountTransaction(associatedToken);
              solana = await transactionStore.sendTransaction(transaction);
              this.handleDelay(1e3);
            }
            const transaction = await transactionStore.sendMintNeonTransactionWeb3(associatedToken);
            const neon = await transactionStore.sendSignedTransaction(transaction);
            transactionStore.setSignature({ solana, neon });
            break;
          }
        }
      }


      await this.handleDelay(1e3);
      await walletSore.setWalletBalance();
      await walletSore.setTokenBalance();
      await this.handleDelay(5e3);

      this.setIsSubmitting(false);
    }
  },
  getters: {
    inputAmount: state => state.amount,
    isSubmitDisabled: state => !state.amount || !state.currentSplToken || state.isSubmitting || state.hasError || state.isPendingTokenChange,
    isTransfering: state => state.isSubmitting,
    totalAmount: (state: IFormStore) => {
      const walletStore = useWalletsStore();
      const formStore = useFormStore();

      if (!state.currentSplToken) {
        return '';
      }

      const balance = walletStore.tokenBalance[state.transferDirection.direction];
      return `${balance.gt(0) ? balance.toFixed(3) : ''}${formStore.currentSplToken?.symbol ? ` ${formStore.currentSplToken.symbol}` : ''}`;
    },
    directionBalance: (state) => (position: 'from' | 'to') => {
      const walletSore = useWalletsStore();
      const web3Store = useWeb3Store();

      const evmToken = `${web3Store.networkUrl.token} NeonEVM`;
      const solana = `SOL Solana`;

      switch (position) {
        case 'from': {
          const token = state.transferDirection.direction === 'solana' ? solana : evmToken;
          return `${walletSore.walletBalance[state.transferDirection.direction].toFixed(3)} ${token}`;
        }
        case 'to': {
          const to = state.transferDirection.direction === 'solana' ? 'neon' : 'solana';
          const token = state.transferDirection.direction === 'solana' ? evmToken : solana;
          return `${walletSore.walletBalance[to].toFixed(3)} ${token}`;
        }
      }
    }

  }
});
