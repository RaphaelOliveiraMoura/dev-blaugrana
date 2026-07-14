import { useMemo } from 'react'
import { useRoute } from './useRoute.js'

// Navegação do studio. As views chamam `nav.saga(...)` em vez de montar rotas na mão.
export function useNav() {
  const [route, setRoute] = useRoute()

  const nav = useMemo(() => ({
    ir: (page) => setRoute({ page }),
    saga: (si) => setRoute({ page: 'saga', si }),
    episodio: (si, ei, sub = 'cenas') => setRoute({ page: 'ep', si, ei, sub }),
    quadrinho: (qi) => setRoute({ page: 'quadrinho', qi }),
    rota: (r) => setRoute(r),
  }), [])

  return [route, nav]
}
