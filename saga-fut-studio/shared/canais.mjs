// OS CANAIS DA CASA, num lugar só.
//
// Desde 15/08/2026 o acervo serve DOIS perfis: o @devblaugrana (futebol do Barça) e o @futgibi
// (futebol em geral, sem clube). Eles compartilham a FÁBRICA e separam a PUBLICAÇÃO:
//
//   compartilhado: personagens, estilos, cenários, objetos, trilhas — duplicar isso é o caminho
//                  conhecido pros dois estilos divergirem sem ninguém ver;
//   separado:      quadrinho, vídeo e saga, que são o que vai pro ar e o que entra no cronograma.
//
// A separação é UM CAMPO no item (`canal`), e não dois project.json, porque o `asset.mjs` inteiro
// assume um acervo só e porque campo é reversível: apagar o campo devolve o item ao padrão.
//
// AUSÊNCIA VALE COMO devblaugrana, de propósito: os 127 itens que existiam antes desta data são
// todos dele, e uma migração de 127 arquivos pra escrever o que já era verdade é risco sem ganho.
// O preço é que item novo do futgibi PRECISA declarar, e é por isso que o `asset doutor` conta
// quantos itens não declaram: buraco que ninguém mede vira buraco permanente.

export const CANAL_PADRAO = 'devblaugrana'

export const CANAIS = [
  {
    id: 'devblaugrana', nome: '@devblaugrana', curto: 'blaugrana', assunto: 'Barça',
    handle: 'devblaugrana',
    youtubeTags: ['Shorts', 'futebol', 'Barcelona'],
  },
  {
    id: 'futgibi', nome: '@futgibi', curto: 'futgibi', assunto: 'futebol em geral',
    handle: 'futgibi',
    youtubeTags: ['Shorts', 'futebol'],
  },
]

// pseudo-canal do seletor: NÃO se grava em item nenhum, só decide o que a tela mostra
export const CANAL_TODOS = 'todos'

export const canalDo = (item) => (item?.canal || CANAL_PADRAO)

export const canalValido = (id) => CANAIS.some((c) => c.id === id)

export const fichaDoCanal = (id) => CANAIS.find((c) => c.id === id) || CANAIS[0]

// O filtro que as telas usam. `todos` devolve tudo, e é por isso que ele não é um canal de verdade.
export function doCanal(itens, canalAtivo) {
  if (!canalAtivo || canalAtivo === CANAL_TODOS) return itens || []
  return (itens || []).filter((i) => canalDo(i) === canalAtivo)
}

// Mensagem de erro do PUT. Item pode NÃO declarar canal (vira o padrão), mas declarar errado é
// erro: `canal: "futigibi"` sumiria da lista dos dois canais sem avisar ninguém.
export function problemaNoCanal(item) {
  if (item?.canal == null || item.canal === '') return null
  if (typeof item.canal !== 'string' || !canalValido(item.canal)) {
    return `canal "${item?.canal}" não existe (use ${CANAIS.map((c) => c.id).join(' ou ')}, ou deixe vazio para ${CANAL_PADRAO})`
  }
  return null
}
