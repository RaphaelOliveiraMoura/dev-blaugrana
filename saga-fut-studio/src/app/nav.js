// Menu lateral e a relação entre página e grupo do menu.

// `icon` é o nome de um ícone do componente Icon, não um emoji: emoji traz cor e
// peso próprios da fonte do sistema e nunca forma um conjunto.
export const NAV_GROUPS = [
  { label: 'Criar', items: [
    { page: 'home', icon: 'home', label: 'Início' },
    { page: 'sagas', icon: 'sagas', label: 'Sagas' },
    { page: 'quadrinhos', icon: 'quadrinhos', label: 'Quadrinhos' },
  ] },
  { label: 'Biblioteca', items: [
    { page: 'personagens', icon: 'personagens', label: 'Personagens' },
    { page: 'estilos', icon: 'estilos', label: 'Estilos' },
  ] },
  { label: 'Estratégia', items: [
    { page: 'cronograma', icon: 'relogio', label: 'Cronograma' },
    { page: 'redes', icon: 'redes', label: 'Redes' },
    { page: 'melhorias', icon: 'melhorias', label: 'Melhorias' },
  ] },
  { label: 'Ferramentas', items: [
    { page: 'baixar', icon: 'baixar', label: 'Baixar' },
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
