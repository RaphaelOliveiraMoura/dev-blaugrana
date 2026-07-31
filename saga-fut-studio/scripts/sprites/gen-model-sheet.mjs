// gen-model-sheet.mjs <slug> [notas] — TURNAROUND de 4 vistas (frente, 3/4, perfil, costas).
// Interno: chame por `node scripts/asset.mjs model-sheet <slug>`.
//
// POR QUE É PRÉ-REQUISITO: até aqui, toda geração recebia SÓ a base frontal, então o modelo tinha
// que INVENTAR o perfil e as costas em cada folha nova — e inventava diferente a cada vez. Com o
// turnaround anexado como referência, a variação de escala entre células caiu de 1.9% pra 0.8%
// no bake-off. É um render por personagem, uma vez na vida, que melhora toda geração futura dele.
//
// Saída: saga-fut/personagens/model/<slug>.png
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, loadStylePrefix } from './config.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-model-sheet.mjs', 'node scripts/asset.mjs model-sheet <slug>');

const [, , SLUG, NOTAS = ''] = process.argv;
if (!SLUG) { console.error('uso: node gen-model-sheet.mjs <slug> [notas]'); process.exit(1); }

const OUTREL = `personagens/${SLUG}/model.png`;
const outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const sp = await loadStylePrefix();

const prompt = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${OUTREL}
You are given 2 input images with HIGH input fidelity: Image 1 = THE CHARACTER (keep his face, hair, body and kit IDENTICAL). Image 2 = the rabisco-riso STYLE reference.
Landscape 3:2 canvas.

IMAGE PROMPT:
${sp}

A CHARACTER MODEL SHEET (turnaround) of this SAME character: ONE ROW of exactly 4 full-body figures, evenly spaced, separated by thin faint vertical guide lines.
All four are the SAME neutral standing pose (arms relaxed at the sides, feet together), only the CAMERA ANGLE changes:
Figure 1: FRONT view. Figure 2: THREE-QUARTER view turned to the right. Figure 3: SIDE PROFILE facing right. Figure 4: BACK view.
CRITICAL: identical height, identical head size, identical kit and identical colours in all four figures; all four stand on the SAME baseline. This sheet becomes the permanent reference for every future drawing of this character, so it has to be perfectly consistent.${NOTAS ? `\nExtra: ${NOTAS}` : ''}

BACKGROUND: SOLID FLAT PURE MAGENTA (#FF00FF) behind the figures, no scenery, no shadow. NO text, NO labels, NO numbers except a kit number if the character has one. Thick black outlines, flat risograph palette.

Write the final PNG to that exact path (${OUTREL}). Overwrite if it exists. Do not ask for confirmation.`;

console.log('>>> model sheet', SLUG);
const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [basePersonagem(SLUG), ESTILO_PATH], outAbs, timeoutMs: 900000 });
console.log('OK model sheet', SLUG, Math.round((Date.now() - t0) / 1000) + 's', '->', OUTREL);
