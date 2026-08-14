// ACENTO FALTANDO NÃO É SÓ ESTÉTICA: ELE MUDA O ÁUDIO.
//
// POR QUE EXISTE: desde que a voz saiu do balão (13/08/2026), o MESMO campo alimenta a legenda e a
// fala. "que e capaz" sai escrito errado na tela E lido errado pela voz: o `say` trata "e" como a
// conjunção átona e "é" como o verbo tônico, e os dois áudios são medidamente diferentes (2,208s
// contra 2,304s na mesma frase). Ou seja, o defeito que antes era um errinho de digitação hoje é
// uma frase falada errada no vídeo publicado.
//
// O que este módulo pega são os dois casos de alto impacto e baixa ambiguidade:
//
//   1. FORMAS QUE NÃO EXISTEM SEM ACENTO em português ("voce", "nao", "tambem", "ninguem"...).
//      Aqui não há falso positivo possível: a palavra sem acento simplesmente não existe.
//   2. O "e" QUE DEVERIA SER "é", pelo contexto ("que e", "ele e", "isso e"). Este é heurístico,
//      então só dispara depois de um sujeito/pronome, que é onde a conjunção quase nunca cabe.
//
// O que ele NÃO tenta: acentuação em geral. Um corretor completo daria falso positivo em apelido,
// grito e português errado DE PROPÓSITO (que é linguagem da casa), e gate que erra vira gate que
// se ignora.

// formas sem acento que não são palavra nenhuma em pt-BR
const NAO_EXISTEM = {
  voce: 'você', voces: 'vocês', nao: 'não', entao: 'então', tambem: 'também',
  ninguem: 'ninguém', alguem: 'alguém', porem: 'porém', alem: 'além', parabens: 'parabéns',
  ate: 'até', tres: 'três', mes: 'mês', pes: 'pés', ja: 'já',
  // `la`/`ca` ficaram DE FORA: "La Masia", "La Rambla", "La Pobla" são nome próprio e apareceram
  // 4 vezes no acervo contra zero "lá" sem acento. Gate que erra é gate que se ignora.
  sao: 'são', estao: 'estão', irmao: 'irmão', coracao: 'coração', milhoes: 'milhões',
  bilhoes: 'bilhões', campeao: 'campeão', campeoes: 'campeões', decisao: 'decisão',
  posicao: 'posição', selecao: 'seleção', torcedores: null, historia: 'história',
  memoria: 'memória', musica: 'música', video: 'vídeo', publico: 'público', ultimo: 'último',
  proximo: 'próximo', possivel: 'possível', dificil: 'difícil', facil: 'fácil', rapido: 'rápido',
  unico: 'único', numero: 'número', codigo: 'código', arbitro: 'árbitro', tecnico: 'técnico',
  medico: 'médico', otimo: 'ótimo', pessimo: 'péssimo', ideia: null,
  familia: 'família', gloria: 'glória', ninguem_: null, sera: 'será', esta_: null,
  aniversario: 'aniversário', calendario: 'calendário', estadio: 'estádio', premio: 'prêmio',
  titulo: 'título', invencivel: 'invencível', incrivel: 'incrível', terrivel: 'terrível',
  saudade: null, avo: null, tchau: null,
}

// "e" que é verbo, não conjunção: depois destes, conjunção não cabe
// `ele`/`ela` NÃO entram: é exatamente onde a conjunção cabe ("ele E outros onze homens se
// reuniram"), e foi o único falso positivo que sobrou na medição dos 665 textos do acervo.
const ANTES_DE_VERBO_SER = [
  'que', 'voce', 'você', 'isso', 'isto', 'aquilo', 'quem', 'aqui', 'ali',
  'nao', 'não', 'só', 'tudo', 'nada', 'ninguem', 'ninguém', 'alguem', 'alguém',
]

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * @param {string} texto
 * @returns {{palavra:string, sugestao:string, motivo:string}[]}
 */
export function problemasDeAcento (texto) {
  const achados = []
  const t = String(texto || '')
  if (!t.trim()) return achados

  // 1) formas impossíveis sem acento (compara em minúsculas, devolve como veio)
  for (const bruta of t.split(/[^\p{L}]+/u)) {
    if (!bruta) continue
    const chave = bruta.toLowerCase()
    const certa = NAO_EXISTEM[chave]
    if (certa && semAcento(chave) === chave) {
      // devolve na MESMA caixa do original: o roteiro escreve em caixa alta e sugestão minúscula
      // vira uma segunda decisão pra quem só queria copiar e colar
      const sug = bruta === bruta.toUpperCase() ? certa.toUpperCase() : certa
      achados.push({ palavra: bruta, sugestao: sug, motivo: 'essa forma não existe sem acento' })
    }
  }

  // 2) o verbo "é" escrito como "e"
  const re = new RegExp(`\\b(${ANTES_DE_VERBO_SER.join('|')})\\s+(e)\\b`, 'giu')
  for (const m of t.matchAll(re)) {
    const acento = m[2] === m[2].toUpperCase() ? 'É' : 'é'
    achados.push({ palavra: `${m[1]} ${m[2]}`, sugestao: `${m[1]} ${acento}`, motivo: 'aqui "e" é o verbo ser, não a conjunção' })
  }
  return achados
}

/** Todos os textos de um vídeo que viram legenda E voz. */
export function textosFaladosDoVideo (video) {
  const fora = []
  for (const [i, sh] of (video.roteiro || []).entries()) {
    for (const b of (sh.baloes || [])) {
      if (b.texto) fora.push({ onde: `cena ${i + 1}`, campo: 'texto', valor: b.texto, temVoz: !!b.voz })
      if (b.dizer) fora.push({ onde: `cena ${i + 1}`, campo: 'dizer', valor: b.dizer, temVoz: !!b.voz })
    }
  }
  return fora
}
