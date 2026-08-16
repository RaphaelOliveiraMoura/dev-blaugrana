// A folha de prova da rodada 3 de logotipo. Cada direção aparece nas TRÊS provas onde logo morre,
// lado a lado, e com a redução real embaixo.
//
// A COLUNA QUE DECIDE É A ÚLTIMA. Um logo bonito a 500px que vira mancha a 32px não serve, e é
// exatamente aí que as seis direções da rodada 1 caíram: elas dependiam de o leitor LER a palavra.
// Com o nome em caixa MISTA a pergunta fica mais dura ainda, porque minúscula fecha antes de
// maiúscula: é isto que a coluna de redução responde.
//
//   node futgibi/marca/prova-logo3.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { CREME, PRETO, VERDE, FONTE_ARTE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const LOGO3 = path.join(AQUI, 'logo3');

const CEL_W = 430, CEL_H = 200, PAD = 30, ROT = 34, GAP = 16;
const MINI = [64, 32];                              // as duas reduções que importam

const ids = [...new Set((await readdir(LOGO3)).filter((f) => f.endsWith('.svg'))
  .map((f) => f.replace(/-(cor|mono|invertido)\.svg$/, '')))].sort();

const cabe = async (arq, w, h, fundo) => {
  const svg = await readFile(path.join(LOGO3, arq));
  const im = await sharp(svg).resize({ width: w - 24, height: h - 24, fit: 'inside' }).png().toBuffer();
  const m = await sharp(im).metadata();
  return sharp({ create: { width: w, height: h, channels: 4, background: fundo } })
    .composite([{ input: im, left: Math.round((w - m.width) / 2), top: Math.round((h - m.height) / 2) }])
    .png().toBuffer();
};

const rotulo = (txt, w, cor = CREME, tam = 15) => Buffer.from(
  `<svg width="${w}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="21" font-family='${FONTE_ARTE}' font-size="${tam}" font-weight="bold"
      letter-spacing="2" fill="${cor}">${txt}</text></svg>`);

const COLS = 3 * CEL_W + 2 * GAP + 200;
const linhas = [];
for (const [i, id] of ids.entries()) {
  const y = PAD + ROT + i * (CEL_H + ROT + GAP);
  linhas.push({ input: rotulo(id.toUpperCase(), 400), left: PAD, top: y - ROT + 6 });
  linhas.push({ input: await cabe(`${id}-cor.svg`, CEL_W, CEL_H, CREME), left: PAD, top: y });
  linhas.push({ input: await cabe(`${id}-mono.svg`, CEL_W, CEL_H, CREME), left: PAD + CEL_W + GAP, top: y });
  linhas.push({ input: await cabe(`${id}-invertido.svg`, CEL_W, CEL_H, VERDE), left: PAD + 2 * (CEL_W + GAP), top: y });
  // a coluna de redução: o mesmo logo a 64 e a 32
  let x = PAD + 3 * (CEL_W + GAP);
  for (const t of MINI) {
    const im = await sharp(await readFile(path.join(LOGO3, `${id}-cor.svg`)))
      .resize({ width: t, height: t, fit: 'inside' }).png().toBuffer();
    const m = await sharp(im).metadata();
    linhas.push({ input: im, left: x, top: y + Math.round((CEL_H - m.height) / 2) });
    x += t + 22;
  }
}

const FH = PAD * 2 + ids.length * (CEL_H + ROT + GAP);
const saida = path.join(AQUI, '_prova-logo3.png');
await sharp({ create: { width: COLS + PAD * 2, height: FH, channels: 4,
  background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite([
    { input: rotulo('cor', 200, CREME, 13), left: PAD, top: 6 },
    { input: rotulo('uma cor só', 200, CREME, 13), left: PAD + CEL_W + GAP, top: 6 },
    { input: rotulo('invertido', 200, CREME, 13), left: PAD + 2 * (CEL_W + GAP), top: 6 },
    { input: rotulo('64px · 32px', 200, CREME, 13), left: PAD + 3 * (CEL_W + GAP), top: 6 },
    ...linhas,
  ]).png().toFile(saida);
console.log(`OK -> ${saida}  (${ids.length} direções)`);
