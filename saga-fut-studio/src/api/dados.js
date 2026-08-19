import { getJSON, sendJSON } from './http.js'

// O objeto completo do projeto (projeto + personagens + sagas + quadrinhos).
export const getDados = () => getJSON('/api/dados')

// O PROJETO INTEIRO numa tacada. Continua existindo para script e para consumidor fora da tela,
// mas a tela NÃO usa mais: ver `salvarMudancas` abaixo.
export const saveDados = (dados) => sendJSON('/api/dados', dados, 'PUT')

// Só o project.json (modelo de imagem, personagens, estilos, áudio) — sem as coleções.
export const saveProjeto = (dados) => sendJSON('/api/projeto', dados, 'PUT')

// Um item só (quadrinho, vídeo ou saga).
export const saveItem = (rota, item) => sendJSON(`/api/${rota}/${item.id}`, item, 'PUT')

const COLECOES = [['quadrinhos', 'quadrinhos'], ['videos', 'videos'], ['sagas', 'sagas']]
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// SALVA SÓ O QUE MUDOU, comparando o estado da tela com o que veio do servidor.
//
// POR QUE EXISTE: a tela mandava o projeto INTEIRO a cada Cmd+S, e isso tem dois preços que só
// aparecem quando alguém já está trabalhando em paralelo (que é o caso normal aqui, com scripts
// e agentes escrevendo pela API):
//
//   1. UM ITEM ALHEIO DERRUBA O SAVE. As validações rodam sobre tudo que vai no pacote, então
//      salvar um card de escalação foi barrado pela capa de outro quadrinho, que estava velha na
//      memória da aba. Quem salvou não tinha como ligar uma coisa à outra.
//   2. PIOR, QUANDO PASSA: a aba carregada às 10h grava às 15h o que ela viu às 10h, desfazendo
//      em silêncio o que qualquer script corrigiu no meio. Foi o que quase aconteceu com 170
//      legendas reescritas — o gate só segurou por acidente.
//
// Como a UI não cria, não apaga e não reordena item nenhum (§1.1 do CLAUDE.md), o diff se
// resume a "quais itens têm JSON diferente do que o servidor mandou": esses vão por PUT
// granular, e o resto nem é enviado. Item que só existe na tela também é gravado (o PUT
// granular cria), então nada some por não estar no snapshot.
export async function salvarMudancas(dados, base) {
  if (!base) return saveDados(dados)   // sem snapshot, o comportamento antigo é o seguro
  const enviados = []
  for (const [chave, rota] of COLECOES) {
    const antes = new Map((base[chave] || []).map((i) => [i.id, i]))
    for (const item of (dados[chave] || [])) {
      if (igual(item, antes.get(item.id))) continue
      await saveItem(rota, item)
      enviados.push(`${rota}/${item.id}`)
    }
  }
  const semColecoes = (d) => { const { sagas, quadrinhos, videos, ...resto } = d; return resto }
  if (!igual(semColecoes(dados), semColecoes(base))) {
    await saveProjeto(semColecoes(dados))
    enviados.push('projeto')
  }
  return enviados
}

// Quais desses arquivos de mídia existem em disco: { caminho: true|false }
export const getMediaExists = (paths) => sendJSON('/api/media-exists', { paths })

// Progresso por episódio/quadrinho, contado a partir dos arquivos em disco.
export const getProgress = () => getJSON('/api/progress')
