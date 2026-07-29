// slice-run.mjs <slug> — fatia a folha 2x2 de corrida em rigs/correr/<slug>/_sheet.png,
// tira magenta, normaliza pelo centro dos PÉS -> r1..r4.png. Espelha slice-walk (config.mjs).
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { CONTEUDO, SHEET_INSET, keyMagenta, placeOnCanvas } from './config.mjs';
import { cartaoCorrer } from './sprite-card.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node slice-run.mjs <slug>'); process.exit(1); }
const BASE = `${CONTEUDO}/rigs/correr/${SLUG}`;
await mkdir(BASE, { recursive: true });
const meta = await sharp(`${BASE}/_sheet.png`).metadata();
const HW = Math.floor(meta.width / 2), HH = Math.floor(meta.height / 2), I = SHEET_INSET;
const cells = [[I, I], [HW + I, I], [I, HH + I], [HW + I, HH + I]];
for (let i = 0; i < 4; i++) {
  const [l, t] = cells[i], cw = HW - I * 2, ch = HH - I * 2;
  const { data, info } = await sharp(`${BASE}/_sheet.png`).extract({ left: l, top: t, width: cw, height: ch }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bbox = keyMagenta(data, info.width, info.height);
  await writeFile(`${BASE}/r${i + 1}.png`, await placeOnCanvas(data, info.width, info.height, bbox));
  console.log(SLUG, 'r' + (i + 1), (bbox.maxX - bbox.minX + 1) + 'x' + (bbox.maxY - bbox.minY + 1));
}
const card = await cartaoCorrer(SLUG).catch(() => null);
console.log('OK', SLUG, card ? '· cartão: rigs/correr/' + SLUG + '/_card.png (CONFIRA orientação)' : '');
