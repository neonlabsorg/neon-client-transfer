export default function Switcher({ active, onClick = () => {} }) {
  return (
    <div className={`switcher ${active ? 'switcher--active' : ''}`} onClick={onClick}>
      <div className='switcher__element'/>
    </div>
  )
}
