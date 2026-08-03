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
// avatar: recorte do rosto usado no card de escalação e nas redes. É arte DELE (gerada a partir
// da ficha), então mora com ele — vinha de uma pasta global assets/avatares/.
export const avatarImagem = (slug) => `${dirPersonagem(slug)}/avatar.png`;

// --- bibliotecas de movimento ------------------------------------------------
// prefixo do quadro por tipo: idle=i, andar=w, correr=r (o motor lê "<slug>-w1.png" etc.)
export const PREFIXO_RIG = { idle: 'i', andar: 'w', correr: 'r' };
export const TIPOS_RIG = Object.keys(PREFIXO_RIG);

// TODA FOLHA DE MOVIMENTO OLHA PRA DIREITA. UMA SÓ, SEM VARIANTE.
//
// Existia aqui uma variante `rigs/andar-esq` (quadros "wL1..4"), gerada à parte, porque espelhar um
// jogador COM número inverteria o número na camisa. Isso arrastava meia dúzia de mecanismos atrás de
// si: a folha própria pra esquerda, a direção declarada no `_meta.json`, o `asset dir` pra preencher
// as antigas, o `folhaEsqEstaVirada` conferindo se a arte batia com a declaração, o INV-4 barrando
// quem andasse de costas, e no composer a escolha "usa a folha -esq se existir, senão espelha".
//
// Em 02/08/2026 a decisão foi que NÚMERO INVERTIDO NÃO É PROBLEMA. Com isso a variante perde a razão
// de existir, e tudo que existia só pra sustentá-la sai junto: gerar sempre pra direita e espelhar
// no motor quando o movimento for pra esquerda é uma regra que não tem como ser aplicada pela
// metade. O caminho mais simples é o que não precisa de guarda.
export const dirRig = (slug, tipo) => `${dirPersonagem(slug)}/rigs/${tipo}`;
export const prefixoRig = (tipo) => PREFIXO_RIG[tipo];
export const rigQuadro = (slug, tipo, n) => `${dirRig(slug, tipo)}/${prefixoRig(tipo)}${n}.png`;
export const rigMeta = (slug, tipo) => `${dirRig(slug, tipo)}/_meta.json`;

// --- folhas de gesto ---------------------------------------------------------
export const dirAcao = (slug, gesto) => `${dirPersonagem(slug)}/acoes/${gesto}`;
export const acaoQuadro = (slug, gesto, n) => `${dirAcao(slug, gesto)}/${gesto}${n}.png`;

// --- poses únicas ------------------------------------------------------------
export const dirPoses = (slug) => `${dirPersonagem(slug)}/poses`;
export const poseImagem = (slug, nome) => `${dirPoses(slug)}/${nome}.png`;

