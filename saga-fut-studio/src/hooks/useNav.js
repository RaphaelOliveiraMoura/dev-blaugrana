import { useMemo } from 'react'
import { useRoute } from './useRoute.js'

// Navegação do studio. As views chamam `nav.saga(saga.id)` em vez de montar rotas
// na mão, e sempre por id: a posição na lista não endereça nada.
export function useNav() {
  const [route, setRoute] = useRoute()

  const nav = useMemo(() => ({
    ir: (page) => setRoute({ page }),
    saga: (sagaId) => setRoute({ page: 'saga', sagaId }),
    episodio: (sagaId, epId, sub = 'cenas') => setRoute({ page: 'ep', sagaId, epId, sub }),
    quadrinho: (quadId) => setRoute({ page: 'quadrinho', quadId }),
    rota: (r) => setRoute(r),
  }), [])

  return [route, nav]
}
