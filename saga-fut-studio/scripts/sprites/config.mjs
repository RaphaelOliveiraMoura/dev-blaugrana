// config.mjs — FONTE ÚNICA de parâmetros e regras de criação de sprites do SagaFut.
// Todo tool de sprite (gen-*, slice-*, norm-*, check-*) importa daqui. Mudou a regra?
// Muda AQUI, uma vez, e vale pra todos. Guia humano em saga-fut/docs/VIDEOS.md.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { baseImagem } from '../../shared/personagem.mjs';

// ---------------------------------------------------------------------------
// CAMINHOS
// ---------------------------------------------------------------------------
export const CONTEUDO = '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut';
export const ESTILO_PATH = path.join(CONTEUDO, 'estilos/rabisco-riso.png');
export const PROJECT_JSON = path.join(CONTEUDO, 'data/project.json');
export const PROVIDER_IMAGEM = '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/server/providers/codex-image.mjs';
export const basePersonagem = (slug) => path.join(CONTEUDO, baseImagem(slug));

// ---------------------------------------------------------------------------
// PARÂMETROS DE CANVAS / NORMALIZAÇÃO (todos os slicers usam ESTES números)
// ---------------------------------------------------------------------------
export const CANVAS_W = 480;   // largura do canvas normalizado
export const CANVAS_H = 620;   // altura do canvas normalizado
export const FEET_Y = 610;     // linha do chão (base dos pés) dentro do canvas
export const CHAR_H = 580;     // altura-alvo do personagem (unifica andar/correr/parado)
export const WIDTH_MARGIN = 12; // folga horizontal: pose larga encaixa por largura, não corta
export const SHEET_INSET = 10;  // margem interna ao fatiar as células de uma folha 2x2

// Tolerâncias do validador (check-sprite)
export const SIZE_TOL = 0.14;  // desvio aceitável da altura vs CHAR_H (±14%)
export const EDGE_MARGIN = 2;  // px de corpo tocando a borda = provável corte
export const GHOST_ALPHA = 200; // corpo com alpha médio abaixo disso = "fantasma"/creme mal keyado

// ---------------------------------------------------------------------------
// CONTRATO DE PROMPT — os pedaços FIXOS que TODA geração precisa carregar.
// Muda o "jeito" das sprites em um lugar só.
// ---------------------------------------------------------------------------
export const MAGENTA_BG = 'SOLID FLAT PURE MAGENTA (#FF00FF)';
// NEGATIVO: cada linha aqui é uma geração que já foi PERDIDA por esse motivo. Sombra e chão dentro
// da célula sujam o chroma-key; corpo encostando na borda vira membro cortado no slice; número
// aparecendo onde não devia obrigou a regerar as sprites do Ditador inteiras; e o kit da SELEÇÃO
// no lugar do kit do clube fez o Rodri entrar de vermelho num vídeo do Real.
const NEG = [
  'NO text, NO labels, NO watermark, NO logos.',
  'NO number anywhere on the character unless the kit number is explicitly described above.',
  'NO drop shadow, NO ground shadow, NO floor line, NO horizon: the background is flat colour only.',
  'Keep the whole body INSIDE its cell with clear margin on every side — nothing may touch or cross the cell border.',
  'Use ONLY the kit described above: never substitute a national-team kit or any other strip.',
  'Thick black outlines, flat risograph palette.',
].join(' ');

// TRAVADO PADRÃO: a frase que impede o modelo de redesenhar o personagem a cada célula. Era escrita
// à mão em cada manifesto, então saía diferente toda vez (e foi assim que entrou a folha que
// pulsava). Agora é constante da casa; quem escreve o gesto só ACRESCENTA o que é específico dele.
export const TRAVADO_PADRAO = 'the HEAD keeps exactly the same size and the same position, the character keeps the same total height and the same distance from the camera, and the FEET stay on the same baseline in every cell';

let _sp = null;
export async function loadStylePrefix() {
  if (_sp) return _sp;
  const proj = JSON.parse(await readFile(PROJECT_JSON, 'utf8'));
  const est = proj.estilos.find((e) => e.id === 'rabisco-riso');
  if (!est?.stylePrefix) throw new Error('stylePrefix rabisco-riso não encontrado em project.json');
  _sp = est.stylePrefix;
  return _sp;
}

