const Input = ({type = 'text', className = '', value = '', onChange = () => {}, placeholder = '', error = false}) => {
  return <input type={type} className={`input ${className} ${error ? 'input--error' : ''}`}
      value={value} placeholder={placeholder} autoComplete={'new-password'}
      onChange={(e) => {
          onChange(e.target.value, e)
      }}/>
}

export default Input