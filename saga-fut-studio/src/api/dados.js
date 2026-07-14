import { getJSON, sendJSON } from './http.js'

// O objeto completo do projeto (projeto + personagens + sagas + quadrinhos).
export const getDados = () => getJSON('/api/dados')
export const saveDados = (dados) => sendJSON('/api/dados', dados, 'PUT')

// Quais desses arquivos de mídia existem em disco: { caminho: true|false }
export const getMediaExists = (paths) => sendJSON('/api/media-exists', { paths })

// Progresso por episódio/quadrinho, contado a partir dos arquivos em disco.
export const getProgress = () => getJSON('/api/progress')