const header = (outRel) => `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${outRel}`;
const footer = (outRel) => `Write the final PNG to that exact path (${outRel}). Overwrite if it exists. Do not ask for confirmation.`;

// Caricatura-base de corpo inteiro a partir de uma FOTO (fundo CREME, biblioteca personagens/).
export async function promptChar(outRel, desc = '') {
  const sp = await loadStylePrefix();
  return `${header(outRel)}
You are given 2 input images, pass both to the image tool as INPUT IMAGES with HIGH input fidelity.
- Image 1 is the REAL PERSON reference: copy his FACE identity (face shape, skin tone, hair, eyebrows, any facial hair). Use ONLY for the face/identity.
- Image 2 is the rabisco-riso STYLE reference: copy its medium, thick black outline, flat risograph colours and grain.
Portrait 2:3.

IMAGE PROMPT:
${sp}

A FULL BODY character of this same person as a cute rabisco-riso cartoon: standing FRONT VIEW, whole body visible head to feet, feet on the ground, arms relaxed down at the sides, calm neutral friendly face, big head slightly oversized (chibi-ish proportions like the reference style). ${desc}
Centered, plenty of margin. BACKGROUND: a single PLAIN FLAT solid CREAM colour (#f2ead6), completely uniform, no scenery, no shadow, no text, no logos other than what is described. Thick black outlines, flat colours, warm risograph palette.

${footer(outRel)}`;
}

// Uma pose/ação isolada (fundo MAGENTA, ref = a caricatura-base). `movel`=true permite UM móvel
// que o personagem senta/deita (cadeira/cama/banco) embutido no sprite (fica sempre alinhado).
export async function promptPose(outRel, desc, { movel = false } = {}) {
  const sp = await loadStylePrefix();
  const regra = movel
    ? `CRITICAL: draw the character TOGETHER WITH the single piece of furniture they sit or lie on (chair/bed/bench) as ONE unit, the furniture's legs/base resting on the same baseline as the character. Do NOT draw walls, floors, rooms or any OTHER background scenery — only the character + that one piece of furniture.`
    : `CRITICAL: draw ONLY the character MIMING the action. Do NOT draw walls, floors, fences, furniture, ropes, ladders, vehicles or any scenery/background object the action happens on or against — those come from the scene later, so the character grips/leans/climbs against THIN AIR. Only small HANDHELD props explicitly named in the pose are allowed.`;
  return `${header(outRel)}
2 input images (HIGH fidelity): Image 1 = THE CHARACTER (keep face, hair, body IDENTICAL). Image 2 = the rabisco-riso STYLE.
Portrait 2:3.

IMAGE PROMPT:
${sp}

THE POSE (same character, full body, centered, acting on an invisible baseline): ${desc}
${regra}

BACKGROUND: ${MAGENTA_BG}, no scenery, no shadow. ${NEG}

${footer(outRel)}`;
}

