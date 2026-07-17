// Rota persistida no hash da URL, endereçada por ID e não por posição na lista:
// reordenar ou apagar uma saga não pode fazer um link salvo abrir outra coisa.

const PAGINAS_SIMPLES = ['home', 'sagas', 'quadrinhos', 'personagens', 'estilos', 'cronograma', 'redes', 'melhorias', 'baixar']

export function parseHash() {
  const [pagina, a, b, c] = window.location.hash
    .replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (pagina === 'saga' && a) return { page: 'saga', sagaId: a }
  if (pagina === 'ep' && a && b) return { page: 'ep', sagaId: a, epId: b, sub: c || 'cenas' }
  if (pagina === 'quadrinho' && a) return { page: 'quadrinho', quadId: a, sub: b || 'conteudo' }
  if (pagina === 'personagens' && a) return { page: 'personagens', personagemId: a }
  if (PAGINAS_SIMPLES.includes(pagina)) return { page: pagina }
  return { page: 'home' }
}

export function routeToHash(r) {
  const e = encodeURIComponent
  if (r.page === 'saga') return `#/saga/${e(r.sagaId)}`
  if (r.page === 'ep') return `#/ep/${e(r.sagaId)}/${e(r.epId)}/${r.sub || 'cenas'}`
  if (r.page === 'quadrinho') return `#/quadrinho/${e(r.quadId)}/${r.sub || 'conteudo'}`
  if (r.page === 'personagens' && r.personagemId) return `#/personagens/${e(r.personagemId)}`
  return `#/${r.page}`
}
