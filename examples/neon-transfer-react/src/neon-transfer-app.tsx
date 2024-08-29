import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Connection, Keypair, PublicKey, Signer } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { JsonRpcProvider, Wallet } from 'ethers';
import {
  createAssociatedTokenAccountTransaction,
  GasToken,
  NEON_STATUS_DEVNET_SNAPSHOT,
  NEON_TOKEN_MINT_DEVNET,
  NEON_TRANSFER_CONTRACT_DEVNET,
  NeonProgramStatus,
  NeonProxyRpcApi,
  signerPrivateKey,
  SOL_TRANSFER_CONTRACT_DEVNET,
  solanaNEONTransferTransaction,
  solanaSOLTransferTransaction,
  SPLToken
} from '@neonevm/token-transfer-core';
import {
  createMintNeonTransactionEthers,
  neonNeonTransactionEthers,
  neonTransferMintTransactionEthers
} from '@neonevm/token-transfer-ethers';
import { decode } from 'bs58';
import { Big } from 'big.js';

import {
  CHAIN_ID,
  delay,
  mintTokenBalanceEthers,
  NEON_PRIVATE,
  NEON_TOKEN_MODEL,
  neonBalanceEthers,
  neonSignature,
  sendNeonTransaction,
  sendTransaction,
  SOL_TOKEN_MODEL,
  SOLANA_PRIVATE,
  solanaBalance,
  solanaSignature,
  splTokenBalance,
  stringShort,
  TOKEN_LIST,
  toSigner
} from './utils';
import { TokenBalance, TransferDirection, TransferSignature } from './models';

const BIG_ZERO = new Big(0);

const networkUrls = [{
  id: 245022926,
  token: 'NEON',
  solana: 'https://api.devnet.solana.com',
  neonProxy: 'https://devnet.neonevm.org'
}, {
  id: 245022927,
  token: 'SOL',
  solana: 'https://api.devnet.solana.com',
  neonProxy: 'https://devnet.neonevm.org/solana/sol'
}];