// Cenário (fundo full-frame, SEM personagens, chão aberto embaixo). Ref = só o estilo.
// Formato do vídeo (3:4 default). O motor desenha o bg cobrindo o quadro (cover).
//
// `panoramico:true` = cenário LARGO (mundo maior que o quadro), pra a câmera NAVEGAR dentro dele:
// cada enquadramento vira uma "cena" sem cortar nem gerar cenário novo. Pede regiões distintas
// (esquerda/centro/direita) senão o modelo devolve um fundo repetido que não vale panorâmica.
// `camada:'frente'` = SÓ os elementos de primeiro plano, fundo MAGENTA (vira PNG transparente no
// key-camada). É o que dá parallax de verdade: a frente corre mais rápido que o fundo no pan.
export async function promptCenario(outRel, desc, { formato = '3:4', panoramico = false, camada = null } = {}) {
  const sp = await loadStylePrefix();
  const enquadre = panoramico
    ? `WIDE HORIZONTAL PANORAMA composition (${formato}), one CONTINUOUS location seen end to end — much wider than tall.`
    : `Tall VERTICAL composition (${formato}), a wide establishing shot of an EMPTY location.`;
  const regraPanorama = panoramico
    ? `\nPANORAMA RULE: this single image is a WHOLE SET that a camera will pan across, so give the LEFT third, the CENTRE third and the RIGHT third each their OWN distinct landmark/feature (so each one reads as a different place to stand), while the FLOOR LINE and the wall/horizon stay CONTINUOUS and at the SAME HEIGHT across the entire width. Do NOT repeat the same element three times, and do NOT split the image into panels or add any dividing lines.`
    : '';
  if (camada === 'frente') {
    return `${header(outRel)}
1 input image (HIGH fidelity) = the rabisco-riso STYLE reference: copy its medium, thick black outline, flat risograph colours and grain.
${enquadre}

IMAGE PROMPT:
${sp}

FOREGROUND LAYER ONLY (this is a cut-out overlay that sits IN FRONT of the characters): ${desc}
CRITICAL: draw ONLY those foreground elements, floating with NOTHING behind them. NO sky, NO walls, NO floor, NO distant scenery, NO people, NO characters. Everything that is not a foreground element must be pure background colour. Keep the elements near the BOTTOM and the SIDES of the frame, leaving the middle mostly empty (the characters have to stay visible behind it).${regraPanorama}
BACKGROUND: ${MAGENTA_BG}, completely uniform, no shadow. ${NEG}

${footer(outRel)}`;
  }
  return `${header(outRel)}
1 input image (HIGH fidelity) = the rabisco-riso STYLE reference: copy its medium, thick black outline, flat risograph colours and grain.
${enquadre}

IMAGE PROMPT:
${sp}

THE LOCATION (background scenery ONLY): ${desc}
CRITICAL: NO people, NO characters, NO players — it is an EMPTY set. Leave the ENTIRE BOTTOM THIRD as OPEN, FLAT FLOOR/GROUND stretching wall to wall (that is where characters will stand later) — no furniture, props or clutter blocking the floor across the bottom. Keep detail in the upper two thirds.${regraPanorama}
${NEG}

${footer(outRel)}`;
}

// Keyframe COMPOSTO: personagens + cenário no MESMO render (staging correto de graça). Full-frame,
// COM fundo desenhado. Usado pros beats de INTERAÇÃO apertada (sentar, agarrar o topo do muro, um
// pegar o outro), onde colar sprite em fundo plano desencaixa. refs = N caricaturas-base + o estilo.
export async function promptKeyframe(outRel, desc, { formato = '3:4', refs = 1 } = {}) {
  const sp = await loadStylePrefix();
  const refLine = refs === 1
    ? '2 input images (HIGH fidelity): Image 1 = THE CHARACTER (keep face, hair and kit IDENTICAL). Last image = the rabisco-riso STYLE.'
    : `${refs + 1} input images (HIGH fidelity): the first ${refs} are the CHARACTERS, in order (keep each one's face, hair and kit IDENTICAL to its reference). Last image = the rabisco-riso STYLE.`;
  return `${header(outRel)}
${refLine}
Tall VERTICAL composition (${formato}) — ONE fully composed comic-panel scene: the characters AND the setting together in the SAME frame.

IMAGE PROMPT:
${sp}

THE SCENE (compose EVERYTHING in one frame with correct staging — the characters must actually touch / grip / sit on / reach the scenery and each other exactly as described; that alignment is the whole point of this render): ${desc}
Draw the full setting/background INTO the frame (it is NOT empty). Cinematic comic framing, characters big and readable. ${NEG}

${footer(outRel)}`;
}

// Vocabulário canônico de reações reutilizáveis (biblioteca personagens/<slug>/poses/<emocao>.png).
// Use estes nomes pra a pose ser reaproveitável entre vídeos.
export const REACTION_VOCAB = [
  'comemorar', 'bravo', 'triste', 'maos-cabeca', 'apontar',
  'pensativo', 'apaixonado', 'assustado', 'rindo', 'chocado',
];

// Folha 2x2 de ciclo de movimento (andar/correr). kind = 'walk' | 'run'. dir = 'right'|'left'
// (gera JÁ virado pro lado — use 'left' pra personagem COM número, que não pode ser espelhado).
// nota = descrição extra do jeito de andar (ex.: "on tiptoe, sneaking").

