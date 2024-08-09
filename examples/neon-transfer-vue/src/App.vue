<script setup lang="ts">
import { onMounted } from 'vue';
import { 
  networkUrls,
  supportedTokens,
} from './utils';

import { useWeb3Store, useWalletsStore, useFormStore } from '@/stores'

const web3Store = useWeb3Store()
const walletsStore = useWalletsStore()
const formStore = useFormStore()

const { solanaWallet, neonWallet } = walletsStore

const { currentToken } = formStore

const submitDisable = false
const disabled = true

const handleEvmNetworkSelect = () => {}
const handleTransferDirection = () => {}
const handleSelect = (event: Event) => {
  const { value } = event.target as HTMLInputElement

  formStore.setCurrentToken(value)
}
const handleSubmit = () => {}
const handleAmount = () => {}

onMounted(() => {
  web3Store.initStore()
  walletsStore.initStore()
})
</script>

<template>
 <div className="form-content">
      <h1 className="title-1">
        <i className="logo"></i>
        <div className="flex flex-row items-center justify-between w-full">
          <select @change='handleEvmNetworkSelect' className="evm-select" :disabled="submitDisable">
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
                <span>({directionBalance('from')})</span>
              </label>
              <input value={transfer.from} className="form-input" disabled />
            </div>
            <div>
              <button className="icon-button" type="button" @click='handleTransferDirection'></button>
            </div>
            <div>
              <label htmlFor="select" className="form-label flax flex-row justify-between">
                <span>To</span>
                <span>({directionBalance('to')})</span>
              </label>
              <input value={transfer.to} className="form-input" disabled />
            </div>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="select" className="form-label">Select token</label>
          <select :value="currentToken" @change="handleSelect" className="form-select" :disabled="submitDisable">
            <option value="" disabled>Select Token</option>
            {tokenList.map((i, k) =>
              <option value={i.symbol} key={k}>{i.name} ({i.symbol})</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="select" className="form-label flex flex-row justify-between">
            <span>Amount</span>
            <span>{amountView}</span>
          </label>
          <input value={amount} @input="handleAmount" className="form-input" placeholder="0" disabled />
        </div>  
        <button type="button" className="form-button" @click="handleSubmit" :disabled="disabled">
          Submit
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
