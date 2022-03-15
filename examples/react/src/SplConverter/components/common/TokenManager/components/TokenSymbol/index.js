import { useEffect, useRef, useState, useMemo } from "react"
import stub from '@/assets/no_symbol.svg'

const TokenSymbol = ({src = '', alt = ''}) => {
  const imgRef = useRef(null)

  const [failed, setFailed] = useState(false)

  const currentSource = useMemo(() => {
    if (failed === true) return stub
    else return src
    // eslint-disable-next-line
  }, [failed])

  const handleError = () => {
    setFailed(true)
  }

  useEffect(() => {
    setFailed(false)
  }, [src])

  useEffect(() => {
    if (!imgRef.current) return
    const { current } = imgRef
    current.onerror = handleError
    return () => current.onerror = null
  }, [])

  return <>
    <img ref={imgRef} src={currentSource} alt={alt} />
  </>
}

export default TokenSymbol