// LINHA DE REFERÊNCIAS, uma só pra TODAS as folhas (movimento e ação). Antes, walk/run/idle
// recebiam só base+estilo enquanto as ações recebiam base+model+folha anterior+estilo: o mesmo
// personagem saía com o cabelo de texturas diferentes conforme o gerador, e a troca aparecia na
// tela quando ele deixava de correr e comemorava.
export function linhaRefs({ modelSheet = false, folhaAnterior = false } = {}) {
  if (folhaAnterior) return 'You are given 4 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the OFFICIAL MODEL SHEET of this same character (front, three-quarter, side profile and back views): use it for the proportions, the head size, the HAIR SHAPE AND TEXTURE and the silhouette from ANY angle. Image 3 = ANOTHER APPROVED SPRITE SHEET of this same character: match its DRAWING SCALE and its exact hair/skin/kit colours, as if this new sheet came out of the same batch. Image 4 = the rabisco-riso STYLE reference.';
  if (modelSheet) return 'You are given 3 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the OFFICIAL MODEL SHEET of this same character (front, three-quarter, side profile and back views): use it for the proportions, the head size, the HAIR SHAPE AND TEXTURE and the silhouette from ANY angle. Image 3 = the rabisco-riso STYLE reference.';
  return 'You are given 2 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the rabisco-riso STYLE reference.';
}

export async function promptSheet(kind, outRel, { kit = '', num = '', dir = 'right', nota = '', modelSheet = false, folhaAnterior = false } = {}) {
  const sp = await loadStylePrefix();
  const kitLine = kit ? `He is wearing ${kit}${num ? ` with the number ${num}` : ''}.` : '';
  const D = dir === 'left' ? 'LEFT' : 'RIGHT';
  const notaLine = nota ? ` ${nota}.` : '';
  const body = kind === 'run'
    ? `A 4-CELL RUN-CYCLE sprite sheet of this SAME character, a clean 2x2 grid (thin faint grid lines), full body in every cell. ${kitLine}
CRITICAL: the character is RUNNING FAST to the ${D}, 3/4 SIDE view FACING ${D} in EVERY one of the 4 cells, leaning forward, NEVER mirrored or flipped between cells.${notaLine} The HEAD and TORSO keep the same forward-leaning posture in all 4 cells; the LEGS and ARMS swing to show 4 phases of a running stride (front foot reach, push-off, recover, opposite reach) with bent knees and pumping arms, dynamic and energetic. Same size and same baseline in every cell.
The 4 cells in reading order = the 4 run phases.`
    : `A 4-CELL WALK-CYCLE sprite sheet of this SAME character, a clean 2x2 grid (thin faint grid lines), full body in every cell. ${kitLine}
CRITICAL: the character is WALKING to the ${D}, 3/4 SIDE view FACING ${D} in EVERY one of the 4 cells, NEVER mirrored or flipped between cells.${notaLine} Head, torso and arms stay in the SAME position in all 4 cells; ONLY THE LEGS change to show 4 stride phases of a walk (contact, passing, contact opposite, passing). Same size and same baseline (feet aligned) in every cell.
The 4 cells in reading order = the 4 walk phases.`;
  return `${header(outRel)}
${linhaRefs({ modelSheet, folhaAnterior })}
Square 1:1 canvas.

IMAGE PROMPT:
${sp}

${body}
BACKGROUND: ${MAGENTA_BG} behind the character in every cell, no scenery, no shadow. ${NEG}

${footer(outRel)}`;
}

