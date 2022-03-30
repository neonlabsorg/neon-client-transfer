import React from 'react'
import { ReactComponent as DropDownIcon } from '../../assets/dropdown.svg'
import TokenManager from '../TokenManager'
import {ModalCaller} from '../../../common/Modal'
import { useTokenList } from '../../hooks/useTokenList'

const CurrencySelect = ({className = '', currency = undefined, onChangeCurrency = () => {}}) => {
  const {list, error, loading} = useTokenList()
  const openManageTokenModal = () => {
    new ModalCaller({
      title: 'Choose token',
      bodyClass: 'max-h-3/4 overflow-auto',
      className: 'w-2/4 max-w-420px',
      children: <TokenManager
        list={list} error={error} loading={loading}
        onChooseToken={(token) => {
          onChangeCurrency(token)
        }}/>
    })
  }
  return <>
    <div className={`inline-flex cursor-pointer items-center justify-between py-3 px-4 rounded-md bg-gray-700 transition-all hover:bg-gray-600 ${className}`}
      style={{
        minWidth: '280px'
      }}
      onClick={() => openManageTokenModal()}>
      {currency && currency.name ? <>
          {currency.name}
        </>
        : <div>Select an input currency</div>
      }
      <DropDownIcon className='ml-3 ' />
    </div>
  </>
}
export default CurrencySelect