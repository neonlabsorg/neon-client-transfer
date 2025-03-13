import { defineStore } from 'pinia';
import type { TokenAmount } from '@solana/web3.js';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { SPLToken } from '@neonevm/token-transfer-core';
import { erc20Abi, NEON_TOKEN_MINT_DECIMALS, signerPrivateKey } from '@neonevm/token-transfer-core';
import { Contract } from 'ethers';
import bs58 from 'bs58';
import { Big } from 'big.js';
import { Wallet as EthersWallet } from 'ethers';
import { toRaw } from 'vue';

import { SOLANA_PRIVATE } from '@/utils';
import { useFormStore, useWeb3Store } from '@/stores';
import type { TokenBalance } from '@/types';
import type { Wallet } from 'ethers';

interface IWalletStore {
  isLoading: boolean;
  walletBalance: TokenBalance;
  tokenBalance: TokenBalance;
  neonWallet: Wallet;
  neonBalance: Big;
  solanaWallet: Keypair;
  solanaWalletSigner: Wallet;
  solanaBalance: Big;
  splTokenBalance: TokenAmount;
}

const BIG_ZERO = new Big(0);

export const useWalletsStore = defineStore('wallets', {
  state: (): IWalletStore => ({
    isLoading: false,
    walletBalance: {
      solana: BIG_ZERO,
      neon: BIG_ZERO
    } as TokenBalance,
    tokenBalance: {
      solana: BIG_ZERO,
      neon: BIG_ZERO
    } as TokenBalance,
    neonWallet: {} as Wallet,
    neonBalance: new Big(0),
    solanaWallet: {} as Keypair,
    solanaWalletSigner: {} as Wallet,
    solanaBalance: new Big(0),
    splTokenBalance: {} as TokenAmount
  }),
  actions: {
    async initStore() {
      this.isLoading = true;
      this.setSolanaWallet();
      this.setSolanaWalletSigner();
      await this.setWalletBalance();
      this.isLoading = false;
    },
    setSolanaWallet() {
      this.solanaWallet = Keypair.fromSecretKey(bs58.decode(SOLANA_PRIVATE));
    },
    setSolanaWalletSigner() {
      const web3Store = useWeb3Store();
      this.solanaWalletSigner = new EthersWallet(
        signerPrivateKey(this.solanaWallet.publicKey, this.neonWallet.address),
        toRaw(web3Store.ethersProvider)
      );
    },
    setNeonWallet(wallet: EthersWallet) {
      this.neonWallet = wallet; //Or use this signature: new EthersWallet(NEON_PRIVATE, toRaw(web3Store.ethersProvider))
    },
    updateWalletBalance(balance: TokenBalance) {
      this.walletBalance = balance;
    },
    updateTokenBalance(balance: TokenBalance) {
      this.tokenBalance = balance;
    },
    async setTokenBalance() {
      const solana = (await this.getSolanaBalance()) || BIG_ZERO;
      const neon = (await this.getNeonBalance()) || BIG_ZERO;

      this.tokenBalance = {
        solana,
        neon
      };
    },
    async setWalletBalance() {
      const solana = (await this.getSolanaBalance()) || BIG_ZERO;
      const neon = (await this.getNeonBalance()) || BIG_ZERO;

      this.walletBalance = {
        solana,
        neon
      };
    },
    async getTokenBalance(token: SPLToken) {
      const formStore = useFormStore();
      formStore.setIsPendingTokenChange(true);
      try {
        switch (token.symbol) {
          case 'NEON': {
            if (formStore.transferDirection.direction === 'solana') {
              const balance = await this.getSplTokenBalance(token);

              this.updateTokenBalance({
                ...this.tokenBalance,
                solana: new Big(balance?.amount).div(Math.pow(10, balance?.decimals))
              });
            } else {
              const balance = await this.getNeonBalance();

              this.updateTokenBalance({
                ...this.tokenBalance,
                neon: balance
              });
            }
            break;
          }
          case 'SOL': {
            const balance =
              formStore.transferDirection.direction === 'solana'
                ? await this.getSolanaBalance()
                : await this.getMintTokenBalance();

            formStore.setError(false);
            const newBalance = { ...this.tokenBalance };
            newBalance[formStore.transferDirection.direction] = balance;
            this.updateTokenBalance(newBalance);
            break;
          }
          case 'wSOL': {
            const address = new PublicKey(token?.address_spl);
            const associatedToken = getAssociatedTokenAddressSync(
              address,
              this.solanaWallet.publicKey
            );

            const balance =
              formStore.transferDirection.direction === 'solana'
                ? await this.getSolanaBalance(associatedToken)
                : await this.getMintTokenBalance();

            formStore.setError(false);
            const newBalance = { ...this.tokenBalance };
            newBalance[formStore.transferDirection.direction] = balance;
            this.updateTokenBalance(newBalance);
            break;
          }
          default: {
            if (formStore.transferDirection.direction === 'solana') {
              const solana = await this.getSplTokenBalance(token);

              this.updateTokenBalance({
                ...this.tokenBalance,
                solana: new Big(solana.amount).div(Math.pow(10, solana.decimals))
              });
            } else {
              const neon = await this.getMintTokenBalance();
              formStore.setError(false);
              this.updateTokenBalance({
                ...this.tokenBalance,
                neon
              });
            }

            break;
          }
        }
      } catch (e) {
        console.error(`Can't fetch ${token.symbol} balance`, e);
        formStore.setError(true);
      }

      formStore.setIsPendingTokenChange(false);
    },

    async getMintTokenBalance(contractAbi: any = erc20Abi): Promise<Big> {
      const formStore = useFormStore();
      const rawWallet = toRaw(this.neonWallet);

      const tokenInstance = new Contract(
        formStore.currentSplToken?.address,
        contractAbi,
        rawWallet
      );

      Big.DP = 18;
      Big.RM = Big.roundDown; //Set round mode and precision to avoid 19999999 to be rounded to 10

      const balance: number = await tokenInstance.balanceOf(rawWallet.address);
      return new Big(balance.toString()).div(new Big(10).pow(formStore.currentSplToken?.decimals));
    },

    async getSolanaBalance(address?: PublicKey) {
      const web3Store = useWeb3Store();
      const publicKey = address || this.solanaWallet?.publicKey;

      try {
        const balance = await web3Store.solanaConnection.getBalance(publicKey);

        return new Big(balance).div(LAMPORTS_PER_SOL);
      } catch (e) {
        console.log(e);
      }
    },
    async getNeonBalance() {
      const web3Store = useWeb3Store();
      try {
        const provider = toRaw(web3Store.ethersProvider);
        const balance = await provider.getBalance(this.neonWallet);
        return Big(balance.toString()).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
      } catch (e) {
        console.log(e);
      }
    },
    async getSplTokenBalance(token: SPLToken) {
      const web3Store = useWeb3Store();
      const mintAccount = new PublicKey(token.address_spl);
      const assocTokenAccountAddress = await getAssociatedTokenAddress(
        mintAccount,
        this.solanaWallet.publicKey
      );
      const response = await web3Store.solanaConnection.getTokenAccountBalance(
        assocTokenAccountAddress
      );

      return response?.value;
    }
  },
  getters: {
    getWalletBalance: (state) => ({
      solana: state.solanaBalance,
      neon: state.neonBalance
    })
  }
});
