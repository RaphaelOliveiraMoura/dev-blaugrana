import { sendJSON, getJSON } from './http.js'

// Preenche o balão de um painel com um texto, por cima da arte parada. Instantâneo
// (vetorial): o texto vai na request, não precisa salvar o projeto antes.
export const gerarBalao = (payload) => sendJSON('/api/balao', payload)

// Catálogo de fontes de traço (pro seletor). Cacheado: é estático na sessão.
let _fontesCache = null
export async function getFontesBalao() {
  if (!_fontesCache) _fontesCache = await getJSON('/api/balao/fontes')
  return _fontesCache
}
