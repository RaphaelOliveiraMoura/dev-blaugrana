import { getJSON, sendJSON } from './http.js'

// Monta a query só com os destinos que vieram (quadrinho, tier list ou vídeo). Sem
// nenhum, cai no baixados/ global.
function qs(opts = {}) {
  const p = new URLSearchParams()
  for (const k of ['quadrinhoId', 'videoId']) if (opts[k]) p.set(k, opts[k])
  const s = p.toString()
  return s ? '?' + s : ''
}

// Vídeos já baixados de fora (TikTok, YouTube Shorts). Sem destino, os do baixados/
// global; com quadrinhoId / videoId, os da pasta daquela peça.
export const getBaixados = (opts = {}) => getJSON('/api/baixados' + qs(opts))

// Baixa o MP4 do link (TikTok ou YouTube Shorts) pra pasta certa (global, ou a da peça
// se vier um id) e devolve o arquivo que caiu. A fonte sai da própria URL.
export const baixarVideo = (url, opts = {}) => sendJSON('/api/baixar-video', { url, ...opts })
