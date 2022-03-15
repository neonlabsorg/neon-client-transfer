import { useStatesContext } from "../../../contexts/states"
export const TransferInfo = ({className = ''}) => {
  const { amount, splToken, fee, solBalance } = useStatesContext()
  return <div className={`w-full flex flex-col mb-8 ${className}`}>
  <div className='flex w-full justify-between mb-2'>
    <div>Expected Output</div>
    <div className='text-gray-500'>{`${amount} ${splToken.symbol}`}</div>
  </div>
  <div className='flex w-full justify-between mb-2'>
    <div>Network Fee</div>
    <div className='text-gray-500'>{`${fee} SOL`}</div>
  </div>
  {fee > solBalance ?
    <div className='text-red-600 my-4'>You haven't got enough SOL tokens for paying transaction fee.<br/> Please refill your SOL balance</div>
  : null}
</div>
}