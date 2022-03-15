import './App.scss';
import Layout from './common/Layout'
import { SplConverter } from './SplConverter';
import { Web3ReactProvider } from '@web3-react/core'
import { ConnectionProvider } from './contexts/connection';
import { StateProvider } from './contexts/states'
import { WalletProvider } from '@solana/wallet-adapter-react';
import { useSolanaWallet } from './SplConverter/hooks/useSolanaWallet'
import { NotieProvider } from '@/common/Notifications';
import Web3 from 'web3'
import { TokensProvider } from './contexts/tokens';
import IssueReporter from './SplConverter/components/IssueReporter';
import TokenManager from './SplConverter/components/common/TokenManager';
function getLibrary(provider) {
  return new Web3(provider)
}

function App() {
  const {wallets} = useSolanaWallet()
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <ConnectionProvider>
        <WalletProvider wallets={wallets}>
          <NotieProvider>
            <Layout className='flex flex-col w-full px-4 relative'
              bodyClassName='flex flex-col justify-center '>
              <TokensProvider>
                <StateProvider>
                  <SplConverter />
                  <TokenManager />
                  <IssueReporter />
                </StateProvider>
              </TokensProvider>
            </Layout>
            <div id='modals'/>
          </NotieProvider>
        </WalletProvider>
      </ConnectionProvider>
    </Web3ReactProvider>
  );
}

export default App
