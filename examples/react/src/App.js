import { Web3ReactProvider } from '@web3-react/core'
import { Form } from 'react-bootstrap'
import { useMemo } from 'react'
import Web3 from 'web3'
import NeonConnectButton from './vendor/NeonConnectButton'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import {
  getPhantomWallet
} from '@solana/wallet-adapter-wallets';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import './App.css';
import { useState } from 'react';
const useSolanaWallet = () => {
  const wallets = useMemo(() => [
    getPhantomWallet()
  ], []);
  return { wallets }
}
const getLibrary = (provider) => {
  return new Web3(provider)
}

function App() {
  const [amount, setAmount] = useState(0)
  const {wallets} = useSolanaWallet()
  return (
    <div className="App">
      <Web3ReactProvider getLibrary={getLibrary}>
        <ConnectionProvider>
          <WalletProvider wallets={wallets}>
            <div className='p-5 flex'>
              <NeonConnectButton className='mr-8'/>
              <WalletMultiButton/>
            </div>
            <Form>
              <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
                <Form.Label>Enter Amount</Form.Label>
                <Form.Control type="number" placeholder="" value={amount} onChange={(value) => {
                  console.log(value)
                }}/>
              </Form.Group>
            </Form>
          </WalletProvider>
        </ConnectionProvider>
      </Web3ReactProvider>
    </div>
  );
}

export default App;
