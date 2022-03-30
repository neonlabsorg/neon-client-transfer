import { useStatesContext } from "../../../contexts/states"
import { useEffect } from "react";
import { TransferInfo } from "../common/TransferInfo";
import {ReactComponent as ArrowIcon} from '@/assets/arrow-right.svg'
import Button from "../../../common/Button";
import { useTransfering } from "../../hooks/transfering"
import { withNotie } from '@/common/Notifications';
import { ErrorHandler } from "../common/ErrorHandler";
export const Confirm = withNotie((props) => {
  const { amount, splToken, direction, error } = useStatesContext()
  const {createNeonTransfer, createSolanaTransfer} = useTransfering()

  const handleConfirmTransfer = () => {
    if (direction === 'neon') createNeonTransfer(amount, splToken)
    else if (direction === 'solana') createSolanaTransfer(amount, splToken)
  }

  useEffect(() => {
    if(error !== undefined) props.notie.error(error)
  }, [error, props.notie])

  return <div className='w-full flex flex-col pt-6'>
    <div className='flex flex-col items-center'>
      <img style={{
        width: '56px',
        height: '56px'
      }} src={splToken.logoURI} className='mb-4' alt={splToken.symbol}/>
      <div className='text-2xl font-medium mb-8'>
        {`${amount} ${splToken.symbol}`}
      </div>
    </div>
    <div className='flex justify-between mb-8'>
      <div className='w-5/12 p-6 flex items-center justify-center bg-pinky-white'>
        {direction === 'neon' ? 'Solana' : 'Neon'}
      </div>
      <div className='w-1/6 flex items-center justify-center'>
        <ArrowIcon />
      </div>
      <div className='w-5/12 p-6 flex items-center justify-center bg-pinky-white'>
      {direction === 'neon' ? 'Neon' : 'Solana'}
      </div>
    </div>
    <TransferInfo className='mb-8'/>
    <Button onClick={handleConfirmTransfer}>Confirm</Button>
    <ErrorHandler className='mt-8 text-red-500'/>
  </div>
})