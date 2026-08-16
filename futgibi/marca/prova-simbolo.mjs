// O SÍMBOLO SEM NOME, em leque (16/08/2026).
//
// POR QUE ISTO VOLTOU. O selo tem o nome desenhado dentro, e encostá-lo no wordmark escreve
// "Fut Gibi" duas vezes lado a lado. Foi o Raphael que viu na capa do manual, e é o mesmo
// problema que o selo nu resolvia antes de ser apagado. A diferença agora é o DESENHO: o selo nu
// era um quadrado verde com o 12, ou seja, um segundo EMBLEMA competindo com o primeiro. O que
// falta aqui é um símbolo que leia como REDUÇÃO da marca, não como outra marca.
//
// O TESTE QUE DECIDE é o da terceira coluna: o símbolo AO LADO DO WORDMARK. Uma peça pode ser
// bonita sozinha e brigar no lockup, e é exatamente ali que ela vai viver (capa do manual,
// cabeçalho do site, avatar ao lado do nome na rede).
//
//   node futgibi/marca/prova-simbolo.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREME, PRETO, LARANJA, VERDE, FONTE_ARTE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const IA = path.join(AQUI, '_logo-ia');
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// mesma cozinha do gerar-logo-oficial: fundo fora por inundação a partir da borda, cor
// normalizada pra paleta da marca. Sem isso as candidatas do modelo entram com o branco do
// modelo e um creme quase certo, e a comparação fica sobre a cor em vez de sobre a forma.
const DE_PARA = [
  { alvo: hex(PRETO), papel: 'tinta' },
  { alvo: hex(CREME), papel: 'papel' },
  { alvo: hex(LARANJA), papel: 'acento' },
  { alvo: hex(VERDE), papel: 'marca' },
];
const CORES = { tinta: PRETO, papel: CREME, acento: LARANJA, marca: VERDE };

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
    let melhor = null, dm = Infinity;
    for (const m of DE_PARA) {
      const d = (rgb[0] - m.alvo[0]) ** 2 + (rgb[1] - m.alvo[1]) ** 2 + (rgb[2] - m.alvo[2]) ** 2;
      if (d < dm) { dm = d; melhor = m; }
    }
    const novo = hex(CORES[melhor.papel]);
    data[n * c] = novo[0]; data[n * c + 1] = novo[1]; data[n * c + 2] = novo[2];
  }
  return sharp(data, { raw: { width: w, height: h, channels: c } }).trim({ threshold: 1 }).png().toBuffer();
};

// ---------------------------------------------------------------- as desenhadas por código ---
// Todas nascem do MESMO vocabulário do selo (moldura de gibi, bola de gomos, o 12), porque a
// pergunta não é "que símbolo bonito cabe aqui" e sim "que pedaço da marca sobrevive sozinho".
const svg = (dentro, W = 300, H = 300) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${dentro}</svg>`);

const bolaGomos = (cx, cy, r, t = 18) => {
  const p = [];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + k * 2 * Math.PI / 5;
    p.push([cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42]);
  }
  const pent = p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const raios = p.map(([x, y], k) => {
    const a = -Math.PI / 2 + k * 2 * Math.PI / 5;
    return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(cx + Math.cos(a) * r).toFixed(1)}"
      y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="${PRETO}" stroke-width="${t * 0.62}" stroke-linecap="round"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREME}" stroke="${PRETO}" stroke-width="${t}"/>
    <polygon points="${pent}" fill="${PRETO}"/>${raios}`;
};

// A BOLA DESENHADA POR CÓDIGO FOI DESCARTADA na primeira folha: pentágono central com cinco
// raios lê como RODA ou estrela, não como bola, e piorava justamente na redução. Gomos de bola
// são projeção de icosaedro truncado numa esfera, e aproximar isso com linha reta não engana o
// olho. As candidatas de bola vêm do modelo, que desenha os gomos certos.
const DESENHADAS = {
  // o número do mascote como disco: sem bola, sem moldura, só o 12 que já identifica a marca
  'disco-12': svg(`
    <circle cx="150" cy="150" r="120" fill="${VERDE}" stroke="${PRETO}" stroke-width="24"/>
    <circle cx="150" cy="150" r="86" fill="${CREME}"/>
    <text x="150" y="196" text-anchor="middle" font-family='${FONTE_ARTE}' font-size="126"
      font-weight="700" letter-spacing="-4" fill="${PRETO}">12</text>`),
};

// ---------------------------------------------------------------- a folha ---------------------
const DO_MODELO = ['codex-simbolo-bola-balao', 'codex-simbolo-camisa-12', 'codex-simbolo-gibi-bola',
  'codex-simbolo-cabeca-balao'];
const CEL = 190, PAD = 34, ROT = 30, GAP = 26, LINHA = 200;

const rotulo = (txt, w, tam = 14, cor = CREME) => Buffer.from(
  `<svg width="${w}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="19" font-family='${FONTE_ARTE}' font-size="${tam}" font-weight="bold"
      letter-spacing="1.4" fill="${cor}">${txt}</text></svg>`);

