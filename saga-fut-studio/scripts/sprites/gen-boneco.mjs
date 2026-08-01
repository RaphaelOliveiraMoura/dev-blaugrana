// gen-boneco.mjs <slug> — FOLHA DE PEÇAS: o personagem desmontado em partes articuláveis.
//
// É a única geração de que o boneco precisa. Depois dela, todo gesto do personagem é dado: uma
// lista de ângulos. Compare com o que existe hoje, em que cada gesto é uma folha nova.
//
// AS DUAS REGRAS QUE DECIDEM SE VAI FUNCIONAR (e que já mataram o cutout da primeira tentativa):
//   1. SOBRA NA JUNTA. Cada peça continua um pouco ALÉM da articulação, com a ponta ARREDONDADA.
//      Peça cortada reta abre buraco assim que roda; peça com sobra roda e a junta continua cheia.
//   2. PEÇA NA VERTICAL, ligação NO TOPO. É o que faz o pivô ser (meio, topo) em toda peça e o
//      encaixe do filho ser a ponta do pai, sem ninguém declarar coordenada.
//
// Saída: personagens/<slug>/boneco/_sheet.png (fundo magenta, grid 4x3).
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, loadStylePrefix, MAGENTA_BG } from './config.mjs';
import { exigirPorta } from './porta.mjs';
import { PECAS, GRID_BONECO, folhaBoneco } from '../../shared/boneco.mjs';
import { modelSheet } from '../../shared/personagem.mjs';

exigirPorta('gen-boneco.mjs', 'node scripts/asset.mjs boneco <slug>');

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node gen-boneco.mjs <slug>'); process.exit(1); }
const baseAbs = basePersonagem(SLUG);
if (!existsSync(baseAbs)) { console.error(`FAIL "${SLUG}" não tem base.png — o boneco é o MESMO personagem, desmontado.`); process.exit(1); }

const OUTREL = folhaBoneco(SLUG);
const outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

const [GC, GR] = GRID_BONECO;
// A lista numerada é o contrato com o fatiador: a ordem que o prompt manda desenhar é a ordem em
// que as células são lidas. Se as duas divergirem, o braço vira perna e ninguém percebe até animar.
const lista = PECAS.map((p, i) => `  ${i + 1}. ${p.rotulo}`).join('\n');

const sp = await loadStylePrefix();
const msAbs = path.join(CONTEUDO, modelSheet(SLUG));
const temMs = existsSync(msAbs);

const prompt = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${OUTREL}
You are given ${temMs ? 3 : 2} input images, pass them all to the image tool as INPUT IMAGES with HIGH input fidelity.
- Image 1 is THE CHARACTER: keep his exact face, hair, skin tone, kit colours and shirt number.
${temMs ? '- Image 2 is his MODEL SHEET: keep these exact proportions.\n' : ''}- The last image is the rabisco-riso STYLE reference.
Square composition, a clean ${GC} x ${GR} grid of ${GC * GR} equal cells.

IMAGE PROMPT:
${sp}

THIS IS A PUPPET PARTS SHEET: the SAME character taken apart into separate body pieces, laid out one
per cell, to be reassembled and animated. This is NOT a character in poses — each cell holds ONE
DETACHED body part floating alone, seen from the SIDE (profile), and nothing else.

Read the grid left to right, top to bottom. The ${GC * GR} cells, in this exact order:
${lista}

CLOTHING RULE, the one that decides whether the puppet reads as ONE body: each garment is drawn ONCE
and only on the piece named above. A forearm has NO sleeve and NO cuff. A thigh has NO shorts and NO
sock. Do NOT repeat a sleeve, a cuff, a sock band or any coloured ring on a second piece "to make it
look complete" — the pieces are meant to be joined, and a repeated garment reads as a second limb.

HOW EVERY PIECE MUST BE DRAWN, this is what makes the puppet work:
- VERTICAL. Every limb piece is drawn straight up and down, hanging, not bent and not posed.
- The end that CONNECTS TO THE BODY is at the TOP of the cell, the free end at the BOTTOM.
- OPEN JOINT ENDS, this is the most important rule. At the end that CONNECTS TO THE BODY the black
  outline must STOP: the two side outlines simply end there and there is NO line drawn across the
  joint, leaving that end as bare colour with no border. Only the FREE end (hand, foot) is fully
  outlined and closed. A piece outlined all the way around reads as a separate object glued on top
  of the body instead of as part of one drawing.
- ROUNDED, OVERSHOOTING JOINTS. Each piece must extend a bit PAST its joint with a full ROUND
  silhouette (but still with NO outline on that end), so that when the pieces are rotated the joint
  stays filled and no gap opens. Never end a piece with a flat straight cut.
- Same scale in every cell: the pieces must fit back together into the character at his normal size.
- The torso piece includes the shoulders and the hips; the head piece includes the neck stump.
- The outline weight and the drawing style are the same as the reference, but the joint end stays
  OPEN as described above.
- ONE piece per cell, centred, floating, with clear margin, never touching the cell border.

BACKGROUND: ${MAGENTA_BG}, completely uniform, no shadow, no ground, no cell borders, no grid lines.
NO text, NO numbers except the kit number where it belongs on the torso, NO labels, NO watermark.
Do not draw the whole assembled character anywhere in the image.

Write the final PNG to that exact path (${OUTREL}). Overwrite if it exists. Do not ask for confirmation.`;

const refs = temMs ? [baseAbs, msAbs, ESTILO_PATH] : [baseAbs, ESTILO_PATH];
console.log(`>>> boneco ${SLUG} (folha de peças ${GC}x${GR})`);
const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: refs, outAbs, timeoutMs: 600000 });
console.log(`OK boneco ${SLUG}`, Math.round((Date.now() - t0) / 1000) + 's ->', OUTREL);
