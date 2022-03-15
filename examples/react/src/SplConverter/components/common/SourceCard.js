
// import { useWeb3React } from '@web3-react/core';
import NeonIcon from '@/assets/neon.png'
import SolanaIcon from '@/assets/solana.png'

const SourceCard = ({direction = 'solana', prefix}) => {
  // const { active } = useWeb3React()
  // const { network } = useNetworkType()
  return <>
    <div className='flex flex-col items-center mb-6'>
      {direction === 'solana' ? 
        <>
           <img src={SolanaIcon} style={{
            width: '80px',
            height: '80px'
          }} alt=''/>
          <span className='text-sm mt-3 text-gray-500'>
            {prefix}
          </span>
          <span className='mt-4 text-xl'>Solana</span>
        </>
      :
        <>
          <img src={NeonIcon} style={{
            width: '50px',
            marginTop: '15px',
            marginBottom: '15px',
            height: '50px'
          }} alt=''/>
          <span className='text-sm mt-3 text-gray-500'>
            {prefix}
          </span>
          <span className='mt-4 text-xl'>Neon</span>
        </>}
    </div>
  </>
}
export { SourceCard }