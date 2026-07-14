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
export const painelImagem = (quadId, numero) => `quadrinhos/${quadId}/paineis/${numero}.png`

// id de episódio a partir da saga e da posição (1 → 'aranha-01')
export const epIdDe = (sagaId, n) => `${sagaId}-${String(n).padStart(2, '0')}`
