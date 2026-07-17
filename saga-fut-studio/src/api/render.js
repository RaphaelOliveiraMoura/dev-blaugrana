import { getJSON, sendJSON } from './http.js'

// Quais clipes/narrações de um episódio já estão em disco, e se há rough-cut.
export const getRenderStatus = (epId, nCenas) => getJSON(`/api/render-status/${epId}/${nCenas}`)

// Monta o rough-cut do episódio (ffmpeg no servidor).
export const montarRascunho = (payload) => sendJSON('/api/render', payload)

// Transforma a arte parada do quadrinho em vídeo 9:16 com trilha. Sem painelNumero,
// monta o quadrinho inteiro; com ele, só aquele painel.
export const montarVideoQuadrinho = (payload) => sendJSON('/api/render-quadrinho', payload)

// Anima o quadrinho de verdade via Grok: cada painel vira clipe animado, juntados em
// 9:16 com a transição escolhida (dissolve/slide). Lento (um clipe por painel no Grok);
// reaproveita clipes já animados, então trocar a transição remonta rápido.
export const animarQuadrinho = (payload) => sendJSON('/api/animar-quadrinho', payload)

// Junta as artes do quadrinho em imagem parada pra post: mosaico (todas as cenas num
// quadro) e/ou carrossel (um slide por painel), no formato pedido.
export const montarImagemQuadrinho = (payload) => sendJSON('/api/montar-imagem', payload)