// FOLHA DE IDLE (2x2): 4 quadros de RESPIRAÇÃO, o personagem "vivo" parado.
//
// POR QUE EXISTE: personagem sem beat era um PNG PARADO na tela (o "cutout fantasma"). O motor já
// sabia ciclar quadros, só não havia o que ciclar num personagem em repouso. É a biblioteca mais
// reaproveitada do projeto: 1 render por personagem serve TODO vídeo em que ele aparece, pra sempre.
//
// O RISCO desta folha é o oposto do da folha de ação: o movimento é MÍNIMO, então o modelo tende a
// (a) desenhar as 4 células idênticas, ou (b) "melhorar" o desenho e mudar o corpo inteiro. Por isso
// as fases são explícitas (ombros sobem/descem, uma piscada) e TODO o resto vem travado.
export async function promptIdle(outRel, { kit = '', num = '', dir = 'right', nota = '', modelSheet = false, folhaAnterior = false } = {}) {
  const sp = await loadStylePrefix();
  // KIT: prefira NÃO descrever (deixe vazio). O idle costuma dividir a tela com as outras sprites do
  // MESMO personagem, então qualquer coisa que você descreva a mais é uma chance de divergir delas:
  // pedindo um número, o modelo trocou o emblema pelo número; pedindo o kit por extenso, ele
  // esqueceu a estrela do peito. Sem descrição, ele copia da caricatura-base e bate com o resto.
  const kitLine = kit
    ? `He is wearing ${kit}${num ? ` with the number ${num}` : ''}.`
    : `His KIT comes from the reference image: copy it EXACTLY as drawn there, including any crest, star, badge and shirt number (do NOT add, remove or move any of them).`;
  const D = dir === 'left' ? 'LEFT' : 'RIGHT';
  const notaLine = nota ? ` ${nota}.` : '';
  return `${header(outRel)}
${linhaRefs({ modelSheet, folhaAnterior })}
Square 1:1 canvas.

IMAGE PROMPT:
${sp}

A 4-CELL IDLE / BREATHING sprite sheet of this SAME character, a clean 2x2 grid (thin faint grid lines), full body in every cell, standing still and calm, 3/4 view facing ${D}. ${kitLine}${notaLine}
CRITICAL: this is a SUBTLE breathing loop, NOT a walk and NOT a gesture. In ALL FOUR cells these stay EXACTLY THE SAME, identical pixel for pixel: the face and hair, the kit and its colours, BOTH FEET planted in the same spot on the same baseline, the arms hanging relaxed at the sides, the overall height and the direction he faces. He does NOT step, does NOT walk, does NOT raise his arms and does NOT change expression.
Cell 1: resting position, chest and shoulders neutral, eyes OPEN looking ahead.
Cell 2: he has breathed IN — chest slightly fuller and both shoulders a touch HIGHER, head a hair higher too, eyes OPEN.
Cell 3: same fuller chest as cell 2, but his eyes are CLOSED (a single blink), everything else unchanged.
Cell 4: he has breathed OUT — chest slightly flatter and both shoulders a touch LOWER than cell 1, eyes OPEN.
The difference between cells is TINY (a few pixels of shoulder and chest), but it must be VISIBLE.

BACKGROUND: ${MAGENTA_BG} behind the character in every cell, no scenery, no shadow. ${NEG}

${footer(outRel)}`;
}

