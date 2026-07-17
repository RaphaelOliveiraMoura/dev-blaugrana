import { getJSON, sendJSON } from './http.js'

// Vídeos já baixados de fora (TikTok etc.), em saga-fut/baixados/.
export const getBaixados = () => getJSON('/api/baixados')

// Baixa o MP4 do link do TikTok e devolve o arquivo que caiu na pasta.
export const baixarTikTok = (url) => sendJSON('/api/baixar-tiktok', { url })
