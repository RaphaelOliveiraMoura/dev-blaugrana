import { getJSON, sendJSON } from './http.js'

// As tier lists já geradas: uma subpasta por ranking (arte + vídeo lado a lado),
// listadas pra vitrine.
export const getTierlists = () => getJSON('/api/tierlists')

// Gera o vídeo estático de uma tier list: a arte parada segurando `segundos` em 9:16,
// mudo. Sai no mesmo diretório da arte. Pode levar alguns segundos (ffmpeg).
export const gerarVideoTierlist = (slug, segundos) =>
  sendJSON('/api/tierlists/video', { slug, segundos })

// Salva título + legenda de publicação da tier list (publicacao.json na pasta dela).
export const salvarPublicacaoTierlist = (slug, publicacao) =>
  sendJSON('/api/tierlists/publicacao', { slug, publicacao }, 'PUT')
