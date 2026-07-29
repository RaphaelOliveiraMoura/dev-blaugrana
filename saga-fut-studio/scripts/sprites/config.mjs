// config.mjs — FONTE ÚNICA de parâmetros e regras de criação de sprites do SagaFut.
// Todo tool de sprite (gen-*, slice-*, norm-*, check-*) importa daqui. Mudou a regra?
// Muda AQUI, uma vez, e vale pra todos. Guia humano em saga-fut/docs/VIDEOS.md.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// CAMINHOS
// ---------------------------------------------------------------------------
export const CONTEUDO = '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut';
export const ESTILO_PATH = path.join(CONTEUDO, 'estilos/rabisco-riso.png');
export const PROJECT_JSON = path.join(CONTEUDO, 'data/project.json');
export const PROVIDER_IMAGEM = '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/server/providers/codex-image.mjs';
export const basePersonagem = (slug) => path.join(CONTEUDO, `personagens/${slug}.png`);

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
const NEG = 'NO text, NO labels, NO numbers except a kit number if described. Thick black outlines, flat risograph palette.';

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
export async function promptCenario(outRel, desc, { formato = '3:4' } = {}) {
  const sp = await loadStylePrefix();
  return `${header(outRel)}
1 input image (HIGH fidelity) = the rabisco-riso STYLE reference: copy its medium, thick black outline, flat risograph colours and grain.
Tall VERTICAL composition (${formato}), a wide establishing shot of an EMPTY location.

IMAGE PROMPT:
${sp}

THE LOCATION (background scenery ONLY): ${desc}
CRITICAL: NO people, NO characters, NO players — it is an EMPTY set. Leave the ENTIRE BOTTOM THIRD as OPEN, FLAT FLOOR/GROUND stretching wall to wall (that is where characters will stand later) — no furniture, props or clutter blocking the floor across the bottom. Keep detail in the upper two thirds.
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

// Vocabulário canônico de reações reutilizáveis (biblioteca rigs/poses/<slug>/<emocao>.png).
// Use estes nomes pra a pose ser reaproveitável entre vídeos.
export const REACTION_VOCAB = [
  'comemorar', 'bravo', 'triste', 'maos-cabeca', 'apontar',
  'pensativo', 'apaixonado', 'assustado', 'rindo', 'chocado',
];

// Folha 2x2 de ciclo de movimento (andar/correr). kind = 'walk' | 'run'. dir = 'right'|'left'
// (gera JÁ virado pro lado — use 'left' pra personagem COM número, que não pode ser espelhado).
// nota = descrição extra do jeito de andar (ex.: "on tiptoe, sneaking").
export async function promptSheet(kind, outRel, { kit = '', num = '', dir = 'right', nota = '' } = {}) {
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
You are given 2 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair and body IDENTICAL). Image 2 = the rabisco-riso STYLE reference.
Square 1:1 canvas.

IMAGE PROMPT:
${sp}

${body}
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

// Recorta a bbox de `data`, escala por CHAR_H (encaixa por largura), e compõe no canvas fixo
// com os pés em FEET_Y e o centro-dos-pés no meio. Devolve buffer PNG. Regra ÚNICA de placement.
export async function placeOnCanvas(data, W, H, bbox) {
  const { minX, minY, maxX, maxY } = bbox;
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const feetCx = feetCenter(data, W, bbox);
  const scale = Math.min(CHAR_H / bh, (CANVAS_W - WIDTH_MARGIN) / bw);
  const nw = Math.round(bw * scale), nh = Math.round(bh * scale);
  const trimmed = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .resize({ width: nw, height: nh }).png().toBuffer();
  let left = Math.round(CANVAS_W / 2 - (feetCx - minX) * scale);
  left = Math.max(0, Math.min(CANVAS_W - nw, left));
  const top = Math.round(FEET_Y - nh);
  return sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left, top }]).png().toBuffer();
}
