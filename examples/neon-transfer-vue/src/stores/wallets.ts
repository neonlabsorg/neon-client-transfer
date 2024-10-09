import { defineStore } from 'pinia';
import type { TokenAmount } from '@solana/web3.js';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { SPLToken } from '@neonevm/token-transfer-core';
import { erc20Abi, NEON_TOKEN_MINT_DECIMALS, signerPrivateKey } from '@neonevm/token-transfer-core';
import type { ContractAbi } from 'web3-types';
import { DEFAULT_RETURN_FORMAT } from 'web3-types';
import { Contract } from 'web3-eth-contract';
import { getBalance } from 'web3-eth';
import { Web3Context } from 'web3-core';
import { decode } from 'bs58';
import { Big } from 'big.js';

import { NEON_PRIVATE, SOLANA_PRIVATE } from '@/utils';
import { useFormStore, useWeb3Store } from '@/stores';
import type { ReturnFormat } from '@neonevm/token-transfer-web3';
import type { Web3Account } from 'web3-eth-accounts';
import type { TokenBalance } from '@/types';

interface IWalletStore {
  isLoading: boolean,
  walletBalance: TokenBalance,
  tokenBalance: TokenBalance,
  neonWallet: Web3Account,
  neonBalance: Big,
  solanaWallet: Keypair,
  solanaWalletSigner: Web3Account,
  solanaBalance: Big,
  splTokenBalance: TokenAmount,
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
    neonWallet: {} as Web3Account,
    neonBalance: new Big(0),
    solanaWallet: {} as Keypair,
    solanaWalletSigner: {} as Web3Account,
    solanaBalance: new Big(0),
    splTokenBalance: {} as TokenAmount
  }),
  actions: {
    async initStore() {
      this.isLoading = true;
      this.setNeonWallet();
      this.setSolanaWallet();
      this.setSolanaWalletSigner();
      await this.setTokenBalance();
      await this.setWalletBalance();
      this.isLoading = false;
    },
    setSolanaWallet() {
      this.solanaWallet = Keypair.fromSecretKey(decode(SOLANA_PRIVATE));
    },
    setSolanaWalletSigner() {
      const web3Store = useWeb3Store();

      this.solanaWalletSigner = web3Store.web3Provider.eth.accounts.privateKeyToAccount(
        signerPrivateKey(this.solanaWallet.publicKey, this.neonWallet.address)
      );
    },
    setNeonWallet() {
      const web3Store = useWeb3Store();

      this.neonWallet = web3Store.web3Provider?.eth.accounts.privateKeyToAccount(NEON_PRIVATE);
    },
    updateWalletBalance(balance: TokenBalance) {
      this.walletBalance = balance;
    },
    updateTokenBalance(balance: TokenBalance) {
      this.tokenBalance = balance;
    },
    async setTokenBalance() {
      const solana = await this.getSolanaBalance() || BIG_ZERO;
      const neon = await this.getNeonBalance() || BIG_ZERO;

      this.tokenBalance = {
        solana,
        neon
      };
    },
    async setWalletBalance() {
      const solana = await this.getSolanaBalance() || BIG_ZERO;
      const neon = await this.getNeonBalance() || BIG_ZERO;

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
            const solana = await this.getSplTokenBalance(token);
            const neon = await this.getNeonBalance();

            formStore.setError(false);
            this.updateTokenBalance({
              solana: new Big(solana?.amount).div(Math.pow(10, solana?.decimals)),
              neon
            });
            break;
          }
          case 'SOL': {
            const solana = await this.getSolanaBalance();
            const neon = await this.getNeonBalance();

            formStore.setError(false);
            this.updateTokenBalance({ solana, neon });
            break;
          }
          case 'wSOL': {
            const address = new PublicKey(formStore.currentSplToken?.address_spl);
            const associatedToken = getAssociatedTokenAddressSync(address, this.solanaWallet.publicKey);
            const solana = await this.getSolanaBalance(associatedToken);
            const neon = await this.getMintTokenBalance();

            formStore.setError(false);
            this.updateTokenBalance({ solana, neon });
            break;
          }
          default: {
            const solana = await this.getSplTokenBalance(token);
            const neon = await this.getMintTokenBalance();

            formStore.setError(false);
            this.updateTokenBalance({
              solana: new Big(solana.amount).div(Math.pow(10, solana.decimals)),
              neon
            });
            break;
          }
        }
      } catch (e) {
        formStore.setError(true);
      }

      formStore.setIsPendingTokenChange(false);
    },

    async getMintTokenBalance(contractAbi: ContractAbi = erc20Abi as ContractAbi): Promise<Big> {
      const web3Store = useWeb3Store();
      const formStore = useFormStore();

      const tokenInstance = new Contract(
        contractAbi,
        formStore.currentSplToken?.address,
        new Web3Context(web3Store.networkUrl.neonProxy)
      );
      const balance: number = await tokenInstance.methods.balanceOf(this.neonWallet.address).call();
      return new Big(balance).div(Math.pow(10, formStore.currentSplToken?.decimals));
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
        const balance = await getBalance(
          new Web3Context(web3Store.networkUrl.neonProxy),
          this.neonWallet.address, undefined, DEFAULT_RETURN_FORMAT as ReturnFormat
        );

        return Big(balance.toString()).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
      } catch (e) {
        console.log(e);
      }
    },
    async getSplTokenBalance(token: SPLToken) {
      const web3Store = useWeb3Store();
      const mintAccount = new PublicKey(token.address_spl);
      const assocTokenAccountAddress = await getAssociatedTokenAddress(mintAccount, this.solanaWallet.publicKey);
      const response = await web3Store.solanaConnection.getTokenAccountBalance(assocTokenAccountAddress);

      return response?.value;
    }
    // async setSplTokenBalance(token: SPLToken) {
    //     const splTokenBalance = await this.getSplTokenBalance(token)

    //     this.splTokenBalance = splTokenBalance
    // }
  },
  getters: {
    getWalletBalance: (state) => ({
      solana: state.solanaBalance,
      neon: state.neonBalance
    })
  }
});
