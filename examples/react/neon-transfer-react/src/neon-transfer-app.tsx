import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Connection, Keypair, PublicKey, Signer } from '@solana/web3.js';
import {
  InstructionParams,
  MintPortal,
  NEON_STATUS_DEVNET_SNAPSHOT,
  NEON_TRANSFER_CONTRACT_DEVNET,
  NeonPortal,
  NeonProxyRpcApi,
  SPLToken
} from 'neon-portal';
import { decode } from 'bs58';
import Web3 from 'web3';
import {
  delay,
  mintTokenBalance,
  NEON_DEVNET,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalance,
  neonSignature,
  sendSignedTransaction,
  sendTransaction,
  SOLANA_DEVNET,
  SOLANA_PRIVATE,
  solanaBalance,
  solanaSignature,
  splTokenBalance,
  stringShort,
  TOKEN_LIST,
  toSigner
} from './utils';
import { TransferDirection } from './models';

const urls = process.env.REACT_APP_URLS ? JSON.parse(process.env.REACT_APP_URLS) : {
  solanaRpcApi: 'https://api.devnet.solana.com',
  neonProxyRpcApi: 'https://devnet.neonevm.org'
};

function NeonTransferApp() {
  // connect solana/neon networks
  const connection = useMemo(() => {
    return new Connection(SOLANA_DEVNET, 'confirmed');
  }, []);
  const web3 = useMemo(() => {
    return new Web3(NEON_DEVNET);
  }, []);

  const proxyApi = useMemo(() => {
    return new NeonProxyRpcApi(urls);
  }, []);

  // add account and keypayer
  const solanaWallet = useMemo(() => {
    return Keypair.fromSecretKey(decode(SOLANA_PRIVATE));
  }, []);

  const neonWallet = useMemo(() => {
    return web3.eth.accounts.privateKeyToAccount(NEON_PRIVATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [token, setToken] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<{ neon: string, solana: string }>({
    neon: '0',
    solana: '0'
  });
  const [walletBalance, setWalletBalance] = useState<{ neon: string, solana: string }>({
    neon: '0',
    solana: '0'
  });
  const [amount, setAmount] = useState<string>('0.1');
  const [transfer, setTransfer] = useState<TransferDirection>({
    direction: 'solana',
    from: solanaWallet.publicKey.toBase58(),
    to: neonWallet.address.toString()
  });
  const [signature, setSignature] = useState<{ neon?: string, solana?: string }>({
    solana: '',
    neon: ''
  });
  const [submitDisable, setSubmitDisable] = useState<boolean>(false);

  const options: InstructionParams = useMemo(() => {
    return {
      connection,
      solanaWalletAddress: solanaWallet.publicKey,
      neonWalletAddress: neonWallet.address,
      neonContractAddress: NEON_TRANSFER_CONTRACT_DEVNET,
      proxyApi,
      proxyStatus: NEON_STATUS_DEVNET_SNAPSHOT,
      web3
    };
  }, [connection, neonWallet.address, proxyApi, solanaWallet.publicKey, web3]);

  const neonPortal = useMemo(() => {
    return new NeonPortal(options);
  }, [options]);

  const mintPortal = useMemo(() => {
    return new MintPortal(options);
  }, [options]);

  const tokenList = useMemo<SPLToken[]>(() => {
    const supported = ['wSOL', 'USDT', 'USDC'];
    const tokens = TOKEN_LIST.filter(i => supported.includes(i.symbol));
    tokens.unshift({ ...NEON_TOKEN_MODEL, address_spl: options.proxyStatus.NEON_TOKEN_MINT });
    return tokens;
  }, [options.proxyStatus.NEON_TOKEN_MINT]);

  const splToken = useMemo(() => {
    const index = tokenList.findIndex(i => i.symbol === token);
    if (index > -1) {
      return tokenList[index];
    }
    return null;
  }, [token, tokenList]);

  const disabled = useMemo(() => {
    const balance = tokenBalance[transfer.direction];
    return submitDisable || parseInt(balance) === 0 || parseInt(amount) > parseInt(balance);
  }, [amount, submitDisable, tokenBalance, transfer.direction]);

  const handleSelect = (event: any): any => {
    setToken(event.target.value);
    setSignature({});
  };

  const handleAmount = (event: any): any => {
    setAmount(event.target.value);
    setSignature({});
  };

  const handleTransferDirection = (): any => {
    const isSolanaDirection = transfer.direction === 'solana';
    const changeDirection: TransferDirection = {
      direction: isSolanaDirection ? 'neon' : 'solana',
      from: isSolanaDirection ? neonWallet.address.toString() : solanaWallet.publicKey.toBase58(),
      to: isSolanaDirection ? solanaWallet.publicKey.toBase58() : neonWallet.address.toString()
    };
    setTransfer(changeDirection);
    setSignature({});
  };

  const getWalletBalance = useCallback(async () => {
    const solana = await solanaBalance(connection, solanaWallet.publicKey);
    const neon = await neonBalance(web3, neonWallet.address);
    setWalletBalance({ solana: solana.toFixed(3), neon: neon.toFixed(3) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const directionBalance = (position: 'from' | 'to'): string => {
    switch (position) {
      case 'from': {
        const token = transfer.direction === 'solana' ? 'SOL' : 'NEON';
        return `${walletBalance[transfer.direction]} ${token}`;
      }
      case 'to': {
        const to = transfer.direction === 'solana' ? 'neon' : 'solana';
        const token = transfer.direction === 'solana' ? 'NEON' : 'SOL';
        return `${walletBalance[to]} ${token}`;
      }
    }
  };

  const getTokenBalance = useCallback(async () => {
    if (splToken) {
      switch (splToken.symbol) {
        case 'NEON': {
          const solana = await splTokenBalance(connection, solanaWallet.publicKey, splToken);
          const neon = await neonBalance(web3, neonWallet.address);
          setTokenBalance({
            solana: solana.uiAmountString ?? '0',
            neon: neon.toString()
          });
          break;
        }
        case 'wSOL': {
          const address = new PublicKey(splToken.address_spl);
          const associatedToken = mintPortal.getAssociatedTokenAddress(address, mintPortal.solanaWalletPubkey);
          const solana = await solanaBalance(connection, associatedToken);
          const neon = await mintTokenBalance(web3, neonWallet.address, splToken);
          setTokenBalance({
            solana: solana.toString(),
            neon: neon.toString()
          });
          break;
        }
        default: {
          const solana = await splTokenBalance(connection, solanaWallet.publicKey, splToken);
          const neon = await mintTokenBalance(web3, neonWallet.address, splToken);
          setTokenBalance({
            solana: solana.uiAmountString ?? '0',
            neon: neon.toString()
          });
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splToken]);

  const handleSubmit = useCallback(async () => {
    if (token && splToken) {
      setSubmitDisable(true);
      const solanaSigner: Signer = toSigner(solanaWallet);
      if (transfer.direction === 'solana') {
        switch (splToken.symbol) {
          case 'NEON': {
            const transaction = await neonPortal.neonTransferTransaction(amount, splToken!);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
          case 'wSOL': {
            const transaction = await mintPortal.neonTransferTransaction(amount, splToken);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
          default: {
            const transaction = await mintPortal.neonTransferTransaction(amount, splToken);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
        }
      } else {
        switch (splToken.symbol) {
          case 'NEON': {
            const transaction = neonPortal.ethereumTransaction(amount, splToken);
            transaction['gas'] = await web3.eth.estimateGas(transaction);
            transaction['gasPrice'] = await web3.eth.getGasPrice();
            // @ts-ignore
            transaction['gasLimit'] = 5e4;
            const neon = await sendSignedTransaction(web3, transaction, neonWallet);
            setSignature({ neon });
            break;
          }
          case 'wSOL': {
            const mintPubkey = new PublicKey(splToken.address_spl);
            const associatedToken = mintPortal.getAssociatedTokenAddress(mintPubkey, solanaWallet.publicKey);
            const solanaTransaction = await mintPortal.solanaTransferTransaction(solanaWallet.publicKey, mintPubkey, associatedToken);
            const neonTransaction = await mintPortal.createNeonTransaction(neonWallet.address, associatedToken, splToken, amount);
            // @ts-ignore
            neonTransaction['gasLimit'] = 5e4;
            neonTransaction.nonce = (await web3.eth.getTransactionCount(neonWallet.address));
            const solana = await sendTransaction(connection, solanaTransaction, [solanaSigner], true, { skipPreflight: false });
            delay(1e3);
            const neon = await sendSignedTransaction(web3, neonTransaction, neonWallet);
            setSignature({ solana, neon });
            break;
          }
          default: {
            const mintPubkey = new PublicKey(splToken.address_spl);
            const associatedTokenPubkey = mintPortal.getAssociatedTokenAddress(mintPubkey, solanaWallet.publicKey);
            const solanaTransaction = await mintPortal.solanaTransferTransaction(solanaWallet.publicKey, mintPubkey, associatedTokenPubkey);
            const neonTransaction = await mintPortal.createNeonTransaction(neonWallet.address, associatedTokenPubkey, splToken, amount);
            // @ts-ignore
            neonTransaction['gasLimit'] = 5e4;
            neonTransaction.nonce = (await web3.eth.getTransactionCount(neonWallet.address));
            const solana = await sendTransaction(connection, solanaTransaction, [solanaSigner], true, { skipPreflight: false });
            delay(1e3);
            const neon = await sendSignedTransaction(web3, neonTransaction, neonWallet);
            setSignature({ solana, neon });
            break;
          }
        }
      }
      await delay(1e3);
      await getTokenBalance();
      await getWalletBalance();
      await delay(5e3);
      setSubmitDisable(false);
    }
  }, [token, splToken, solanaWallet, transfer.direction, getTokenBalance, getWalletBalance, neonPortal, amount, connection, mintPortal, web3, neonWallet]);

  useEffect(() => {
    getTokenBalance();
    getWalletBalance();
  }, [getTokenBalance, getWalletBalance, splToken]);

  return (
    <div className='form-content'>
      <h1 className='title-1'>
        <i className='logo'></i>
        <div className='flex flex-row justify-between w-full'>
          <span>Neon transfer</span>
          <span className='text-[18px]'>React demo</span>
        </div>
      </h1>
      <form className='form mb-[20px]'>
        <div className='form-field'>
          <div className='flex flex-row gap-[8px] items-end'>
            <div>
              <label htmlFor='select' className='form-label flax flex-row justify-between'>
                <span>From</span>
                <span>({directionBalance('from')})</span>
              </label>
              <input value={transfer.from} className='form-input' disabled={true}></input>
            </div>
            <div>
              <button className='icon-button' type='button'
                      onClick={handleTransferDirection}></button>
            </div>
            <div>
              <label htmlFor='select' className='form-label flax flex-row justify-between'>
                <span>To</span>
                <span>({directionBalance('to')})</span>
              </label>
              <input value={transfer.to} className='form-input' disabled={true}></input>
            </div>
          </div>
        </div>
        <div className='form-field'>
          <label htmlFor='select' className='form-label'>Select token</label>
          <select value={token} onChange={handleSelect} className='form-select'
                  placeholder='Select token' disabled={submitDisable}>
            <option value='' disabled={true}>Select Token</option>
            {tokenList.map((i, k) =>
              <option value={i.symbol} key={k}>{i.name} ({i.symbol})</option>)}
          </select>
        </div>
        <div className='form-field'>
          <label htmlFor='select' className='form-label flex flex-row justify-between'>
            <span>Amount</span>
            <span>{tokenBalance[transfer.direction]} {token}</span>
          </label>
          <input value={amount} onInput={handleAmount} className='form-input' placeholder='0'
                 disabled={true}></input>
        </div>
        <button type='button' className='form-button' onClick={handleSubmit}
                disabled={disabled}>Submit
        </button>
      </form>
      {(signature.solana || signature.neon) &&
        <div className='flex flex-col gap-[10px] p-[12px] bg-[#282230] rounded-[12px] truncate'>
          {signature.solana && <a href={solanaSignature(signature.solana)} target='_blank'
                                  rel='noreferrer'>Solana: {stringShort(signature.solana, 40)}</a>}
          {signature.neon && <a href={neonSignature(signature.neon)} target='_blank'
                                rel='noreferrer'>Neon: {stringShort(signature.neon, 40)}</a>}
        </div>}
    </div>
  );
}

export default NeonTransferApp;
