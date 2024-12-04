<script setup lang="ts">
import { onBeforeMount, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useFormStore, useTransactionStore, useWalletsStore, useWeb3Store } from '@/stores';
import { networkUrls, stringShort } from '@/utils';
import useNeonWallet from '@/composables/useNeonWallet';

import type { TransferDirection } from '@/types';

const web3Store = useWeb3Store();
const walletsStore = useWalletsStore();
const formStore = useFormStore();
const transactionStore = useTransactionStore();

const { solanaWallet, neonWallet } = storeToRefs(walletsStore);
const {
  inputAmount,
  currentSplToken,
  transferDirection,
  directionBalance,
  isSubmitDisabled,
  isSubmitting,
  isTransfering,
  totalAmount,
  isLoading,
  tokenList
} = storeToRefs(formStore);

const { signature, solanaSignature, neonSignature } = storeToRefs(transactionStore);

const { initNeonWallet } = useNeonWallet();

const handleEvmNetworkSelect = (event: any): any => {
  web3Store.setChainId(Number(event.target.value));
  transactionStore.setNetworkTokenMint();
  formStore.setTokenList();
  formStore.setCurrentSplToken('');
  transactionStore.setSignature({});
  walletsStore.setTokenBalance();
};
const handleTransferDirection = () => {
  const isSolanaDirection = transferDirection.value.direction === 'solana';
  const changeDirection: TransferDirection = {
    direction: isSolanaDirection ? 'neon' : 'solana',
    from: isSolanaDirection
      ? neonWallet.value.address.toString()
      : solanaWallet.value.publicKey.toBase58(),
    to: isSolanaDirection
      ? solanaWallet.value.publicKey.toBase58()
      : neonWallet.value.address.toString()
  };
  formStore.setTransferDirection(changeDirection);
  transactionStore.setSignature({});
};
const handleSelect = (event: Event) => {
  const { value } = event.target as HTMLInputElement;

  formStore.setCurrentSplToken(value);
  transactionStore.setMintPublicKey();
  transactionStore.setSignature({});
};
const handleSubmit = () => {
  web3Store.setSigner();
  formStore.initTransfer();
};

const handleAmountChange = (event: Event) => {
  const { value } = event.target as HTMLInputElement;

  formStore.setInputAmount(value);
  transactionStore.setSignature({});
};

onBeforeMount(async () => {
  await web3Store.initStore();
  await walletsStore.initStore();
  await transactionStore.initStore();
  formStore.initStore();
});

onMounted(() => {
  initNeonWallet();
});
</script>

<template>
  <div v-if="isLoading" className="w-screen h-screen flex justify-center items-center">
    <div className="icon-loader" />
  </div>
  <div v-else className="form-content">
    <h1 className="title-1">
      <i className="logo"></i>
      <div className="flex flex-row items-center justify-between w-full">
        <select @change="handleEvmNetworkSelect" className="evm-select" :disabled="isTransfering">
          <option v-for="url in networkUrls" :key="url.id" :value="url.id">
            {{ url.token }} transfer
          </option>
        </select>
        <span className="text-[18px]">Vue demo</span>
      </div>
      <a
        href="https://github.com/neonlabsorg/neon-client-transfer/tree/master/examples/neon-transfer-react"
        target="_blank"
        rel="noreferrer"
      >
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
            <input :value="transferDirection.from" className="form-input text-ellipsis" disabled />
          </div>
          <div>
            <button className="icon-button" type="button" @click="handleTransferDirection"></button>
          </div>
          <div>
            <label htmlFor="select" className="form-label flax flex-row justify-between">
              <span>To</span>
              <span>{{ directionBalance('to') }}</span>
            </label>
            <input :value="transferDirection.to" className="form-input text-ellipsis" disabled />
          </div>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="select" className="form-label">Select token</label>
        <select
          :value="currentSplToken?.symbol"
          @change="handleSelect"
          className="form-select"
          :disabled="isTransfering"
        >
          <option value="" disabled>Select Token</option>
          <option v-for="token in tokenList" :value="token.symbol" :key="token.name">
            {{ `${token.symbol}` }}
          </option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="select" className="form-label flex flex-row justify-between">
          <span>Amount</span>
          <span>{{ totalAmount }}</span>
        </label>
        <input
          type="number"
          :value="inputAmount"
          @input="handleAmountChange"
          className="form-input"
          placeholder="0"
        />
      </div>
      <button
        type="button"
        className="form-button"
        @click="handleSubmit"
        :disabled="isSubmitDisabled"
      >
        <span v-if="!isSubmitting">Transfer</span>
        <span v-if="isSubmitting" className="icon-loader"></span>
      </button>
    </form>
    <div
      v-show="signature.solana || signature.neon"
      className="flex flex-col gap-[10px] p-[12px] bg-[#282230] rounded-[12px] truncate"
    >
      <a v-show="signature.solana" :href="solanaSignature" target="_blank" rel="noreferrer"
        >Solana: {{ stringShort(signature.solana, 40) }}</a
      >
      <a v-show="signature.neon" :href="neonSignature" target="_blank" rel="noreferrer"
        >Neon: {{ stringShort(signature.neon, 40) }}</a
      >
    </div>
  </div>
</template>
