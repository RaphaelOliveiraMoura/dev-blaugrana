// COMO CADA QUADRINHO É ACABADO: moldura, legenda e carimbo. Fonte ÚNICA da regra, usada
// pelo servidor (prompt e export) e pelo front (aba Ajustes). Se as duas pontas resolvessem
// isso por conta própria, a tela diria uma coisa e o export faria outra.
//
// POR QUE EXISTE: moldura e legenda deixaram de ser desenhadas pela IA em 05/08/2026, depois
// de medir que a margem variava de 4,9% a 7,1% entre painéis do mesmo quadrinho, que dois
// painéis inventaram um passe-partout colorido e que uma legenda saiu escrita "PEDRI PEGO A
// MOCHILA". Acabamento é geometria e texto: não deveria depender de sorteio.

// As três formas de acabar a borda de um painel.
export const MOLDURAS = {
  codigo: {
    id: 'codigo',
    nome: 'Por código',
    resumo: 'A arte sangra até as bordas e o studio desenha a moldura e o selo, iguais em todo painel.',
  },
  ia: {
    id: 'ia',
    nome: 'Pela IA',
    resumo: 'O modelo desenha a moldura e o selo. É como os quadrinhos antigos foram feitos; a margem varia entre painéis.',
  },
  nenhuma: {
    id: 'nenhuma',
    nome: 'Sem moldura',
    resumo: 'A arte ocupa a imagem inteira, sem borda e sem selo. É o que serve pra card de escalação, gol e fim de jogo.',
  },
}
export const MOLDURA_PADRAO = 'codigo'

// Quadrinho ANTIGO (sem o campo) fica na moldura da IA: a arte dele já foi gerada com
// borda desenhada, e mudar o acabamento sem regerar criaria moldura dentro de moldura.
export function molduraDe(quad) {
  if (!quad) return MOLDURA_PADRAO
  if (MOLDURAS[quad.moldura]) return quad.moldura
  if (quad.molduraPorCodigo === true) return 'codigo'   // campo antigo, do primeiro teste
  return 'ia'
}

// A arte precisa NASCER SANGRADA (sem moldura, sem margem, sem selo) sempre que o
// acabamento não vier do modelo. Vale para 'codigo' e para 'nenhuma'.
export const arteSangra = (quad) => molduraDe(quad) !== 'ia'

// Legenda por código pede arte MUDA, então não dá pra ligar em quadrinho já gerado sem
// refazer a arte: por isso o padrão só vale para quadrinho novo (ver scaffold).
export const legendaPorCodigo = (quad) => quad?.legendaPorCodigo === true

// O carimbo "3/8" no carrossel: ligado salvo opt-out declarado.
export const temCarimbo = (quad) => quad?.carimboProgresso !== false

// Resumo em uma linha do que o export vai fazer, pro studio mostrar sem duplicar regra.
export function resumoDoAcabamento(quad) {
  const partes = [`moldura ${MOLDURAS[molduraDe(quad)].nome.toLowerCase()}`]
  partes.push(legendaPorCodigo(quad) ? 'legendas por código' : 'legendas pela IA')
  if (temCarimbo(quad)) partes.push('carimbo de progresso')
  return partes.join(' · ')
}