function NeonTransferApp() {
  const [token, setToken] = useState<string>('');
  const [chainId, setChainId] = useState<any>(CHAIN_ID);
  const [proxyStatus, setProxyStatus] = useState<NeonProgramStatus>(NEON_STATUS_DEVNET_SNAPSHOT);
  const [gasTokens, setGasTokens] = useState<GasToken[]>([]);

  // connect solana/neon networks
  const networkUrl = useMemo(() => {
    const id = networkUrls.findIndex(i => i.id === chainId);
    return id > -1 ? networkUrls[id] : networkUrls[0];
  }, [chainId]);
  const connection = useMemo(() => {
    return new Connection(networkUrl.solana, 'confirmed');
  }, [networkUrl]);

  const ethersProvider: any = useMemo(() => {
    return new JsonRpcProvider(networkUrl.neonProxy);
  }, [networkUrl]);

  const proxyApi = useMemo(() => {
    return new NeonProxyRpcApi(networkUrl.neonProxy);
  }, [networkUrl]);

  // add account and keypayer
  const solanaWallet = useMemo(() => {
    return Keypair.fromSecretKey(decode(SOLANA_PRIVATE));
  }, []);

  const neonWallet = useMemo(() => {
    return new Wallet(NEON_PRIVATE, ethersProvider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethersProvider]);

  const neonProgram = useMemo(() => {
    if (proxyStatus) {
      return new PublicKey(proxyStatus?.neonEvmProgramId!);
    }
    return new PublicKey(NEON_STATUS_DEVNET_SNAPSHOT.neonEvmProgramId);
  }, [proxyStatus]);

  const networkTokenMint = useMemo(() => {
    const id = gasTokens.findIndex(i => parseInt(i.tokenChainId, 16) === chainId);
    if (id > -1) {
      return new PublicKey(gasTokens[id].tokenMint);
    }
    return new PublicKey(NEON_TOKEN_MINT_DEVNET);
  }, [gasTokens, chainId]);

  const [tokenBalance, setTokenBalance] = useState<TokenBalance>({
    neon: BIG_ZERO,
    solana: BIG_ZERO
  });
  const [walletBalance, setWalletBalance] = useState<TokenBalance>({
    neon: BIG_ZERO,
    solana: BIG_ZERO
  });
  const [amount, setAmount] = useState<string>('0.1');
  const [transfer, setTransfer] = useState<TransferDirection>({
    direction: 'solana',
    from: solanaWallet.publicKey.toBase58(),
    to: neonWallet.address.toString()
  });
  const [signature, setSignature] = useState<Partial<TransferSignature>>({
    solana: '',
    neon: ''
  });
  const [submitDisable, setSubmitDisable] = useState<boolean>(false);

  const tokenList = useMemo<SPLToken[]>(() => {
    const supported = ['wSOL', 'USDT', 'USDC'];
    const tokens = TOKEN_LIST.filter(i => supported.includes(i.symbol));
    if (chainId === networkUrls[0].id) {
      tokens.unshift({ ...NEON_TOKEN_MODEL, address_spl: networkTokenMint.toBase58() });
    } else {
      const wSOL = tokens.find(i => i.symbol === 'wSOL');
      tokens.unshift({ ...wSOL, ...SOL_TOKEN_MODEL, address_spl: networkTokenMint.toBase58() });
    }
    return tokens;
  }, [chainId, networkTokenMint]);

  const splToken = useMemo(() => {
    const index = tokenList.findIndex(i => i.symbol === token);
    if (index > -1) {
      return tokenList[index];
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const disabled = useMemo(() => {
    const balance = new Big(tokenBalance[transfer.direction].toString());
    return submitDisable || balance.eq(0) || Big(amount).gt(balance);
  }, [amount, submitDisable, tokenBalance, transfer.direction]);

  const amountView = useMemo(() => {
    const balance = new Big(tokenBalance[transfer.direction].toString());
    return `${balance.gt(0) ? balance.toFixed(3) : ''}${splToken?.symbol ? ` ${splToken.symbol}` : ''}`;
  }, [tokenBalance, transfer.direction, splToken]);

  const walletSigner: any = useMemo(() => {
    return new Wallet(signerPrivateKey(solanaWallet.publicKey, neonWallet.address), ethersProvider);
  }, [ethersProvider, solanaWallet.publicKey, neonWallet.address]);

  const handleSelect = (event: any): any => {
    setToken(event.target.value);
    setSignature({});
  };

  const handleEvmNetworkSelect = (event: any): any => {
    setChainId(Number(event.target.value));
    setToken('');
    setSignature({});
    setTokenBalance({ solana: BIG_ZERO, neon: BIG_ZERO });
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
    const neon = await neonBalanceEthers(ethersProvider, neonWallet);
    setWalletBalance({ solana, neon });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethersProvider]);

  const getProxyStatus = useCallback(async () => {
    const proxyStatus = await proxyApi.evmParams();
    const gasTokens = await proxyApi.nativeTokenList();
    // @ts-ignore
    setProxyStatus(proxyStatus);
    setGasTokens(gasTokens);
  }, [proxyApi]);

  const directionBalance = (position: 'from' | 'to'): string => {
    const evmToken = `${networkUrl.token} NeonEVM`;
    const solana = `SOL Solana`;
    switch (position) {
      case 'from': {
        const token = transfer.direction === 'solana' ? solana : evmToken;
        return `${new Big(walletBalance[transfer.direction].toString()).toFixed(3)} ${token}`;
      }
      case 'to': {
        const to = transfer.direction === 'solana' ? 'neon' : 'solana';
        const token = transfer.direction === 'solana' ? evmToken : solana;
        return `${new Big(walletBalance[to].toString()).toFixed(3)} ${token}`;
      }
    }
  };

  const getTokenBalance = useCallback(async () => {
    if (splToken) {
      switch (splToken.symbol) {
        case 'NEON': {
          const solana = await splTokenBalance(connection, solanaWallet.publicKey, splToken);
          const neon = await neonBalanceEthers(ethersProvider, neonWallet);
          setTokenBalance({
            solana: new Big(solana.amount).div(Math.pow(10, solana.decimals)),
            neon
          });
          break;
        }
        case 'SOL': {
          const solana = await solanaBalance(connection, solanaWallet.publicKey);
          const neon = await neonBalanceEthers(ethersProvider, neonWallet);
          setTokenBalance({ solana, neon });
          break;
        }
        case 'wSOL': {
          const address = new PublicKey(splToken.address_spl);
          const associatedToken = getAssociatedTokenAddressSync(address, solanaWallet.publicKey);
          const solana = await solanaBalance(connection, associatedToken);
          const neon = await mintTokenBalanceEthers(neonWallet, splToken);
          setTokenBalance({ solana, neon });
          break;
        }
        default: {
          const solana = await splTokenBalance(connection, solanaWallet.publicKey, splToken);
          const neon = await mintTokenBalanceEthers(neonWallet, splToken);
          setTokenBalance({
            solana: new Big(solana.amount).div(Math.pow(10, solana.decimals)),
            neon
          });
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ethersProvider, splToken]);

  const handleSubmit = useCallback(async () => {
    if (token && splToken) {
      setSubmitDisable(true);
      const solanaSigner: Signer = toSigner(solanaWallet);
      console.log(solanaSigner)
      if (transfer.direction === 'solana') {
        switch (splToken.symbol) {
          case 'NEON': {
            const transaction = await solanaNEONTransferTransaction(solanaWallet.publicKey, neonWallet.address, neonProgram, networkTokenMint, splToken, amount, chainId);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
          case 'SOL': {
            const transaction = await solanaSOLTransferTransaction(connection, solanaWallet.publicKey, neonWallet.address, neonProgram, networkTokenMint, splToken, amount, chainId);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
          case 'wSOL': {
            const transaction = await neonTransferMintTransactionEthers(connection, proxyApi, neonProgram, solanaWallet.publicKey, neonWallet.address, walletSigner, splToken, amount, chainId);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
          default: {
            const transaction = await neonTransferMintTransactionEthers(connection, proxyApi, neonProgram, solanaWallet.publicKey, neonWallet.address, walletSigner, splToken, amount, chainId);
            const solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
            setSignature({ solana });
            break;
          }
        }
      } else {
        const mintPubkey = new PublicKey(splToken.address_spl);
        const associatedToken = getAssociatedTokenAddressSync(mintPubkey, solanaWallet.publicKey);
        switch (splToken.symbol) {
          case 'NEON': {
            const transaction = await neonNeonTransactionEthers(ethersProvider, neonWallet.address, NEON_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
            const neon = await sendNeonTransaction(transaction, neonWallet);
            setSignature({ neon });
            break;
          }
          case 'SOL': {
            const transaction = await neonNeonTransactionEthers(ethersProvider, neonWallet.address, SOL_TRANSFER_CONTRACT_DEVNET, solanaWallet.publicKey, amount);
            const neon = await sendNeonTransaction(transaction, neonWallet);
            setSignature({ neon });
            break;
          }
          case 'wSOL': {
            let solana = ``;
            if (!(await connection.getAccountInfo(associatedToken))) {
              const transaction = createAssociatedTokenAccountTransaction(solanaWallet.publicKey, mintPubkey, associatedToken);
              solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
              delay(1e3);
            }
            const transaction = await createMintNeonTransactionEthers(ethersProvider, neonWallet.address, associatedToken, splToken, amount);
            const neon = await sendNeonTransaction(transaction, neonWallet);
            setSignature({ solana, neon });
            break;
          }
          default: {
            let solana = ``;
            if (!(await connection.getAccountInfo(associatedToken))) {
              const transaction = createAssociatedTokenAccountTransaction(solanaWallet.publicKey, mintPubkey, associatedToken);
              solana = await sendTransaction(connection, transaction, [solanaSigner], true, { skipPreflight: false });
              delay(1e3);
            }
            const transaction = await createMintNeonTransactionEthers(ethersProvider, neonWallet.address, associatedToken, splToken, amount);
            const neon = await sendNeonTransaction(transaction, neonWallet);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, splToken, solanaWallet, transfer.direction, getTokenBalance, getWalletBalance, amount, connection, ethersProvider, neonWallet]);

  useEffect(() => {
    getProxyStatus();
    getTokenBalance();
    getWalletBalance();
  }, [getProxyStatus, getTokenBalance, getWalletBalance, splToken]);

  return (
    <div className="form-content">
      <h1 className="title-1">
        <i className="logo"></i>
        <div className="flex flex-row items-center justify-between w-full">
          <select value={chainId} onChange={handleEvmNetworkSelect} className="evm-select"
                  disabled={submitDisable}>
            {networkUrls.map((i) => <option value={i.id} key={i.id}>{i.token} transfer</option>)}
          </select>
          <span className="text-[18px]">React demo</span>
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
              <input value={transfer.from} className="form-input" disabled={true}></input>
            </div>
            <div>
              <button className="icon-button" type="button"
                      onClick={handleTransferDirection}></button>
            </div>
            <div>
              <label htmlFor="select" className="form-label flax flex-row justify-between">
                <span>To</span>
                <span>({directionBalance('to')})</span>
              </label>
              <input value={transfer.to} className="form-input" disabled={true}></input>
            </div>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="select" className="form-label">Select token</label>
          <select value={token} onChange={handleSelect} className="form-select"
                  disabled={submitDisable}>
            <option value="" disabled={true}>Select Token</option>
            {tokenList.map((i, k) =>
              <option value={i.symbol} key={k}>{i.name} ({i.symbol})</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="select" className="form-label flex flex-row justify-between">
            <span>Amount</span>
            <span>{amountView}</span>
          </label>
          <input value={amount} onInput={handleAmount} className="form-input" placeholder="0"
                 disabled={true}></input>
        </div>
        <button type="button" className="form-button" onClick={handleSubmit} disabled={disabled}>
          Submit
        </button>
      </form>
      {(signature.solana || signature.neon) &&
        <div className="flex flex-col gap-[10px] p-[12px] bg-[#282230] rounded-[12px] truncate">
          {signature.solana && <a href={solanaSignature(signature.solana)} target="_blank"
                                  rel="noreferrer">Solana: {stringShort(signature.solana, 40)}</a>}
          {signature.neon && <a href={neonSignature(signature.neon)} target="_blank"
                                rel="noreferrer">Neon: {stringShort(signature.neon, 40)}</a>}
        </div>}
    </div>
  );
}

export default NeonTransferApp;
