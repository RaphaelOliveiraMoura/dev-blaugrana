// A QUE FAMÍLIA CADA QUADRINHO PERTENCE. Duas perguntas diferentes, e por isso dois eixos:
//
//   SÉRIE  — o rótulo editorial ("O Dia Em Que", "Zoeira da Copa"). Sai do `selo`, que já é
//            o que aparece impresso na arte, então não há campo novo pra manter em dia.
//   PEÇA POR CÓDIGO — escalação, gol, fim de jogo, substituição, adivinha, a conta. Não é
//            série: é outra NATUREZA de item. Nasce de um `gerar-*.mjs`, sai pronta, se
//            repete a cada jogo e continua útil DEPOIS de publicada (a peça anterior é o
//            gabarito da próxima). Quadrinho de história é o contrário: publicado, acabou.
//
// Fonte ÚNICA da regra: o gerador DECLARA (`porCodigo`), o front filtra por aqui e o teste
// de acabamento confere pelo mesmo catálogo. Sem isso a lista teria uma cópia da lista de
// selos, que ia envelhecer na primeira peça nova.
//
// POR QUE `porCodigo` no dado, e não só a heurística abaixo: o selo é rótulo de exibição e
// pode ser reaproveitado por um quadrinho de história (o `vaga-na-ponta` usa selo
// "Escalação" e é desenhado pela IA). Adivinhar pelo selo o classificaria errado.

// Cada peça montada por código que entra no acervo como quadrinho. `selo` é o que ela
// imprime hoje; serve de ponte pros cards que nasceram antes do campo existir.
export const PECAS_POR_CODIGO = {
  escalacao: { id: 'escalacao', label: 'Escalação', selo: 'Escalação', gerador: 'gerar-escalacao.mjs' },
  gol: { id: 'gol', label: 'Gol', selo: 'Gol', gerador: 'gerar-gol.mjs' },
  'fim-de-jogo': { id: 'fim-de-jogo', label: 'Fim de jogo', selo: 'Fim de jogo', gerador: 'gerar-fim-de-jogo.mjs' },
  substituicao: { id: 'substituicao', label: 'Substituição', selo: 'Substituição', gerador: 'gerar-substituicao.mjs' },
  quiz: { id: 'quiz', label: 'Adivinha', selo: 'ADIVINHA', gerador: 'gerar-quiz.mjs' },
  conta: { id: 'conta', label: 'A conta', selo: 'A CONTA', gerador: 'gerar-conta.mjs' },
}

// A ordem em que as peças aparecem na tela: a do catálogo acima, que é a do jogo
// (escalação antes, gol no meio, fim de jogo depois).
export const ORDEM_PECAS = Object.keys(PECAS_POR_CODIGO)

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Chave de série: "Vida de Culé" e "Vida de Cule" são a MESMA série escrita duas vezes, e
// o acervo tem as duas. Sem normalizar, o filtro nasceria com chip duplicado.
export const chaveSerie = (selo) => semAcento(selo).toLowerCase().replace(/\s+/g, ' ').trim()

// Os cards que entraram no acervo ANTES do campo `porCodigo` existir. Todos declaram no
// contexto que foram montados por código (é o aviso de "não regerar pelo studio"), e é o
// único sinal que eles têm. Nada aqui grava nada: é leitura, pro card antigo não sumir da
// categoria nova.
const MARCA_HERDADA = /montado (?:inteiro )?por c[oó]digo/i

function pecaHerdada(quad) {
  const texto = [quad.contexto, ...(quad.paineis || []).map((p) => p?.promptImagem)].join(' ')
  if (!MARCA_HERDADA.test(texto)) return null
  const porSelo = Object.values(PECAS_POR_CODIGO).find((p) => chaveSerie(p.selo) === chaveSerie(quad.selo))
  if (porSelo) return porSelo
  // sem selo reconhecido, o id ainda começa com o nome da peça (`gol-abdelkarim-...`)
  return Object.values(PECAS_POR_CODIGO).find((p) => String(quad.id || '').startsWith(p.id + '-')) || null
}

// A peça deste quadrinho, ou null se ele é quadrinho de história.
export function pecaPorCodigo(quad) {
  if (!quad || typeof quad !== 'object') return null
  return PECAS_POR_CODIGO[quad.porCodigo] || pecaHerdada(quad)
}

export const ehPorCodigo = (quad) => !!pecaPorCodigo(quad)

// As séries presentes numa lista, da mais numerosa pra menos (a série corrente é a que se
// procura toda semana; a de um episódio só é arqueologia). Peça por código fica FORA: ela
// tem categoria própria, e o selo dela não é série.
export function seriesDoAcervo(quadrinhos) {
  const mapa = new Map() // chave -> { chave, label, n }
  for (const q of quadrinhos || []) {
    if (ehPorCodigo(q)) continue
    const chave = chaveSerie(q.selo)
    if (!chave) continue // sem selo: cai no "Todos", não vira chip vazio
    if (!mapa.has(chave)) mapa.set(chave, { chave, label: String(q.selo).trim(), n: 0 })
    mapa.get(chave).n++
  }
  return [...mapa.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'))
}
