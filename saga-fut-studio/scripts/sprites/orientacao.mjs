// PRA QUE LADO A ARTE OLHA — medido da própria imagem, não declarado na mão.
//
// POR QUE EXISTE: "personagem andando de costas" é o defeito que mais se repetiu neste projeto.
// A regra da casa (UMA folha por rig, sempre olhando pra direita, e ir pra esquerda é o motor
// espelhando) resolve o caso normal, mas ela é uma CONVENÇÃO: nada media se a folha nova obedeceu.
// Quando o gerador entregava uma folha virada, o erro só aparecia no vídeo pronto, e o conserto
// dependia de alguém olhar a arte e declarar `preOrientado` na mão — que é justamente onde o erro
// se repetiu, inclusive ao contrário (declarar `preOrientado` numa folha que estava certa faz o
// personagem andar de costas do mesmo jeito).
//
// Aqui a orientação vira DADO MEDIDO: o slicer grava `olhaPara` ao lado da folha, o motor decide o
// espelho a partir dele, e o invariante compara com a direção do movimento. Ninguém precisa lembrar
// de nada, e uma folha virada passa a ser compensada em vez de virar defeito.
//
// COMO MEDE, em duas passadas independentes sobre a faixa da CABEÇA (o terço superior do corpo):
//
//   1. OLHOS: no estilo da casa o olho é branco quase puro, e é a única coisa branca na cabeça.
//      O centroide dos brancos contra o centro da cabeça dá o lado com folga.
//   2. PELE: o rosto mostra pele; a nuca mostra cabelo. O centroide dos tons de pele contra o
//      mesmo centro dá a segunda opinião, e é ela que salva o caso "olho fechado/gritando".
//
// As duas concordando = alta confiança. Discordando ou fracas = `indefinido`, que é o veredito
// honesto pra pose frontal simétrica (a taça erguida com as duas mãos não olha pra lado nenhum).

import sharp from 'sharp'

const LIMIAR_FRACO = 0.045    // abaixo disso a figura é frontal demais pra ter lado
const ALTURA_CABECA = 0.34    // fração do corpo, de cima pra baixo, onde a cabeça está

/** @returns {{lado:'direita'|'esquerda'|'indefinido', desvio:number, confianca:'alta'|'media'|'baixa', detalhe:object}} */
export async function orientacaoDe (arquivo) {
  const img = sharp(arquivo).ensureAlpha()
  const { width: W, height: H } = await img.metadata()
  const { data } = await img.raw().toBuffer({ resolveWithObject: true })
  const at = (x, y) => (y * W + x) * 4

  let minX = W, maxX = 0, minY = H, maxY = 0
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[at(x, y) + 3] > 40) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  if (maxX <= minX || maxY <= minY) return vazio('imagem sem pixels opacos')

  const largura = maxX - minX
  const cabY1 = minY + Math.round((maxY - minY) * ALTURA_CABECA)

  let olhoX = 0, olhoN = 0, peleX = 0, peleN = 0, cabX = 0, cabN = 0
  for (let y = minY; y <= cabY1; y++) for (let x = minX; x <= maxX; x++) {
    const i = at(x, y)
    if (data[i + 3] < 40) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    cabX += x; cabN++
    if (r > 225 && g > 225 && b > 218) { olhoX += x; olhoN++ }                       // branco do olho
    else if (r > 120 && r > g + 12 && g > b + 8 && r - b > 34) { peleX += x; peleN++ } // tom de pele
  }
  if (!cabN) return vazio('cabeça não encontrada')
  const centro = cabX / cabN
  const dOlho = olhoN >= 30 ? (olhoX / olhoN - centro) / largura : null
  const dPele = peleN >= 80 ? (peleX / peleN - centro) / largura : null

  // as duas medidas entram com o mesmo peso; a que faltar simplesmente não vota
  const votos = [dOlho, dPele].filter((v) => v != null)
  if (!votos.length) return vazio('sem olho nem pele visíveis na cabeça')
  const desvio = votos.reduce((a, b) => a + b, 0) / votos.length
  const concordam = votos.length === 2 && Math.sign(dOlho) === Math.sign(dPele)
  const forte = Math.abs(desvio) >= LIMIAR_FRACO

  const confianca = !forte ? 'baixa' : (concordam || votos.length === 1 ? (Math.abs(desvio) > 0.1 ? 'alta' : 'media') : 'baixa')
  return {
    lado: !forte || confianca === 'baixa' ? 'indefinido' : (desvio > 0 ? 'direita' : 'esquerda'),
    desvio: +desvio.toFixed(4),
    confianca,
    detalhe: { olho: dOlho == null ? null : +dOlho.toFixed(4), pele: dPele == null ? null : +dPele.toFixed(4), pxOlho: olhoN, pxPele: peleN },
  }
}

function vazio (motivo) {
  return { lado: 'indefinido', desvio: 0, confianca: 'baixa', detalhe: { motivo } }
}

/**
 * Orientação de uma FOLHA inteira (vários quadros): o veredito é o do voto majoritário entre os
 * quadros com opinião. Um quadro isolado pode estar de perfil fechado ou de frente, e decidir a
 * folha por ele é o mesmo erro de decidir uma animação olhando um desenho só.
 */
export async function orientacaoDaFolha (arquivos) {
  const medidas = []
  for (const a of arquivos) medidas.push({ arquivo: a, ...(await orientacaoDe(a).catch((e) => vazio(e.message))) })
  const dir = medidas.filter((m) => m.lado === 'direita').length
  const esq = medidas.filter((m) => m.lado === 'esquerda').length
  const lado = dir === esq ? 'indefinido' : (dir > esq ? 'direita' : 'esquerda')
  const opinaram = dir + esq
  return {
    lado,
    // divergência DENTRO da folha é outro defeito: quadro espelhado no meio do ciclo
    divergente: dir > 0 && esq > 0,
    votos: { direita: dir, esquerda: esq, indefinido: medidas.length - opinaram },
    medidas,
  }
}

export const ladoOposto = (l) => (l === 'direita' ? 'esquerda' : l === 'esquerda' ? 'direita' : 'indefinido')
