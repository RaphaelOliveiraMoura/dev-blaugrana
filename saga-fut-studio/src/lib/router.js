// Rota persistida na URL (hash) para sobreviver a refresh.

export function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const p = h.split('/')
  if (p[0] === 'melhorias') return { page: 'melhorias' }
  if (p[0] === 'estilos') return { page: 'estilos' }
  if (p[0] === 'redes') return { page: 'redes' }
  if (p[0] === 'personagens') return { page: 'personagens' }
  if (p[0] === 'sagas') return { page: 'sagas' }
  if (p[0] === 'quadrinhos') return { page: 'quadrinhos' }
  if (p[0] === 'quadrinho' && p[1] != null) return { page: 'quadrinho', qi: Number(p[1]) }
  if (p[0] === 'saga' && p[1] != null) return { page: 'saga', si: Number(p[1]) }
  if (p[0] === 'ep' && p[1] != null && p[2] != null) return { page: 'ep', si: Number(p[1]), ei: Number(p[2]), sub: p[3] || 'cenas' }
  return { page: 'home' }
}

export function routeToHash(r) {
  if (r.page === 'melhorias') return '#/melhorias'
  if (r.page === 'estilos') return '#/estilos'
  if (r.page === 'redes') return '#/redes'
  if (r.page === 'personagens') return '#/personagens'
  if (r.page === 'sagas') return '#/sagas'
  if (r.page === 'quadrinhos') return '#/quadrinhos'
  if (r.page === 'quadrinho') return `#/quadrinho/${r.qi}`
  if (r.page === 'saga') return `#/saga/${r.si}`
  if (r.page === 'ep') return `#/ep/${r.si}/${r.ei}/${r.sub || 'cenas'}`
  return '#/home'
}
