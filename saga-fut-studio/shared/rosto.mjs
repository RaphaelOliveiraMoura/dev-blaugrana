// rosto.mjs — O JOGO DE EXPRESSÕES: a mesma cabeça em vários estados.
//
// POR QUE ISTO EXISTE (e por que vem DEPOIS do boneco): a aposta do rig articulado era dar ao
// personagem qualquer pose de corpo. Só que as referências que o projeto persegue fazem ANIMAÇÃO
// LIMITADA: o corpo quase não se mexe e o que anima é um detalhe de expressão. Isso é mais legível
// e mais engraçado, e é muito mais barato — trocar a cabeça é uma troca de imagem, não um rig.
//
// Uma folha por personagem e o elenco inteiro ganha reação. Compare com o custo de hoje, em que
// cada gesto de reação é uma folha de 4 a 16 desenhos gerada por personagem.
export const EXPRESSOES = [
  { id: 'neutro', rotulo: 'neutral, mouth closed, eyes open, calm' },
  { id: 'falando', rotulo: 'mouth OPEN mid-speech, eyes open, neutral brows' },
  { id: 'piscando', rotulo: 'exactly the same as neutral but with BOTH EYES CLOSED (simple curved lines)' },
  { id: 'sobrancelha', rotulo: 'one eyebrow raised high, the other normal, mouth a small flat line: suspicious' },
  { id: 'choque', rotulo: 'both eyes wide open, pupils small, mouth open in a small O: shocked' },
  { id: 'bravo', rotulo: 'eyebrows angled down hard, teeth clenched, angry' },
  { id: 'rindo', rotulo: 'eyes squeezed shut in happy curves, mouth wide open laughing' },
  { id: 'triste', rotulo: 'eyebrows angled up in the middle, mouth a small downward curve, sad' },
  { id: 'sorriso', rotulo: 'a wide closed-mouth smile, eyes relaxed, pleased' },
];
export const GRID_ROSTO = [3, 3];
export const EXPRESSOES_IDS = EXPRESSOES.map((e) => e.id);

export const dirRosto = (slug) => `personagens/${slug}/rosto`;
export const folhaRosto = (slug) => `${dirRosto(slug)}/_sheet.png`;
export const arquivoExpressao = (slug, id) => `${dirRosto(slug)}/${id}.png`;
export const metaRosto = (slug) => `${dirRosto(slug)}/_rosto.json`;
