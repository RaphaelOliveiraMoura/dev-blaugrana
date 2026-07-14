import { LABEL_DA_PAGINA, topOf } from './nav.js'

// Trilha do topo: Início › grupo › item aberto. O último item é o atual (sem link).
// Cada degrau leva a rota para onde ele volta; quem não tem `rota` é o degrau atual.
export function buildCrumbs(route, { saga, ep, quad }) {
  const trilha = [{ label: 'Início', rota: { page: 'home' } }]
  const top = topOf(route.page)
  if (top !== 'home' && LABEL_DA_PAGINA[top]) trilha.push({ label: LABEL_DA_PAGINA[top], rota: { page: top } })
  if (saga) trilha.push({ label: saga.titulo, rota: { page: 'saga', sagaId: saga.id } })
  if (ep) trilha.push({ label: `${ep.id.toUpperCase()}, ${ep.titulo}` })
  if (quad) trilha.push({ label: quad.titulo })
  // o degrau atual nunca é clicável
  return trilha.map((c, i) => (i === trilha.length - 1 ? { label: c.label } : c))
}
