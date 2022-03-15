import { useEffect, useState } from "react"
import { ReactComponent as DropDownIcon } from '../../../assets/dropdown.svg'
import { useStatesContext } from "../../../contexts/states"
import { useTokensContext } from "../../../contexts/tokens"

export const CurrencyInput = ({
  className = ''
}) => {
  const [inputAmount, setInputAmount] = useState('0.0')
  const {amount, setAmount, splToken} = useStatesContext()
  const {setTokenManagerOpened} = useTokensContext()
  const openManageTokenModal = () => {
    setTokenManagerOpened(true)
  }
  useEffect(() => {
    if (amount !== 0 && typeof amount === 'number') setInputAmount(`${amount}`)
  }, [amount])
  useEffect(() => {
    if (isNaN(inputAmount)) return
    setAmount(Number(inputAmount))
  }, [inputAmount, setAmount])
  return <div className={`inline-flex bg-light-gray px-6 ${className} items-center justify-between`}
    style={{height: '80px'}}>
    <div onClick={openManageTokenModal} className='flex-grow flex items-center text-lg py-6 cursor-pointer'>
      {splToken ? splToken.name : 'Select a token'}
      <DropDownIcon className='ml-3'/>
    </div>
    <input type='number'
      className='w-1/4 py-6 text-lg bg-transparent inline-flex border-none outline-none text-right flex-shrink'
      value={inputAmount}
      onChange={(e) => {
        setInputAmount(e.target.value)
      }}/>
  </div>
}