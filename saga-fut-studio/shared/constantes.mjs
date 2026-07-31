// Constantes compartilhadas entre o front (src/) e a API (server/).
// Regra única: quantas gerações de imagem podem rodar ao mesmo tempo. O front usa
// para dimensionar a fila; o server usa para recusar o que passar disso.
export const MAX_GERACOES_PARALELAS = 4

// Quantos RENDERS de vídeo podem rodar ao mesmo tempo NA MÁQUINA. O render é CPU-bound
// (Remotion no swiftshader, concurrency=1) e o ffmpeg depois; dois em paralelo brigam pelo
// mesmo CPU e não terminam mais rápido. Vale entre processos (lock em arquivo), então
// protege agente, script e aba do studio igualmente. Suba se for rodar em máquina folgada.
export const MAX_RENDERS_PARALELOS = 1

export const PORTA_API = 4600
export const PORTA_FRONT = 4610

// Quanto tempo a arte parada segura na tela no vídeo do quadrinho. 6s dá pra ler
// a piada e ainda dá replay, que é o que o TikTok conta como retenção.
export const VIDEO_SEGUNDOS_PADRAO = 6

// Acima de quantas FICHAS soltas uma cena de quadrinho passa a usar a CAST SHEET (as
// fichas fundidas num grid) em vez de anexar ficha a ficha. O gpt-image-2 perde
// fidelidade e estoura o timeout com muitas referências (a prática da casa não passa de
// ~3, ver APRENDIZADOS). Até este número, fichas soltas; acima, funde numa referência só.
export const LIMITE_FICHAS_SOLTAS = 3
