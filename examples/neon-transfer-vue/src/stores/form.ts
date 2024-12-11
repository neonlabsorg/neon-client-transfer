import { defineStore } from 'pinia';
import {
  NEON_TOKEN_MODEL,
  networkUrls,
  SOL_TOKEN_MODEL,
  supportedTokens,
  TOKEN_LIST
} from '@/utils';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import {
  neonTransferMintTransactionEthers,
  createMintNeonTransactionEthers,
  neonNeonTransactionEthers
} from '@neonevm/token-transfer-ethers';
import {
  createAssociatedTokenAccountTransaction,
  solanaSOLTransferTransaction,
  solanaNEONTransferTransaction,
  NEON_TRANSFER_CONTRACT_DEVNET,
  SOL_TRANSFER_CONTRACT_DEVNET
} from '@neonevm/token-transfer-core';

import { useTransactionStore, useWalletsStore, useWeb3Store } from '@/stores';

import type { TransferDirection } from '@/types';
import type { SPLToken } from '@neonevm/token-transfer-core';
import { JsonRpcProvider } from 'ethers';
import { toRaw } from 'vue';

interface IFormStore {
  amount: string;
  isLoading: boolean;
  isPendingTokenChange: boolean;
  isSubmitting: boolean;
  hasError: boolean;
  currentSplToken: SPLToken | null;
  tokenList: SPLToken[];
  transferDirection: TransferDirection;
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

      this.setTransferDirection({
        direction: 'solana',
        from: walletStore.solanaWallet.publicKey.toBase58(),
        to: walletStore.neonWallet.address.toString()
      });
      this.setTokenList();

