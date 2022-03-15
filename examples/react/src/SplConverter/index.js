import { Accordion } from './components/common/Accordion'
import { Source } from './components/Source';
import { useStatesContext } from '../contexts/states';
import { Target } from './components/Target';
import { Confirm } from './components/Confirm';
import { shortenAddress } from '../utils';
import { useWeb3React } from '@web3-react/core';
import { useMemo } from 'react'
import { Transfering } from './components/Transfering';
import { useWallet } from '@solana/wallet-adapter-react';
import useTransactionHistory from './hooks/useTransactionHistory';
import { ReactComponent as CrossIcon } from '@/assets/cross.svg'
const COMPONENTS_BY_STEPS = {
    source: Source,
    target: Target,
    confirm: Confirm
}

const ResultsView = ({stepKey = ''}) => {
    const { publicKey } = useWallet()
    const { account } = useWeb3React()
    const { amount, splToken, direction } = useStatesContext()
    const shortNeonKey = useMemo(() => shortenAddress(account), [account])
    const shortSolanaKey = useMemo(() => publicKey ? shortenAddress(publicKey.toString()) : '', [publicKey])
    const renderTransferInfo = () => {
        return <div>
            <span>Transfer </span>
            <span>{`${amount} `}</span>
            <span className='text-blue-500'>{`${splToken.symbol} `}</span>
            <span>from </span>
            <span className='text-blue-500'>{`${direction === 'neon' ? 
                shortSolanaKey :
                shortNeonKey} `}</span>
            <span>{`on ${direction === 'neon' ? 'Solana' : 'Neon'}`}</span>
        </div>
    }
    const renderRecieveInfo = () => {
        return <div>
            <span>Recieve </span>
            <span className='text-blue-500'>{`${splToken.symbol} `}</span>
            <span>to </span>
            <span className='text-blue-500'>{`${direction === 'neon' ? shortNeonKey : shortSolanaKey} `}</span>
            <span>{`on ${direction === 'neon' ? 'Neon' : 'Solana'}`}</span>
        </div>
    }
    if (stepKey === 'source') return renderTransferInfo()
    else if (stepKey === 'target') return renderRecieveInfo()
}


export const SplConverter =  () => {
    const {isFirstTransaction, viewNotify, setViewNotify} = useTransactionHistory()
    const { steps, pending, neonTransferSign, solanaTransferSign } = useStatesContext()
    if (pending === true || solanaTransferSign || neonTransferSign) {
        return <Transfering />
    } else {
        return (
            <>
                {isFirstTransaction && viewNotify? <div className='bg-white p-6 mb-4 flex flex-col relative'>
                    <CrossIcon className='absolute right-5 top-5' onClick={() => setViewNotify(false)}/>
                    <div className='text-lg mb-2'>Airdrop ahead!</div>
                    <div className='text-sm text-gray-600 leading-relaxed'>When you complete your first Neonpass transaction we will refund half of a price spent to account creation in NEON tokens</div>
                </div> : null}
                <div className='w-full'>
                    {Object.keys(steps).map((stepKey, index) => {
                        const step = steps[stepKey]
                        const StepComponent = COMPONENTS_BY_STEPS[stepKey]
                        return <Accordion className='mb-8' key={stepKey}
                            title={step.title}
                            stepKey={stepKey}
                            stepNumber={index + 1}
                            active={step.status === 'active'}
                            finished={step.status === 'finished'}
                            resultsView={<ResultsView stepKey={stepKey} />}>
                            <StepComponent/>
                        </Accordion>
                    })}
                </div>
            </>
        )
    }
}