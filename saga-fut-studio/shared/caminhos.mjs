// Onde cada arquivo de conteúdo mora dentro de saga-fut/. Fonte única: o front usa
// para criar/mostrar, o servidor usa para ler/gravar. Se um caminho muda, muda aqui.
//
// A regra é uma só: o id do episódio é `<sagaId>-<NN>`, e a pasta dele é
// `episodios/<sagaId>/<NN>`. Como o id carrega a saga, a pasta sai dele sozinha,
// sem precisar da saga em mãos.

const EP_ID = /^(.+)-(\d+)$/

// 'aranha-01' → 'episodios/aranha/01'; 'carecas-jorel-01' → 'episodios/carecas-jorel/01'
export function dirEpisodio(epId) {
  const m = EP_ID.exec(epId || '')
  return m ? `episodios/${m[1]}/${m[2]}` : `episodios/${epId}`
}

export const cenaImagem = (epId, numero) => `${dirEpisodio(epId)}/cenas/${numero}.png`
export const cenaVideo = (epId, numero) => `${dirEpisodio(epId)}/cenas/${numero}.mp4`
export const cenaAudio = (epId, numero, ext = 'mp3') => `${dirEpisodio(epId)}/audio/${numero}.${ext}`
export const roughCut = (epId) => `${dirEpisodio(epId)}/rough-cut.mp4`

export const fichaImagem = (personagemId) => `personagens/${personagemId}.png`
// Referência de aparência do personagem: quem ele É (a foto do jogador real em que
// ele se baseia), quando descrever o rosto em palavras não dá conta. Opcional, e em
// pasta separada de propósito: a ficha é gerada pelo studio, esta você larga na mão,
// e as duas não podem disputar o mesmo nome de arquivo.
export const refPersonagem = (personagemId) => `personagens/refs/${personagemId}.png`
// Referência de traço de um estilo do catálogo: a imagem que o estilo É, quando
// descrever o traço em palavras não dá conta. Opcional — o estilo funciona sem ela.
export const estiloImagem = (estiloId) => `estilos/${estiloId}.png`
export const painelImagem = (quadId, numero) => `quadrinhos/${quadId}/paineis/${numero}.png`
// O post: a arte parada virada vídeo 9:16. Um por painel (posta-se um painel só) e
// um do quadrinho inteiro (os painéis em sequência). Derivados da arte, não do
// roteiro, então não vivem no json do quadrinho.
export const painelVideo = (quadId, numero) => `quadrinhos/${quadId}/videos/${numero}.mp4`
export const quadrinhoVideo = (quadId) => `quadrinhos/${quadId}/video.mp4`

// O post em imagem parada, derivado das artes dos painéis. Dois produtos do mesmo
// material: o mosaico junta todas as cenas num quadro só (bom pro X e como capa), e
// o carrossel é um slide por painel (o que rende no Instagram e no TikTok fotos). O
// mosaico é por formato porque cada feed corta diferente; o slide segue a ordem do
// painel. Vivem em posts/ porque são saída de publicação, não arte de roteiro.
export const quadrinhoMosaico = (quadId, formato) => `quadrinhos/${quadId}/posts/mosaico-${formato.replace(':', 'x')}.png`
export const quadrinhoSlide = (quadId, numero) => `quadrinhos/${quadId}/posts/slide-${numero}.png`

// id de episódio a partir da saga e da posição (1 → 'aranha-01')
export const epIdDe = (sagaId, n) => `${sagaId}-${String(n).padStart(2, '0')}`
