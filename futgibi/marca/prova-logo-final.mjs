// A FOLHA DA RODADA FINAL: três blocos, um por finalista, cada um abrindo com a peça da RESERVA
// como régua e as quatro variações de cor/tom/detalhe embaixo. As colunas de sempre (sozinho ·
// no lockup · reduzido), e a decisão desta folha é uma só: qual peça combina mais com o
// wordmark. Por isso o lockup é a coluna do meio e a maior.
//
//   node futgibi/marca/prova-logo-final.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import { CREME, VERDE, PRETO, LARANJA, FONTE_ARTE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(AQUI, '_logo-final');
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const DE_PARA = [hex(PRETO), hex(CREME), hex(LARANJA), hex(VERDE)];
const CORES = [PRETO, CREME, LARANJA, VERDE];

const preparar = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const claro = (n) => data[n * c] >= 232 && data[n * c + 1] >= 232 && data[n * c + 2] >= 232;
  const fundo = new Uint8Array(w * h), fila = new Int32Array(w * h);
  let i = 0, f = 0;
  const semear = (n) => { if (!fundo[n] && claro(n)) { fundo[n] = 1; fila[f++] = n; } };
  for (let x = 0; x < w; x++) { semear(x); semear((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semear(y * w); semear(y * w + w - 1); }
  while (i < f) {
    const n = fila[i++], x = n % w, y = (n / w) | 0;
    if (x > 0) semear(n - 1);
    if (x < w - 1) semear(n + 1);
    if (y > 0) semear(n - w);
    if (y < h - 1) semear(n + w);
  }
  for (let n = 0; n < w * h; n++) {
    if (fundo[n]) { data[n * c + 3] = 0; continue; }
    const rgb = [data[n * c], data[n * c + 1], data[n * c + 2]];
    let melhor = 0, dm = Infinity;
    for (const [k, alvo] of DE_PARA.entries()) {
      const d = (rgb[0] - alvo[0]) ** 2 + (rgb[1] - alvo[1]) ** 2 + (rgb[2] - alvo[2]) ** 2;
      if (d < dm) { dm = d; melhor = k; }
    }
    const novo = hex(CORES[melhor]);
    data[n * c] = novo[0]; data[n * c + 1] = novo[1]; data[n * c + 2] = novo[2];
  }
  return sharp(data, { raw: { width: w, height: h, channels: c } }).trim({ threshold: 1 }).png().toBuffer();
};

const CEL = 190, PAD = 34, ROT = 30, GAP = 26, LINHA = 200, BLOCO = 46;
const rotulo = (txt, w, tam = 14, cor = CREME) => Buffer.from(
  `<svg width="${w}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="19" font-family='${FONTE_ARTE}' font-size="${tam}" font-weight="bold"
      letter-spacing="1.4" fill="${cor}">${txt}</text></svg>`);

const wordmark = await sharp(path.join(AQUI, 'logo/wordmark-cor.png')).resize({ height: 62 }).png().toBuffer();
const wm = await sharp(wordmark).metadata();

// os blocos: a régua da reserva + as variações geradas, na ordem do funil
const ICONES = ['apito-balao', 'painel-bola', 'camisa-12'];
const arquivos = (await readdir(DIR)).filter((x) => x.endsWith('.png'));
const blocos = [];
for (const icone of ICONES) {
  const linhas = [['régua (reserva)',
    await sharp(path.join(AQUI, `icones-reserva/${icone}.png`)).png().toBuffer()]];
  for (const f of arquivos.filter((x) => x.startsWith(`${icone}--`)).sort()) {
    linhas.push([f.replace(`${icone}--`, '').replace('.png', ''), await preparar(path.join(DIR, f))]);
  }
  blocos.push([icone, linhas]);
}

const COL_A = PAD;
const COL_B = COL_A + CEL + GAP;
const COL_C = COL_B + 96 + 18 + wm.width + GAP * 2;
const W = COL_C + 150 + PAD;
const total = blocos.reduce((a, [, l]) => a + l.length, 0);
const H = PAD * 2 + ROT + total * (LINHA + GAP) + blocos.length * BLOCO;
const camadas = [
  { input: rotulo('sozinho', 200, 13), left: COL_A, top: 8 },
  { input: rotulo('no lockup  ·  o teste que decide', 420, 13), left: COL_B, top: 8 },
  { input: rotulo('48px  ·  28px', 200, 13), left: COL_C, top: 8 },
];

let y = PAD + ROT;
for (const [icone, linhas] of blocos) {
  camadas.push({ input: rotulo(`━━ ${icone.toUpperCase()} ━━`, 500, 17, LARANJA), left: PAD, top: y + 8 });
  y += BLOCO;
  for (const [id, png] of linhas) {
    camadas.push({ input: rotulo(id.toUpperCase(), 300, 14,
      id.startsWith('régua') ? CREME : '#9adBa3'), left: PAD, top: y - 2 });
    const grande = await sharp(png).resize({ width: CEL - 40, height: LINHA - 66, fit: 'inside' }).png().toBuffer();
    const gm = await sharp(grande).metadata();
    camadas.push({ input: grande, left: COL_A + Math.round((CEL - gm.width) / 2), top: y + 30 });
    const marca = await sharp(png).resize({ height: 76 }).png().toBuffer();
    const mm = await sharp(marca).metadata();
    camadas.push({ input: marca, left: COL_B, top: y + 56 });
    camadas.push({ input: wordmark, left: COL_B + mm.width + 18, top: y + 64 });
    let x = COL_C;
    for (const t of [48, 28]) {
      camadas.push({ input: await sharp(png).resize({ width: t, height: t, fit: 'inside' }).png().toBuffer(),
        left: x, top: y + 66 });
      x += t + 26;
    }
    y += LINHA + GAP;
  }
}

const saida = path.join(AQUI, '_prova-logo-final.png');
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite(camadas).png().toFile(saida);
console.log(`OK -> ${saida}  (${blocos.length} finalistas, ${total} linhas)`);
