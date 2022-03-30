import { useStatesContext } from "../../../contexts/states"


export const ErrorHandler = ({className}) => {
  const {error} = useStatesContext()
 
  if (error === undefined) return <></>
  return <div className={className}>{error}</div>
}