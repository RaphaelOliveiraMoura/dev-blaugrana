// personagem.mjs — TUDO DE UM PERSONAGEM MORA NUMA PASTA SÓ.
//
// ANTES: a arte de um personagem vivia espalhada por oito lugares (`personagens/<slug>.png`,
// `personagens/refs/`, `personagens/model/`, `rigs/idle/<slug>/`, `rigs/andar/<slug>/`,
// `rigs/correr/<slug>/`, `rigs/acoes/<slug>/<gesto>/`, `rigs/poses/<slug>/`). Apagar, duplicar,
// versionar ou só CONFERIR um personagem exigia caçar em todas — e foi assim que passei um dia
// sem notar que 81 dos 82 não tinham model sheet.
//
// AGORA: `personagens/<slug>/` com tudo dentro. Esta é a fonte única dos caminhos: front, servidor
// e scripts importam daqui, ninguém mais escreve "personagens/" na mão.
//
//   personagens/<slug>/
//     base.png                       identidade (era personagens/<slug>.png)
//     ref.png                        foto do jogador real (era personagens/refs/<slug>.png)
//     model.png                      turnaround de 4 vistas (era personagens/model/<slug>.png)
//     rigs/idle/i1..i4.png           respiração
//     rigs/andar/w1..w4.png          caminhada
//     rigs/correr/r1..r4.png         corrida
//     acoes/<gesto>/<gesto>1..N.png  folhas de gesto (4, 9 ou 16 quadros pela classe)
//     poses/<emocao>.png             poses únicas (exceção: a regra é folha)

export const dirPersonagem = (slug) => `personagens/${slug}`;

// --- identidade -------------------------------------------------------------
export const baseImagem = (slug) => `${dirPersonagem(slug)}/base.png`;
export const refImagem = (slug) => `${dirPersonagem(slug)}/ref.png`;
export const modelSheet = (slug) => `${dirPersonagem(slug)}/model.png`;

// --- bibliotecas de movimento ------------------------------------------------
// prefixo do quadro por tipo: idle=i, andar=w, correr=r (o motor lê "<slug>-w1.png" etc.)
export const PREFIXO_RIG = { idle: 'i', andar: 'w', correr: 'r' };
export const TIPOS_RIG = Object.keys(PREFIXO_RIG);
export const dirRig = (slug, tipo) => `${dirPersonagem(slug)}/rigs/${tipo}`;
export const rigQuadro = (slug, tipo, n) => `${dirRig(slug, tipo)}/${PREFIXO_RIG[tipo]}${n}.png`;
export const rigFolha = (slug, tipo) => `${dirRig(slug, tipo)}/_sheet.png`;
export const rigCartao = (slug, tipo) => `${dirRig(slug, tipo)}/_card.png`;

// --- folhas de gesto ---------------------------------------------------------
export const dirAcao = (slug, gesto) => `${dirPersonagem(slug)}/acoes/${gesto}`;
export const acaoQuadro = (slug, gesto, n) => `${dirAcao(slug, gesto)}/${gesto}${n}.png`;
export const acaoFolha = (slug, gesto) => `${dirAcao(slug, gesto)}/_sheet.png`;

// --- poses únicas ------------------------------------------------------------
export const dirPoses = (slug) => `${dirPersonagem(slug)}/poses`;
export const poseImagem = (slug, nome) => `${dirPoses(slug)}/${nome}.png`;

// --- nome do sprite no motor -------------------------------------------------
// O motor referencia sprite por NOME ACHATADO ("<slug>-<nome><N>.png"), não por caminho: o render
// monta uma pasta plana e o Remotion lê de lá. Manter isso é o que permite os assets viverem no
// personagem e serem REUSADOS por qualquer vídeo, sem cópia versionada por vídeo.
export const nomeNoMotor = {
  rig: (slug, tipo, n) => `${slug}-${PREFIXO_RIG[tipo]}${n}.png`,
  acao: (slug, gesto, n) => `${slug}-${gesto}${n}.png`,
  pose: (slug, nome) => `${slug}-${nome}.png`,
};
