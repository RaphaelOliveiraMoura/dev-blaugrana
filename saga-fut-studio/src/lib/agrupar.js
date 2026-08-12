// Agrupa uma listagem por estilo visual, o traço que sagas, quadrinhos e
// personagens compartilham. Os grupos saem na ordem do catálogo de estilos (a
// mesma da tela de Estilos, pra bater de tela em tela) e, dentro de cada um, os
// itens vêm ordenados pelo rótulo. O que não aponta pra nenhum estilo do catálogo
// (ou aponta pra um que já não existe) cai num grupo "Sem estilo" no fim.
//
// `cmpItens` troca a ordem DENTRO do grupo. Existe porque ordenar por rótulo é bom
// pra procurar (personagens) e ruim pra trabalhar (quadrinho novo nascia no meio de
// 68 em ordem alfabética); quem quer o mais recente primeiro passa o próprio
// comparador em vez de reordenar depois, que o agrupamento desfazia.
export function agruparPorEstilo(itens, estilos, rotulo, cmpItens) {
  const ordem = new Map((estilos || []).map((e, i) => [e.id, i]))
  const nomeDe = (id) => (estilos || []).find((e) => e.id === id)?.nome

  const grupos = new Map() // estiloId (ou '') -> itens[]
  for (const item of itens) {
    const eid = ordem.has(item.estiloId) ? item.estiloId : ''
    if (!grupos.has(eid)) grupos.set(eid, [])
    grupos.get(eid).push(item)
  }

  const posicao = (eid) => (ordem.has(eid) ? ordem.get(eid) : Infinity)
  const cmp = cmpItens || ((a, b) => (rotulo(a) || '').localeCompare(rotulo(b) || '', 'pt-BR', { sensitivity: 'base' }))

  return [...grupos.entries()]
    .sort(([a], [b]) => posicao(a) - posicao(b))
    .map(([eid, lista]) => ({
      estiloId: eid || null,
      nome: eid ? (nomeDe(eid) || eid) : 'Sem estilo',
      itens: [...lista].sort(cmp),
    }))
}
