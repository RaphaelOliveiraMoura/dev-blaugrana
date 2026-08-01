// Rota persistida no hash da URL, endereçada por ID e não por posição na lista:
// reordenar ou apagar uma saga não pode fazer um link salvo abrir outra coisa.

// AS PÁGINAS SIMPLES SÃO AS DO MENU, derivadas em vez de listadas de novo. Esta era a TERCEIRA
// cópia da lista de páginas (menu, switch de rota e esta), e a terceira é a que se esquece: as
// telas de Cenários e Objetos entraram no menu e no switch, o item ficava marcado ao clicar e o
// conteúdo continuava sendo o da página anterior, porque só aqui elas não existiam.
import { NAV_GROUPS } from '../app/nav.js'

const PAGINAS_SIMPLES = NAV_GROUPS.flatMap((g) => g.items).map((i) => i.page)

export function parseHash() {
  const [pagina, a, b, c] = window.location.hash
    .replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (pagina === 'saga' && a) return { page: 'saga', sagaId: a }
  if (pagina === 'ep' && a && b) return { page: 'ep', sagaId: a, epId: b, sub: c || 'cenas' }
  if (pagina === 'quadrinho' && a) return { page: 'quadrinho', quadId: a, sub: b || 'conteudo' }
  if (pagina === 'video' && a) return { page: 'video', videoId: a, sub: b || 'render' }
  if (pagina === 'personagens' && a) return { page: 'personagens', personagemId: a }
  if (PAGINAS_SIMPLES.includes(pagina)) return { page: pagina }
  // hash vazio ou desconhecido cai na primeira tela (a Home foi removida)
  return { page: 'quadrinhos' }
}

export function routeToHash(r) {
  const e = encodeURIComponent
  if (r.page === 'saga') return `#/saga/${e(r.sagaId)}`
  if (r.page === 'ep') return `#/ep/${e(r.sagaId)}/${e(r.epId)}/${r.sub || 'cenas'}`
  if (r.page === 'quadrinho') return `#/quadrinho/${e(r.quadId)}/${r.sub || 'conteudo'}`
  if (r.page === 'video') return `#/video/${e(r.videoId)}/${r.sub || 'render'}`
  if (r.page === 'personagens' && r.personagemId) return `#/personagens/${e(r.personagemId)}`
  return `#/${r.page}`
}