// FOLHA DE AÇÃO (2x2): 4 quadros de UM gesto, gerados NUM RENDER SÓ.
// Existia folha só pra andar/correr; gesto (acenar não, chacoalhar, apontar) virava
// pose única e ficava PARADO na tela, ou duas poses soltas que não casavam entre si.
// Um render só = os 4 quadros compartilham corpo/rosto/kit, então o ciclo não treme.
// `fases` = as 4 fases do gesto, em ordem de leitura. O que NÃO muda entre os quadros
// tem que estar em `travado` (o modelo re-desenha tudo que você não travar).
export async function promptAcao(outRel, { desc, fases = [], travado = '', muda = '', dir = 'right', grid = [2, 2], modelSheet = false, folhaAnterior = false } = {}) {
  const sp = await loadStylePrefix();
  const D = dir === 'left' ? 'LEFT' : 'RIGHT';
  const lista = fases.map((f, i) => `Cell ${i + 1}: ${f}`).join('\n');
  // GRID pela CLASSE de animação (contratos.mjs), não por escolha de quem escreve o manifesto:
  // 2x2 secundária (idle/figurante), 3x3 primária (a ação que carrega o beat, com antecipação e
  // aterrissagem), 4x4 complexa (o kit inteiro do personagem numa folha). Medido em 30/07/2026:
  // 16 células ainda mantêm a identidade (desvio de escala 4.2%), então adensar é seguro.
  const [gc, gr] = grid;
  const n = gc * gr;
  const numero = { 4: 'FOUR', 9: 'NINE', 16: 'SIXTEEN' }[n] || String(n);
  // REFERÊNCIAS, em camadas: identidade (base) -> proporção em qualquer ângulo (model sheet) ->
  // ESCALA DE DESENHO (folha anterior aprovada do mesmo personagem). A terceira é a que o model
  // sheet não resolve: duas folhas diferentes do mesmo personagem saíam em escalas diferentes, e
  // na tela isso é o personagem mudando de tamanho quando o gesto troca. Medido em 30/07/2026:
  // encadeando a folha anterior, a escala se manteve entre renders separados.
  const refsLinha = folhaAnterior
    ? 'You are given 4 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the OFFICIAL MODEL SHEET of this same character (front, three-quarter, side profile and back views): use it for the proportions, the head size and the silhouette from ANY angle. Image 3 = ANOTHER APPROVED SPRITE SHEET of this same character: match its DRAWING SCALE exactly — same head size, same total height, same line weight, same colours, as if this new sheet came out of the same batch. Image 4 = the rabisco-riso STYLE reference.'
    : modelSheet
      ? 'You are given 3 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the OFFICIAL MODEL SHEET of this same character (front, three-quarter, side profile and back views): use it for the proportions, the head size and the silhouette from ANY angle. Image 3 = the rabisco-riso STYLE reference.'
      : 'You are given 2 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the rabisco-riso STYLE reference.';
  // o `travado` do gesto ACRESCENTA ao padrão da casa, nunca substitui
  const travadoFinal = [TRAVADO_PADRAO, travado].filter(Boolean).join(', plus: ');
  // O QUE MUDA: a folha de CAMINHADA acerta porque manda uma frase cirúrgica ("cabeça, tronco e
  // braços na MESMA posição; SÓ as pernas mudam"). Sem uma frase assim, o modelo trata as 4 células
  // como 4 ilustrações independentes e redesenha o personagem inteiro em cada uma — deu 22% de
  // variação no tamanho da cabeça numa folha de comemoração, e na tela isso não lê como gesto, lê
  // como o personagem PULSANDO de tamanho. Por isso `muda` é o campo mais importante deste prompt.
  const mudaLinha = muda
    ? `ONLY ${muda} change between the cells. Everything else is traced IDENTICALLY from one cell to the next.`
    : `ONLY what each cell description below says should change. Everything else is traced IDENTICALLY from one cell to the next.`;
  return `${header(outRel)}
${refsLinha}
Square 1:1 canvas, as large as possible.

IMAGE PROMPT:
${sp}

A ${n}-CELL ACTION sprite sheet of this SAME character, a clean ${gc}x${gr} grid (thin faint grid lines), full body in every cell, facing ${D}. Read the cells in reading order: row by row, left to right.
THE ACTION: ${desc}

CRITICAL — THIS IS ONE ANIMATION, NOT ${numero} SEPARATE DRAWINGS. Treat it as ${n} consecutive frames of the SAME drawing: draw the character once, then redraw ONLY the moving part for each next cell. In ALL ${numero} cells these are IDENTICAL, pixel for pixel: the face, the hair, the kit, the body proportions and the width of the shoulders, and ${travadoFinal}. ${mudaLinha} Never mirror or flip between cells.

FRAMING — LOCKED CAMERA, IDENTICAL IN EVERY CELL. Imagine a tripod that never moves:
- The character's FEET rest on the SAME horizontal line in every cell, and that line sits a little above the bottom edge of the cell. The feet line NEVER moves up or down between cells.
- The character's BODY stays CENTRED at the same horizontal spot in every cell. He must NOT drift left or right across the cell from one drawing to the next. Only the moving limb travels; the torso and the head stay put.
- He is drawn at the SAME SIZE in every cell.
- SAFETY MARGIN: leave clear empty background between the character and ALL FOUR edges of the cell. NOTHING may touch or cross a cell edge — not a hand, not an extended leg, not a strand of hair. If the widest pose of this action would reach an edge, draw the character SMALLER in EVERY cell (all of them, by the same amount) so that even the most extended pose fits with room to spare. A smaller character that fits is correct; a big one with a limb cut off is useless.
The movement between consecutive cells is SMALL — this is limited animation, not ${n} different poses.
${lista}

BACKGROUND: ${MAGENTA_BG} behind the character in every cell, no scenery, no shadow. ${NEG}

${footer(outRel)}`;
}

