import { getJSON, sendJSON } from './http.js'

// Monta a query só com os destinos que vieram (quadrinho ou tier list). Sem nenhum,
// cai no baixados/ global.
function qs({ quadrinhoId, tierlistSlug }) {
  const p = new URLSearchParams()
  if (quadrinhoId) p.set('quadrinhoId', quadrinhoId)
  if (tierlistSlug) p.set('tierlistSlug', tierlistSlug)
  const s = p.toString()
  return s ? '?' + s : ''
}

// Vídeos já baixados de fora (TikTok etc.). Sem destino, os do baixados/ global; com
// quadrinhoId ou tierlistSlug, os da pasta daquela peça.
export const getBaixados = (quadrinhoId, tierlistSlug) =>
  getJSON('/api/baixados' + qs({ quadrinhoId, tierlistSlug }))

// Baixa o MP4 do link do TikTok pra pasta certa (global, ou a do quadrinho/tier list se
// vier o id) e devolve o arquivo que caiu.
export const baixarTikTok = (url, quadrinhoId, tierlistSlug) =>
  sendJSON('/api/baixar-tiktok', { url, quadrinhoId, tierlistSlug })
