import { getJSON, sendJSON } from './http.js'

// Trilhas disponíveis em assets/musica + o ponto de início salvo de cada uma.
export const getMusicas = () => getJSON('/api/musicas')

// Ponto (em segundos) onde a faixa começa a tocar, pra pular a intro quieta.
export const salvarInicioMusica = (file, inicio) => sendJSON('/api/musica-inicio', { file, inicio })

// Biblioteca SEPARADA das trilhas de quadrinho (assets/musica-quadrinhos), com o mesmo
// contrato: o tom da charge é outro, então as faixas não se misturam com as das sagas.
export const getMusicasQuadrinho = () => getJSON('/api/musicas-quadrinho')
export const salvarInicioMusicaQuadrinho = (file, inicio) => sendJSON('/api/musica-quadrinho-inicio', { file, inicio })