// ---------------------------------------------------------------------------
// CHROMA / NORMALIZAÇÃO — mesma matemática pra todo slicer, sem drift.
// ---------------------------------------------------------------------------
// Remove fundo magenta (alpha=0) e tira spill verde; devolve a bbox do corpo. Muta `data`.
export function keyMagenta(data, W, H) {
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const m = Math.min(r, b) - g;
    if (r > 120 && b > 120 && g < 140 && m > 40) { data[i + 3] = 0; }
    else {
      if (m > 0) data[i + 1] = Math.min(255, g + Math.round(m * 0.5));
      const x = p % W, y = (p / W) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

// Remove fundo creme (#f2ead6) protegendo branco/olhos neutros; devolve bbox. Muta `data`.
export function keyCream(data, W, H) {
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.hypot(r - 242, g - 234, b - 214);
    const warm = r - b;
    if (dist < 26 && warm > 14 && r > 200 && g > 195) { data[i + 3] = 0; }
    else {
      const x = p % W, y = (p / W) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

// ---------------------------------------------------------------------------
// LARGURA DA CABEÇA — a medida do personagem que NÃO muda com a pose.
//
// Serve pra CONFERIR ESCALA entre sprites do mesmo personagem. A normalização é por bbox (silhueta),
// e silhueta muda com a pose: sentado/caído/agachado a bbox fica baixa e larga, e se cada quadro for
// escalado sozinho o personagem cresce e encolhe na tela. Foi o defeito que apareceu numa folha de
// "sentado com dor" (alturas 521/492/463/422 num gesto que não muda de tamanho). A correção é a
// escala única do placeSerieOnCanvas; esta medida é como se VERIFICA que deu certo.
//
// Mede a largura do MAIOR SEGMENTO CONTÍGUO por linha na faixa do topo (6%..24% da bbox) e tira a
// mediana. Segmento contíguo, e não extensão total, pra um braço erguido AO LADO da cabeça não
// entrar na conta (é outro segmento). Tentei antes achar o PESCOÇO por estrangulamento e não serve
// neste estilo: o personagem é chibi, cabeça e tronco se fundem e não há estreitamento nítido.
// ---------------------------------------------------------------------------
export function larguraCabeca(data, W, bbox) {
  const { minX, minY, maxX, maxY } = bbox, bh = maxY - minY + 1;
  const y0 = minY + Math.round(bh * 0.06), y1 = minY + Math.round(bh * 0.24);
  const ws = [];
  for (let y = y0; y <= y1; y++) {
    let melhor = 0, atual = 0;
    for (let x = minX; x <= maxX; x++) {
      if (data[(y * W + x) * 4 + 3] > 40) { atual++; if (atual > melhor) melhor = atual; } else atual = 0;
    }
    if (melhor > 0) ws.push(melhor);
  }
  if (!ws.length) return null;
  ws.sort((a, b) => a - b);
  return ws[Math.floor(ws.length / 2)];
}

// Centro horizontal dos PÉS (10% de baixo da bbox), pra travar o placement no chão.
export function feetCenter(data, W, { minX, minY, maxX, maxY }) {
  const bh = maxY - minY + 1;
  const footTop = maxY - Math.round(bh * 0.10);
  let fx = 0, fn = 0;
  for (let y = footTop; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    if (data[(y * W + x) * 4 + 3] > 10) { fx += x; fn++; }
  }
  return fn ? fx / fn : (minX + maxX) / 2;
}

// SÉRIE de quadros do MESMO gesto (folha de ação, idle, qualquer ciclo): normaliza os N quadros
// com UMA escala só, ancorados pelos pés.
//
// POR QUE NÃO DÁ PRA USAR O placeOnCanvas QUADRO A QUADRO AQUI: ele escala cada quadro pra caber
// sozinho, e quando a pose é mais LARGA que alta (personagem sentado, dobrado, deitado) quem manda
// é a largura — que muda de quadro pra quadro. O resultado é cada quadro com uma escala diferente,
// e na tela o personagem CRESCE E ENCOLHE durante o gesto. Numa folha de caminhada isso não
// aparecia (a altura é constante por design), então o defeito ficou escondido até a primeira folha
// de ação com o corpo se dobrando: alturas 521/492/463/422 num gesto que não muda de tamanho.
//
// Aqui a escala é a MAIS RESTRITIVA da série (garante que todos cabem) e vale pra todos, então a
// variação de altura que sobra é a do DESENHO — que no idle é a respiração e na ação é o corpo se
// inclinando, ou seja justamente o que deve aparecer.
// `quadros` = [{ data, W, H, bbox }] (data já keyado). Devolve [Buffer PNG] na mesma ordem.
export async function placeSerieOnCanvas(quadros) {
  const escala = Math.min(...quadros.map(({ bbox }) => {
    const bw = bbox.maxX - bbox.minX + 1, bh = bbox.maxY - bbox.minY + 1;
    return Math.min(CHAR_H / bh, (CANVAS_W - WIDTH_MARGIN) / bw);
  }));
  const saidas = [];
  for (const { data, W, H, bbox } of quadros) {
    const bw = bbox.maxX - bbox.minX + 1, bh = bbox.maxY - bbox.minY + 1;
    const nw = Math.max(1, Math.round(bw * escala)), nh = Math.max(1, Math.round(bh * escala));
    const feetCx = feetCenter(data, W, bbox);
    const trimmed = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: bbox.minX, top: bbox.minY, width: bw, height: bh })
      .resize({ width: nw, height: nh }).png().toBuffer();
    let left = Math.round(CANVAS_W / 2 - (feetCx - bbox.minX) * escala);
    left = Math.max(0, Math.min(CANVAS_W - nw, left));
    const top = Math.max(0, Math.round(FEET_Y - nh));
    saidas.push(await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: trimmed, left, top }]).png().toBuffer());
  }
  return { pngs: saidas, escala };
}

