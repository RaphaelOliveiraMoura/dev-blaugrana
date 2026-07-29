// slice-walk.mjs <slug> — fatia a folha 2x2 de caminhada em rigs/andar/<slug>/_sheet.png,
// tira magenta, normaliza pelo centro dos PÉS -> w1..w4.png. Constantes/matemática em config.mjs.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { CONTEUDO, SHEET_INSET, keyMagenta, placeOnCanvas } from './config.mjs';
import { cartaoAndar } from './sprite-card.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node slice-walk.mjs <slug>'); process.exit(1); }
const BASE = `${CONTEUDO}/rigs/andar/${SLUG}`;
await mkdir(BASE, { recursive: true });
const meta = await sharp(`${BASE}/_sheet.png`).metadata();
const HW = Math.floor(meta.width / 2), HH = Math.floor(meta.height / 2), I = SHEET_INSET;
const cells = [[I, I], [HW + I, I], [I, HH + I], [HW + I, HH + I]];
for (let i = 0; i < 4; i++) {
  const [l, t] = cells[i], cw = HW - I * 2, ch = HH - I * 2;
  const { data, info } = await sharp(`${BASE}/_sheet.png`).extract({ left: l, top: t, width: cw, height: ch }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bbox = keyMagenta(data, info.width, info.height);
  await writeFile(`${BASE}/w${i + 1}.png`, await placeOnCanvas(data, info.width, info.height, bbox));
  console.log(SLUG, 'w' + (i + 1), (bbox.maxX - bbox.minX + 1) + 'x' + (bbox.maxY - bbox.minY + 1));
}
const card = await cartaoAndar(SLUG).catch(() => null);
console.log('OK', SLUG, card ? '· cartão: rigs/andar/' + SLUG + '/_card.png (CONFIRA orientação)' : '');
