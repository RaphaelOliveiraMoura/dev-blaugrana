import { getJSON, sendJSON } from './http.js'

// Quais clipes/narrações de um episódio já estão em disco, e se há rough-cut.
export const getRenderStatus = (epId, nCenas) => getJSON(`/api/render-status/${epId}/${nCenas}`)

// Monta o rough-cut do episódio (ffmpeg no servidor).
export const montarRascunho = (payload) => sendJSON('/api/render', payload)

// Transforma a arte parada do quadrinho em vídeo 9:16 com trilha. Sem painelNumero,
// monta o quadrinho inteiro; com ele, só aquele painel.
export const montarVideoQuadrinho = (payload) => sendJSON('/api/render-quadrinho', payload)
