import Header from './Header'
import Bowser from 'bowser'
import {ReactComponent as MobileErrorIcon} from '@/assets/mobile-error.svg'
import Button from '../Button'
const MobileErrorOverlay = () => {
  return <div className='flex flex-col items-center justify-between pb-12'>
    <div><MobileErrorIcon className='mb-8'/></div>
    <div>
      <div className=' text-center pt-4 pb-8 text-3xl leading-snug'>Sorry, neonpass <br/>doesn’t work<br/> at mobile phones.</div>
      <div className='text-center text-gray-500'>But you can still explore the possibilities of Neon ecosystem at neon-labs.org</div>
    </div>
    <div className='mt-10'>
      <a rel='noopener noreferrer' target='_blank' href='https://neon-labs.org'>
        <Button>Visit Neon-labs</Button>
      </a>
    </div>
  </div>
}
const Layout = ({children = null, bodyClassName = '', className = ''}) => {
  const browser = Bowser.parse(window.navigator.userAgent)
  return <div className={`layout ${className}`}>
    <Header/>
    <div className={`layout__body ${bodyClassName}`}>
      {browser.platform.type === 'mobile' ? <MobileErrorOverlay/> : children}
    </div>
  </div>
}

export default Layout