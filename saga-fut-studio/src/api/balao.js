import { sendJSON, getJSON } from './http.js'

// A PRÉVIA de um painel: o slide acabado (moldura, selo, balões, legendas). Instantâneo,
// vetorial, sem IA. Grava no mesmo arquivo do carrossel, então o que aparece na aba é
// literalmente o que vai pro post.
export const gerarPrevia = (payload) => sendJSON('/api/previa-painel', payload)

// Catálogo de fontes de traço (pro seletor). Cacheado: é estático na sessão.
let _fontesCache = null
export async function getFontesBalao() {
  if (!_fontesCache) _fontesCache = await getJSON('/api/balao/fontes')
  return _fontesCache
}
