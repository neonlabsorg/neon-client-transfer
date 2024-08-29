<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { storeToRefs } from 'pinia'
import { useWeb3Store, useWalletsStore, useFormStore, useTransactionStore } from '@/stores'
import { networkUrls } from './utils';

import type { TransferDirection } from '@/types';

const web3Store = useWeb3Store()
const walletsStore = useWalletsStore()
const formStore = useFormStore()
const transactionStore = useTransactionStore()

const { solanaWallet, neonWallet } = storeToRefs(walletsStore)
const { 
  inputAmount,
  currentSplToken, 
  transferDirection, 
  directionBalance, 
  isSubmitDisabled,
  isTransfering,
  totalAmount,
  isLoading, 
  tokenList 
} = storeToRefs(formStore)

const handleEvmNetworkSelect = (event: any): any => {
  web3Store.setChainId(Number(event.target.value));
  transactionStore.setNetworkTokenMint()
  formStore.setTokenList()
  formStore.setCurrentSplToken('');
  walletsStore.setSignature({});
  // walletsStore.setTokenBalance({ solana: BIG_ZERO, neon: BIG_ZERO });
};
const handleTransferDirection = () => {
  const isSolanaDirection = transferDirection.value.direction === 'solana';
  const changeDirection: TransferDirection = {
    direction: isSolanaDirection ? 'neon' : 'solana',
    from: isSolanaDirection ? neonWallet.value.address.toString() : solanaWallet.value.publicKey.toBase58(),
    to: isSolanaDirection ? solanaWallet.value.publicKey.toBase58() : neonWallet.value.address.toString()
  };
  formStore.setTrtansferDirection(changeDirection);
  walletsStore.setSignature({});
}
const handleSelect = (event: Event) => {
  const { value } = event.target as HTMLInputElement

  formStore.setCurrentSplToken(value)
  transactionStore.setMintPublicKey()
}
const handleSubmit = () => {
  web3Store.setSigner()
  formStore.initTransfer()
}

const handleAmountChange = (event: Event) => {
  const { value } = event.target as HTMLInputElement

  formStore.setInputAmount(value);
  walletsStore.setSignature({});
}

onBeforeMount(async () => {
  await web3Store.initStore()
  await walletsStore.initStore()
  await transactionStore.initStore()
  formStore.initStore()
})
</script>

<template>
  <div v-if="isLoading" className="w-screen h-screen flex justify-center items-center">
    <div className="icon-loader" />
  </div>
  <div v-else className="form-content">
    <h1 className="title-1">
      <i className="logo"></i>
      <div className="flex flex-row items-center justify-between w-full">
        <select @change='handleEvmNetworkSelect' className="evm-select" :disabled="isTransfering">
          <option v-for="url in networkUrls" :key="url.id" :value="url.id">
            {{ url.token }} transfer
          </option>
        </select>
        <span className="text-[18px]">Vue demo</span>
      </div>
      <a
        href="https://github.com/neonlabsorg/neon-client-transfer/tree/master/examples/neon-transfer-react"
        target="_blank" rel="noreferrer">
        <i className="github"></i>
      </a>
    </h1>
    <form className="form mb-[20px]">
      <div className="form-field">
        <div className="flex flex-row gap-[8px] items-end">
          <div>
            <label htmlFor="select" className="form-label flax flex-row justify-between">
              <span>From</span>
              <span>{{ directionBalance('from') }}</span>
            </label>
            <input :value='transferDirection.from' className="form-input text-ellipsis" disabled />
          </div>
          <div>
            <button className="icon-button" type="button" @click='handleTransferDirection'></button>
          </div>
          <div>
            <label htmlFor="select" className="form-label flax flex-row justify-between">
              <span>To</span>
              <span>{{ directionBalance('to') }}</span>
            </label>
            <input :value='transferDirection.to' className="form-input text-ellipsis" disabled />
          </div>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="select" className="form-label">Select token</label>
        <select :value="currentSplToken?.symbol" @change="handleSelect" className="form-select" :disabled="isTransfering">
          <option value="" disabled>Select Token</option>
          <option v-for="token in tokenList" :value="token.symbol" :key="token.name">
            {{ `${token.name} ${token.symbol}` }}
          </option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="select" className="form-label flex flex-row justify-between">
          <span>Amount</span>
          <span>{{ totalAmount }}</span>
        </label>
        <input type="number" :value="inputAmount" @input="handleAmountChange" className="form-input" placeholder="0" />
      </div>  
      <button type="button" className="form-button" @click="handleSubmit" :disabled="isSubmitDisabled">
        Transfer
      </button>
    </form>
    <!-- {(signature.solana || signature.neon) &&
      <div className="flex flex-col gap-[10px] p-[12px] bg-[#282230] rounded-[12px] truncate">
        {signature.solana && <a href={solanaSignature(signature.solana)} target="_blank"
                                rel="noreferrer">Solana: {stringShort(signature.solana, 40)}</a>}
        {signature.neon && <a href={neonSignature(signature.neon)} target="_blank"
                              rel="noreferrer">Neon: {stringShort(signature.neon, 40)}</a>}
      </div>} -->
  </div>
</template>
