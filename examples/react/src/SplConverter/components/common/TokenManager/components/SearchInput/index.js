export const SearchInput = ({
  className = '',
  value = '',
  onChange = () => {},
  placeholder = ''
}) => {
  return <><input
    className={`${className} search-input`}
    value={value} placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}/></>
}