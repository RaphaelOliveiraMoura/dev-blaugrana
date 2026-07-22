import { getJSON, sendJSON } from './http.js'

// Vídeos já baixados de fora (TikTok etc.). Sem quadrinhoId, os do baixados/ global; com
// ele, os da pasta daquele quadrinho.
export const getBaixados = (quadrinhoId) =>
  getJSON('/api/baixados' + (quadrinhoId ? `?quadrinhoId=${encodeURIComponent(quadrinhoId)}` : ''))

// Baixa o MP4 do link do TikTok pra pasta certa (global, ou a do quadrinho se vier o id)
// e devolve o arquivo que caiu.
export const baixarTikTok = (url, quadrinhoId) => sendJSON('/api/baixar-tiktok', { url, quadrinhoId })
