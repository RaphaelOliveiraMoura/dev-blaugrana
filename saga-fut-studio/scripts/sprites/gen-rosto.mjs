// gen-rosto.mjs <slug> — FOLHA DE EXPRESSÕES: a mesma cabeça em 9 estados.
//
// Uma geração por personagem e ele passa a ter reação para o resto da vida. É a peça central da
// animação limitada: o corpo segura quase parado e a expressão faz o trabalho.
//
// A REGRA QUE DECIDE SE PRESTA: a cabeça tem que ser A MESMA em todas as células — mesmo tamanho,
// mesma posição, mesmo ângulo. Só o rosto muda. Se a cabeça andar de célula para célula, a troca
// no vídeo vira um solavanco, que é exatamente o defeito que a folha de exposição do projeto já
// caça nas folhas de movimento.
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, loadStylePrefix, MAGENTA_BG } from './config.mjs';
import { exigirPorta } from './porta.mjs';
import { EXPRESSOES, GRID_ROSTO, folhaRosto } from '../../shared/rosto.mjs';
import { dirRig, prefixoRig } from '../../shared/personagem.mjs';

exigirPorta('gen-rosto.mjs', 'node scripts/asset.mjs rosto <slug>');

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node gen-rosto.mjs <slug>'); process.exit(1); }
const baseAbs = basePersonagem(SLUG);
if (!existsSync(baseAbs)) { console.error(`FAIL "${SLUG}" não tem base.png.`); process.exit(1); }

// A REFERÊNCIA TEM QUE SER A SPRITE QUE A EXPRESSÃO VAI COBRIR, e por um motivo que já custou uma
// geração: a primeira folha saiu de PERFIL (era a vista do boneco de peças) e foi colada na sprite
// parada, que é FRONTAL. Cabeça de perfil sobre corpo de frente = duas cabeças na tela, e a troca
// nunca ia fechar. A vista da folha é herdada da sprite, nunca escolhida à parte.
const spriteAbs = [
  path.join(CONTEUDO, dirRig(SLUG, 'idle', false), `${prefixoRig('idle', false)}1.png`),
  path.join(CONTEUDO, `personagens/${SLUG}/poses/parado.png`),
].find((p) => existsSync(p));
const temSprite = !!spriteAbs;

const OUTREL = folhaRosto(SLUG);
const outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

const [GC, GR] = GRID_ROSTO;
const lista = EXPRESSOES.map((e, i) => `  ${i + 1}. ${e.rotulo}`).join('\n');
const sp = await loadStylePrefix();

const prompt = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${OUTREL}
You are given ${temSprite ? 3 : 2} input images, pass them all to the image tool as INPUT IMAGES with HIGH input fidelity.
- Image 1 is THE CHARACTER: keep his exact face, skin tone, hair shape and colour, facial hair.
${temSprite ? '- Image 2 is THE SPRITE this sheet has to match: draw the head from the SAME ANGLE and in the SAME VIEW as the head in that sprite (if it faces the viewer, draw it facing the viewer; if it is in profile, draw it in profile). This is the most important thing in the whole sheet.\n' : ''}- The last image is the rabisco-riso STYLE reference.
Square composition, a clean ${GC} x ${GR} grid of ${GC * GR} equal cells.

IMAGE PROMPT:
${sp}

THIS IS AN EXPRESSION SHEET: the SAME HEAD drawn ${GC * GR} times, always in the SAME VIEW AND ANGLE
as the reference sprite, each cell showing a different FACIAL EXPRESSION. Only the face changes.

Read the grid left to right, top to bottom. The ${GC * GR} cells, in this exact order:
${lista}

THE RULE THAT MAKES THIS USABLE: in every single cell the head must be IDENTICAL in size, position,
angle and shape — same skull, same hair silhouette, same ear position, same neck stump at the bottom,
all at the same height in the cell. Imagine the head never moved and only the eyes, eyebrows and
mouth were redrawn. Do NOT tilt, rotate, scale, or shift the head between cells. Do NOT change the
hair. Do NOT add hands, shoulders, bodies or props.

BACKGROUND: ${MAGENTA_BG}, completely uniform, no shadow, no cell borders, no grid lines.
NO text, NO labels, NO watermark.

Write the final PNG to that exact path (${OUTREL}). Overwrite if it exists. Do not ask for confirmation.`;

const refs = temSprite ? [baseAbs, spriteAbs, ESTILO_PATH] : [baseAbs, ESTILO_PATH];
console.log(`>>> rosto ${SLUG} (${GC * GR} expressões)`);
const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: refs, outAbs, timeoutMs: 600000 });
console.log(`OK rosto ${SLUG}`, Math.round((Date.now() - t0) / 1000) + 's ->', OUTREL);
