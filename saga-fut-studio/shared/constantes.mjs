// Constantes compartilhadas entre o front (src/) e a API (server/).
// Regra única: quantas gerações de imagem podem rodar ao mesmo tempo. O front usa
// para dimensionar a fila; o server usa para recusar o que passar disso.
export const MAX_GERACOES_PARALELAS = 4

export const PORTA_API = 4600
export const PORTA_FRONT = 4610

// Quanto tempo a arte parada segura na tela no vídeo do quadrinho. 10s dá pra ler
// a piada e ainda dá replay, que é o que o TikTok conta como retenção.
export const VIDEO_SEGUNDOS_PADRAO = 10

// Acima de quantas FICHAS soltas uma cena de quadrinho passa a usar a CAST SHEET (as
// fichas fundidas num grid) em vez de anexar ficha a ficha. O gpt-image-2 perde
// fidelidade e estoura o timeout com muitas referências (a prática da casa não passa de
// ~3, ver APRENDIZADOS). Até este número, fichas soltas; acima, funde numa referência só.
export const LIMITE_FICHAS_SOLTAS = 3
