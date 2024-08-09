import { defineStore } from "pinia";
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { NEON_TOKEN_MINT_DECIMALS, signerPrivateKey } from '@neonevm/token-transfer-core';
import { DEFAULT_RETURN_FORMAT } from 'web3-types';
import { getBalance } from 'web3-eth';
import { Web3Context } from 'web3-core';
import { decode } from 'bs58';
import { Big } from 'big.js'

import { NEON_PRIVATE, SOLANA_PRIVATE } from '@/utils'
import { useWeb3Store } from "./web3";

import type { ReturnFormat } from '@neonevm/token-transfer-web3';
import type { Web3Account } from "web3-eth-accounts";

interface IWalletStore {
    neonWallet: Web3Account,
    neonBalance: Big,
    solanaWallet: Keypair,
    solanaBalance: Big,
    solanaConnection: Connection,
    splTokenBalance: Big,
}

export const useWalletsStore = defineStore('wallets', {
    state: (): IWalletStore => ({
        neonWallet: {} as Web3Account,
        neonBalance: new Big(0),
        solanaWallet: {} as Keypair,
        solanaConnection: {} as Connection,
        solanaBalance: new Big(0),
        splTokenBalance: new Big(0)
    }),
    actions: {
        initStore() {
            this.setNeonWallet()
            this.setSolanaWallet()
            this.setSolanaConnection()
            this.updateSolanaBalance()
            this.updateNeonBalance()
        },
        setSolanaWallet() {
            this.solanaWallet = Keypair.fromSecretKey(decode(SOLANA_PRIVATE));
        },
        setNeonWallet() {
            const web3Store = useWeb3Store()

            this.neonWallet = web3Store.web3Provider?.eth.accounts.privateKeyToAccount(NEON_PRIVATE);
        },
        setSolanaConnection() {
            const web3Store = useWeb3Store()

            this.solanaConnection = new Connection(web3Store.networkUrl?.solana || '', 'confirmed')
        },
        async updateSolanaBalance() {
            try {
                const balance = await this.solanaConnection.getBalance(this.solanaWallet?.publicKey);

                this.solanaBalance = new Big(balance).div(LAMPORTS_PER_SOL);
            } catch (e) {
                console.log(e)
            }
        },
        async updateNeonBalance() {
            const web3Store = useWeb3Store()

            try {
                const balance = await getBalance(new Web3Context(web3Store.networkUrl.neonProxy), this.neonWallet.address, undefined, DEFAULT_RETURN_FORMAT as ReturnFormat);

                this.neonBalance = Big(balance.toString()).div(Big(10).pow(NEON_TOKEN_MINT_DECIMALS));
            } catch (e) {
                console.log(e)
            }
        },
    },
    getters: {
        solanaWalletSigner: (state: IWalletStore) => { 
            const web3Store = useWeb3Store()

            return web3Store.web3Provider.eth.accounts.privateKeyToAccount(signerPrivateKey(state.solanaWallet.publicKey, state.neonWallet.address));
        }
    }
})