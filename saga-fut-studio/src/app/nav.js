// Menu lateral e a relação entre página e grupo do menu.

export const NAV_GROUPS = [
  { label: 'Criar', items: [
    { page: 'home', icon: '🏠', label: 'Início' },
    { page: 'sagas', icon: '📺', label: 'Sagas' },
    { page: 'quadrinhos', icon: '🗯', label: 'Quadrinhos' },
  ] },
  { label: 'Biblioteca', items: [
    { page: 'personagens', icon: '👥', label: 'Personagens' },
    { page: 'estilos', icon: '🎨', label: 'Estilos' },
  ] },
  { label: 'Estratégia', items: [
    { page: 'redes', icon: '📱', label: 'Redes' },
    { page: 'melhorias', icon: '🛠', label: 'Melhorias' },
  ] },
]

// rótulo de cada página do menu, para o breadcrumb não repetir os nomes
export const LABEL_DA_PAGINA = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.page, i.label]),
)

// grupo do menu que fica ativo para cada página (detalhe herda o grupo do pai)
export function topOf(page) {
  if (page === 'sagas' || page === 'saga' || page === 'ep') return 'sagas'
  if (page === 'quadrinhos' || page === 'quadrinho') return 'quadrinhos'
  return page
}
