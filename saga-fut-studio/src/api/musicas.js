import { getJSON, sendJSON } from './http.js'

// Trilhas disponíveis em assets/musica + o ponto de início salvo de cada uma.
export const getMusicas = () => getJSON('/api/musicas')

// Ponto (em segundos) onde a faixa começa a tocar, pra pular a intro quieta.
export const salvarInicioMusica = (file, inicio) => sendJSON('/api/musica-inicio', { file, inicio })
