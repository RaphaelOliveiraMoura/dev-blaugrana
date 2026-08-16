// A folha de prova dos logos gerados por MODELO. Os mesmos prompts nos dois modelos, lado a lado,
// mais a redução, que é onde logo morre.
//
// A LEITURA HONESTA DESTA FOLHA: modelo de imagem não desenha logo, ele desenha uma ILUSTRAÇÃO de
// logo. O que sai daqui não é arquivo final: é DIREÇÃO. O que for escolhido precisa ser
// redesenhado em vetor por código depois, senão a marca fica presa num PNG que ninguém consegue
// ajustar, recolorir ou reduzir sem perder qualidade.
//
//   node futgibi/marca/prova-logo-ia.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import { CREME, VERDE, PRETO, FONTE_ARTE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(AQUI, '_logo-ia');

const CEL = 300, PAD = 30, ROT = 32, GAP = 14, MINI = [72, 34];

const arquivos = (await readdir(DIR)).filter((f) => f.endsWith('.png'));
const ids = [...new Set(arquivos.map((f) => f.replace(/^(codex|grok)-/, '').replace('.png', '')))].sort();
const modelos = ['codex', 'grok'];

const rotulo = (txt, w, tam = 14, cor = CREME) => Buffer.from(
  `<svg width="${w}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="20" font-family='${FONTE_ARTE}' font-size="${tam}" font-weight="bold"
      letter-spacing="1.5" fill="${cor}">${txt}</text></svg>`);

const cel = async (arq, fundo) => {
  const im = await sharp(path.join(DIR, arq)).resize({ width: CEL - 20, height: CEL - 20, fit: 'inside' })
    .png().toBuffer();
  const m = await sharp(im).metadata();
  return sharp({ create: { width: CEL, height: CEL, channels: 4, background: fundo } })
    .composite([{ input: im, left: Math.round((CEL - m.width) / 2), top: Math.round((CEL - m.height) / 2) }])
    .png().toBuffer();
};

const linhas = [];
for (const [i, id] of ids.entries()) {
  const y = PAD + ROT + i * (CEL + ROT + GAP);
  linhas.push({ input: rotulo(id.toUpperCase(), 500, 15), left: PAD, top: y - ROT + 4 });
  for (const [j, m] of modelos.entries()) {
    const arq = `${m}-${id}.png`;
    if (!arquivos.includes(arq)) continue;
    linhas.push({ input: await cel(arq, CREME), left: PAD + j * (CEL + GAP), top: y });
    linhas.push({ input: rotulo(m, 120, 12), left: PAD + j * (CEL + GAP) + 4, top: y + CEL - 4 });
    // a redução, do lado de cada um
    let x = PAD + 2 * (CEL + GAP) + j * 140;
    for (const t of MINI) {
      const im = await sharp(path.join(DIR, arq)).resize({ width: t, height: t, fit: 'inside' }).png().toBuffer();
      linhas.push({ input: im, left: x, top: y + Math.round((CEL - t) / 2) });
      x += t + 12;
    }
  }
}

const W = PAD * 2 + 2 * (CEL + GAP) + 300;
const H = PAD * 2 + ids.length * (CEL + ROT + GAP);
const saida = path.join(AQUI, '_prova-logo-ia.png');
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite([
    { input: rotulo('codex', 200, 13), left: PAD, top: 6 },
    { input: rotulo('grok', 200, 13), left: PAD + CEL + GAP, top: 6 },
    { input: rotulo('72px · 34px  (codex | grok)', 400, 13), left: PAD + 2 * (CEL + GAP), top: 6 },
    ...linhas,
  ]).png().toFile(saida);
console.log(`OK -> ${saida}  (${ids.length} conceitos x ${modelos.length} modelos)`);