const wordmark = await sharp(path.join(AQUI, 'logo/wordmark-cor.png')).resize({ height: 62 }).png().toBuffer();
const wm = await sharp(wordmark).metadata();

const candidatas = [];
for (const [id, buf] of Object.entries(DESENHADAS)) {
  candidatas.push([id, await sharp(buf).png().toBuffer()]);
}
for (const id of DO_MODELO) {
  candidatas.push([id.replace('codex-simbolo-', ''), await preparar(path.join(IA, `${id}.png`))]);
}

// as três colunas têm x FIXO, senão a do lockup avança sobre a da redução no símbolo mais largo
const COL_A = PAD;                       // sozinho
const COL_B = COL_A + CEL + GAP;         // símbolo + wordmark
const LARG_B = 96 + 18 + wm.width;
const COL_C = COL_B + LARG_B + GAP * 2;  // as reduções
const W = COL_C + 150 + PAD;
const H = PAD * 2 + ROT + candidatas.length * (LINHA + GAP);
const camadas = [
  { input: rotulo('sozinho', 200, 13), left: COL_A, top: 8 },
  { input: rotulo('ao lado do wordmark  ·  o teste que decide', 420, 13), left: COL_B, top: 8 },
  { input: rotulo('48px  ·  28px', 200, 13), left: COL_C, top: 8 },
];

for (const [i, [id, png]] of candidatas.entries()) {
  const y = PAD + ROT + i * (LINHA + GAP);
  camadas.push({ input: rotulo(id.toUpperCase(), 300, 15, LARANJA), left: PAD, top: y - 4 });

  const grande = await sharp(png).resize({ width: CEL - 40, height: LINHA - 66, fit: 'inside' }).png().toBuffer();
  const gm = await sharp(grande).metadata();
  camadas.push({ input: grande, left: COL_A + Math.round((CEL - gm.width) / 2), top: y + 30 });

  // o lockup: símbolo + wordmark na mesma linha de base, como na capa. O símbolo entra pela
  // ALTURA (76px), que é como ele vive ao lado do nome, e não por largura.
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
}

const saida = path.join(AQUI, '_prova-simbolo.png');
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite(camadas).png().toFile(saida);
console.log(`OK -> ${saida}  (${candidatas.length} candidatas)`);

// ---------------------------------------------------------------- o acabamento do favorito ---
// A segunda folha responde à pergunta seguinte: se o símbolo for a bola-balão, com que
// ACABAMENTO ele vira favicon? Solto ele é preto e creme, sem nenhuma cor da marca, e numa aba
// com quinze irmãos é a mancha que identifica. As três opções mudam só o que fica ATRÁS.
{
  const base = await preparar(path.join(IA, 'codex-simbolo-bola-balao.png'));
  const m = await sharp(base).metadata();
  const L = 260, r = 26;
  const dentro = await sharp(base).resize({ width: Math.round(L * 0.74), height: Math.round(L * 0.74),
    fit: 'inside' }).png().toBuffer();
  const dm = await sharp(dentro).metadata();
  const centro = { left: Math.round((L - dm.width) / 2), top: Math.round((L - dm.height) / 2) };
  const fundos = {
    solto: null,
    'bloco verde': `<rect x="6" y="6" width="${L - 12}" height="${L - 12}" rx="${r}" fill="${VERDE}"
      stroke="${PRETO}" stroke-width="12"/>`,
    'disco verde': `<circle cx="${L / 2}" cy="${L / 2}" r="${L / 2 - 8}" fill="${VERDE}"
      stroke="${PRETO}" stroke-width="12"/>`,
  };
  const linhas = [], PADB = 30, CELB = 300;
  let i = 0;
  for (const [nome, fundo] of Object.entries(fundos)) {
    const peca = await sharp({ create: { width: L, height: L, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([...(fundo ? [{ input: svg(fundo, L, L), top: 0, left: 0 }] : []),
        { input: dentro, ...centro }])
      .png().toBuffer();
    const x = PADB + i * CELB;
    linhas.push({ input: await sharp(peca).resize({ width: 190 }).png().toBuffer(), left: x, top: 46 });
    linhas.push({ input: rotulo(nome.toUpperCase(), 260, 14, LARANJA), left: x, top: 12 });
    let xr = x, yr = 260;
    for (const t of [64, 40, 24]) {
      linhas.push({ input: await sharp(peca).resize({ width: t, height: t, fit: 'inside' }).png().toBuffer(),
        left: xr, top: yr + (64 - t) });
      xr += t + 18;
    }
    i++;
  }
  const saida2 = path.join(AQUI, '_prova-simbolo-favicon.png');
  await sharp({ create: { width: PADB * 2 + CELB * 3 - 110, height: 360, channels: 4,
    background: { r: 24, g: 24, b: 26, alpha: 1 } } })
    .composite([{ input: rotulo('bola-balão: 64px · 40px · 24px', 400, 13), left: PADB, top: 322 }, ...linhas])
    .png().toFile(saida2);
  console.log(`OK -> ${saida2}`);
}