// Recorta a bbox de `data`, escala por CHAR_H (encaixa por largura), e compõe no canvas fixo
// com os pés em FEET_Y e o centro-dos-pés no meio. Devolve buffer PNG. Regra ÚNICA de placement.
// Serve pra quadro ISOLADO (uma pose). Pra uma SÉRIE do mesmo gesto, use placeSerieOnCanvas.
// CANVAS DE RETRATO (2x) — o mesmo enquadramento, o dobro de pixels, pra sprite que vai aparecer
// GRANDE na tela.
//
// POR QUE EXISTE, e por que só vale pra POSE ÚNICA: a folha de gesto nasce 1254x1254, então numa
// grade 2x2 cada célula tem 627px e o corpo mede ~515px — MENOS que os 580 do canvas normal. Ou
// seja, a folha já é ampliada ao ser fatiada, e aumentar o canvas dela não inventaria detalhe
// nenhum. A pose única é outra história: ela nasce como imagem inteira (1024x1536), e ao ser
// normalizada em 480x620 a gente JOGA FORA metade da resolução que já tinha. Um beat de close
// (rosto ocupando meia tela, que é o que as referências do gênero fazem o tempo todo) ficava
// borrado por causa dessa perda, não por falta de fonte.
//
// A PROPORÇÃO É IDÊNTICA (0,774) e o pé cai na mesma fração da altura, então o arquivo 2x é
// drop-in no motor: ele desenha com `width: w` e a altura sai da proporção, igual a antes.
export const CANVAS_RETRATO = { W: CANVAS_W * 2, H: CANVAS_H * 2, FEET_Y: FEET_Y * 2, CHAR_H: CHAR_H * 2, MARGIN: WIDTH_MARGIN * 2 };

// A REGRA DE "SPRITE NORMALIZADO" MORA AQUI, num lugar só. Ela é conferida em dois pontos distantes
// (o gate do check-video e o vigia que varre o acervo), e regra duplicada é regra que só é atualizada
// num dos lados: quando o canvas de retrato entrou, um acervo legítimo passaria a ser reprovado como
// "cru" pelo guarda que não soubesse dele.
export const CANVAS_VALIDOS = [[CANVAS_W, CANVAS_H], [CANVAS_RETRATO.W, CANVAS_RETRATO.H]];
export const canvasNormalizado = (w, h) => CANVAS_VALIDOS.some(([cw, ch]) => w === cw && h === ch);
export const CANVAS_ESPERADO = CANVAS_VALIDOS.map(([w, h]) => `${w}x${h}`).join(' ou ');

export async function placeOnCanvas(data, W, H, bbox, { retrato = false } = {}) {
  const cw = retrato ? CANVAS_RETRATO.W : CANVAS_W;
  const chh = retrato ? CANVAS_RETRATO.H : CANVAS_H;
  const feetY = retrato ? CANVAS_RETRATO.FEET_Y : FEET_Y;
  const charH = retrato ? CANVAS_RETRATO.CHAR_H : CHAR_H;
  const margem = retrato ? CANVAS_RETRATO.MARGIN : WIDTH_MARGIN;
  const { minX, minY, maxX, maxY } = bbox;
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const feetCx = feetCenter(data, W, bbox);
  const scale = Math.min(charH / bh, (cw - margem) / bw);
  const nw = Math.round(bw * scale), nh = Math.round(bh * scale);
  const trimmed = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize({ width: nw, height: nh }).png().toBuffer();
  let left = Math.round(cw / 2 - (feetCx - minX) * scale);
  left = Math.max(0, Math.min(cw - nw, left));
  const top = Math.round(feetY - nh);
  return sharp({ create: { width: cw, height: chh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left, top }]).png().toBuffer();
}
