// Orçamento de tempo da narração contra o clipe de 10s do Grok.

export const CLIPE_S = 10   // duração fixa do clipe do Grok
export const MAX_S = 13.5   // acima disso, além de acelerar 1.35x, precisa congelar quadro

const PALAVRAS_POR_S = 2.1  // calibrado com áudio real do ElevenLabs
const PAUSA_S = 0.5         // custo de cada "..."

function contar(texto) {
  const t = texto || ''
  return {
    palavras: t.trim().split(/\s+/).filter(Boolean).length,
    pausas: (t.match(/\.\.\./g) || []).length,
  }
}

export function estimaSegundos(texto) {
  const { palavras, pausas } = contar(texto)
  return Math.round(palavras / PALAVRAS_POR_S + pausas * PAUSA_S)
}

export function orcamentoNarracao(texto) {
  const { palavras, pausas } = contar(texto)
  const seg = estimaSegundos(texto)
  const alvoPalavras = Math.max(0, Math.round((CLIPE_S - pausas * PAUSA_S) * PALAVRAS_POR_S))
  const cortar = Math.max(0, palavras - alvoPalavras)
  const nivel = seg > MAX_S ? 'alto' : seg > CLIPE_S ? 'medio' : 'ok'
  return { palavras, seg, nivel, cortar, alvoPalavras }
}