      this.isLoading = false;
    },
    setCurrentSplToken(symbol: string) {
      const walletStore = useWalletsStore();
      this.currentSplToken = this.tokenList.find((token) => token.symbol === symbol) || null;

      if (this.currentSplToken) {
        walletStore.getTokenBalance(this.currentSplToken);
      }
    },
    setTransferDirection(direction: TransferDirection) {
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

      this.tokenList = TOKEN_LIST.filter((i) => supportedTokens.includes(i.symbol));

      if (web3Store.chainId === networkUrls[0].id) {
        this.tokenList.unshift({
          ...NEON_TOKEN_MODEL,
          address_spl: transactionStore.networkTokenMint.toBase58()
        });
      } else {
        const wSOL = this.tokenList.find((i) => i.symbol === 'wSOL');
        this.tokenList.unshift({
          ...wSOL,
          ...SOL_TOKEN_MODEL,
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
      //TODO: Refactor this!!!
      //Get rid of the repeated code
      const web3Store = useWeb3Store();
      const transactionStore = useTransactionStore();
      const walletSore = useWalletsStore();

      this.setIsSubmitting(true);

      if (this.transferDirection.direction === 'solana') {
        const transactionFunctions = {
          NEON: () =>
            solanaNEONTransferTransaction({
              solanaWallet: walletSore.solanaWallet.publicKey,
              neonWallet: walletSore.neonWallet.address,
              neonEvmProgram: web3Store.neonProgram,
              neonTokenMint: transactionStore.networkTokenMint,
              token: this.currentSplToken,
              amount: this.amount,
              chainId: web3Store.chainId
            }),
          SOL: () =>
            solanaSOLTransferTransaction({
              connection: web3Store.solanaConnection,
              solanaWallet: walletSore.solanaWallet.publicKey,
              neonWallet: walletSore.neonWallet.address,
              neonEvmProgram: web3Store.neonProgram,
              neonTokenMint: transactionStore.networkTokenMint,
              splToken: this.currentSplToken,
              amount: this.amount,
              chainId: web3Store.chainId
            }),
          DEFAULT: () =>
            //Used for all SPL token transaction (including wSOL)
            neonTransferMintTransactionEthers({
              connection: web3Store.solanaConnection,
              proxyApi: web3Store.apiProxy,
              neonEvmProgram: web3Store.neonProgram,
              solanaWallet: walletSore.solanaWallet.publicKey,
              neonWallet: walletSore.neonWallet.address,
              walletSigner: toRaw(walletSore.solanaWalletSigner),
              splToken: this.currentSplToken,
              amount: this.amount,
              chainId: web3Store.chainId
            })
        };

        const transactionFunction =
          transactionFunctions[this.currentSplToken.symbol as keyof typeof transactionFunctions] ||
          transactionFunctions.DEFAULT;
        await transactionStore.handleSolanaTransaction(transactionFunction);
      } else {
        const mintPubkey = new PublicKey(this.currentSplToken.address_spl);
        const associatedToken = getAssociatedTokenAddressSync(
          mintPubkey,
          walletSore.solanaWallet.publicKey
        );

        //Need to create associated token account for wSOL and other SPL tokens
        let solana = '';
        if (
          !['SOL', 'NEON'].includes(this.currentSplToken.symbol) &&
          !(await web3Store.solanaConnection.getAccountInfo(associatedToken))
        ) {
          const transaction = createAssociatedTokenAccountTransaction({
            solanaWallet: walletSore.solanaWallet.publicKey,
            tokenMint: mintPubkey,
            associatedToken
          });
          solana = await transactionStore.sendTransaction(transaction);
          this.handleDelay(1e3);
        }

        const transactionFunctions = {
          NEON: () => {
            console.log('asfsaf =', {
              provider: toRaw(web3Store.ethersProvider as JsonRpcProvider),
              from: walletSore.neonWallet.address,
              to: NEON_TRANSFER_CONTRACT_DEVNET,
              solanaWallet: walletSore.solanaWallet.publicKey,
              amount: this.amount
            });
            return neonNeonTransactionEthers({
              provider: toRaw(web3Store.ethersProvider as JsonRpcProvider),
              from: walletSore.neonWallet.address,
              to: NEON_TRANSFER_CONTRACT_DEVNET,
              solanaWallet: walletSore.solanaWallet.publicKey,
              amount: this.amount
            });
          },
          SOL: () =>
            neonNeonTransactionEthers({
              provider: toRaw(web3Store.ethersProvider as JsonRpcProvider),
              from: walletSore.neonWallet.address,
              to: SOL_TRANSFER_CONTRACT_DEVNET,
              solanaWallet: walletSore.solanaWallet.publicKey,
              amount: this.amount
            }),
          DEFAULT: () => {
            console.log('object = ', {
              provider: toRaw(web3Store.ethersProvider as JsonRpcProvider),
              neonWallet: walletSore.neonWallet.address,
              associatedToken,
              splToken: this.currentSplToken,
              amount: this.amount
            });
            return createMintNeonTransactionEthers({
              provider: toRaw(web3Store.ethersProvider as JsonRpcProvider),
              neonWallet: walletSore.neonWallet.address,
              associatedToken,
              splToken: this.currentSplToken,
              amount: this.amount
            });
          }
          //Used for all ERC20 token transaction (including wSOL)
        };

        const transaction = await (
          transactionFunctions[this.currentSplToken.symbol as keyof typeof transactionFunctions] ||
          transactionFunctions.DEFAULT
        )();
        const neon = await transactionStore.sendNeonTransaction(transaction);
        transactionStore.setSignature({ solana, neon });
      }

      await this.handleDelay(1e3);
      await walletSore.setWalletBalance();
      await walletSore.getTokenBalance(this.currentSplToken);
      await this.handleDelay(5e3);

      this.setIsSubmitting(false);
    }
  },
  getters: {
    inputAmount: (state) => state.amount,
    isSubmitDisabled: (state) =>
      !state.amount ||
      !state.currentSplToken ||
      state.isSubmitting ||
      state.hasError ||
      state.isPendingTokenChange,
    isTransfering: (state) => state.isSubmitting,
    totalAmount: (state: IFormStore) => {
      const walletStore = useWalletsStore();
      const formStore = useFormStore();

      if (!state.currentSplToken || state.isPendingTokenChange) {
        return '';
      }

      const balance = walletStore.tokenBalance[state.transferDirection.direction];
      return `${balance.gt(0) ? balance.toFixed(3) : ''}${
        formStore.currentSplToken?.symbol ? ` ${formStore.currentSplToken.symbol}` : ''
      }`;
    },
    directionBalance: (state) => (position: 'from' | 'to') => {
      const walletSore = useWalletsStore();
      const web3Store = useWeb3Store();

      const evmToken = `${web3Store.networkUrl.token} NeonEVM`;
      const solana = `SOL Solana`;

      switch (position) {
        case 'from': {
          const token = state.transferDirection.direction === 'solana' ? solana : evmToken;
          return `${walletSore.walletBalance[state.transferDirection.direction].toFixed(
            3
          )} ${token}`;
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
