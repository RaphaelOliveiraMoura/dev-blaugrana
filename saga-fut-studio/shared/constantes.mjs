// Constantes compartilhadas entre o front (src/) e a API (server/).
// Regra única: quantas gerações de imagem podem rodar ao mesmo tempo. O front usa
// para dimensionar a fila; o server usa para recusar o que passar disso.
export const MAX_GERACOES_PARALELAS = 4

export const PORTA_API = 4600
export const PORTA_FRONT = 4610

// Quanto tempo a arte parada segura na tela no vídeo do quadrinho. 10s dá pra ler
// a piada e ainda dá replay, que é o que o TikTok conta como retenção.
export const VIDEO_SEGUNDOS_PADRAO = 10
