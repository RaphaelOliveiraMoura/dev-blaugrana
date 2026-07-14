import { getJSON, sendJSON } from './http.js'

// Quais clipes/narrações de um episódio já estão em disco, e se há rough-cut.
export const getRenderStatus = (epId, nCenas) => getJSON(`/api/render-status/${epId}/${nCenas}`)

// Monta o rough-cut do episódio (ffmpeg no servidor).
export const montarRascunho = (payload) => sendJSON('/api/render', payload)
