// Constantes compartilhadas entre o front (src/) e a API (server/).
// Regra única: quantas gerações de imagem podem rodar ao mesmo tempo. O front usa
// para dimensionar a fila; o server usa para recusar o que passar disso.
export const MAX_GERACOES_PARALELAS = 4

export const PORTA_API = 4600
export const PORTA_FRONT = 4610
