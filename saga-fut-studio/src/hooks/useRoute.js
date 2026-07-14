import { useEffect, useState } from 'react'
import { parseHash, routeToHash } from '../lib/router.js'

// Rota espelhada no hash da URL, para sobreviver a refresh e ao voltar/avançar.
export function useRoute() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const h = routeToHash(route)
    if (window.location.hash !== h) window.location.hash = h
  }, [route])

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return [route, setRoute]
}
