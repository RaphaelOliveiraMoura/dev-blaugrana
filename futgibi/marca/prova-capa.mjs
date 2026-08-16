// A folha de prova das CAPAS: cada arte candidata montada DENTRO da capa do manual, com o
// cabeçalho verde, o corner box, o número e o cartucho por cima.
//
// POR QUE NÃO OLHAR A ARTE SOLTA: a capa não mostra a arte, mostra uma FAIXA dela com coisas
// desenhadas em cima. Foi exatamente assim que a capa anterior passou: a multidão era boa como
// ilustração e péssima como capa, porque na faixa ela virava uma parede de rostos cortados. A
// prova aqui é a mesma regra das outras peças da casa: aprove pelo que a plataforma MOSTRA, nunca
// pelo arquivo.
//
//   node futgibi/marca/prova-capa.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { VERDE, CREME, PAPEL, LARANJA, PRETO, FONTE_ARTE, FONTE_QUADRINHO,
  conferirFonte, tintaSobre, T } from './tokens.mjs';

await conferirFonte(sharp);

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');

// as medidas da capa do manual, em escala de prova (a capa real é fluida; aqui ela é 1200 de
// largura, que é a largura típica no desktop)
const W = 1200, TOPO = 132, MARGEM = 20, BORDA = 5;
const ARTE_W = W - MARGEM * 2;
const ARTE_H = Math.round(ARTE_W / 2);        // a faixa é 2:1, que é o formato em que a arte nasce
const H = TOPO + ARTE_H + 76;

const txt = (x, y, s, tam, cor, { esp = 1, anc = 'start', fonte = FONTE_ARTE, peso = 'bold' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family='${fonte}' font-size="${tam}"
    font-weight="${peso}" letter-spacing="${esp}" fill="${cor}">${s}</text>`;

const capa = async (nome) => {
  const arte = await sharp(path.join(ILUS, `${nome}.png`))
    .resize({ width: ARTE_W - BORDA * 2, height: ARTE_H - BORDA * 2, fit: 'cover' })
    .png().toBuffer();

  const cartucho = `A referência para criar qualquer peça da marca.`;
  // O SVG É A FRENTE, e não pode ter fundo: ele é composto DEPOIS da arte, então um rect de fundo
  // aqui pinta por cima dela (foi o que aconteceu na primeira rodada, e a prova saiu com quatro
  // quadros verdes vazios). O verde vem do `create` lá embaixo.
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- corner box -->
    <rect x="26" y="20" width="86" height="96" fill="${CREME}" stroke="${PRETO}" stroke-width="4"/>
    ${txt(69, 92, '12', 46, PRETO, { anc: 'middle', esp: 0 })}
    ${txt(69, 108, 'Fut Gibi', 10, PRETO, { anc: 'middle', esp: 1.5 })}
    <!-- masthead -->
    ${txt(130, 44, 'FUTEBOL EM QUADRINHOS · MANUAL DA MARCA', 13, CREME, { esp: 3 })}
    ${txt(128, 104, 'Fut Gibi', 62, CREME, { esp: -1 })}
    <rect x="130" y="112" width="150" height="7" fill="${LARANJA}"/>
    <!-- número e selo -->
    <rect x="${W - 148}" y="20" width="118" height="46" fill="${CREME}" stroke="${PRETO}" stroke-width="4"/>
    ${txt(W - 89, 52, 'Nº 1', 24, PRETO, { anc: 'middle', esp: 0 })}
    <circle cx="${W - 89}" cy="98" r="30" fill="${CREME}" stroke="${PRETO}" stroke-width="4"/>
    ${txt(W - 89, 95, 'VIGIA', 10, PRETO, { anc: 'middle', esp: 1 })}
    ${txt(W - 89, 107, 'APROVA', 10, PRETO, { anc: 'middle', esp: 1 })}
    <!-- moldura da arte -->
    <rect x="${MARGEM}" y="${TOPO}" width="${ARTE_W}" height="${ARTE_H}"
      fill="none" stroke="${PRETO}" stroke-width="${BORDA * 2}"/>
    <!-- o cartucho, onde ele pousa de verdade -->
    <rect x="${W / 2 - 330}" y="${TOPO + ARTE_H - 96}" width="660" height="66"
      fill="${CREME}" stroke="${PRETO}" stroke-width="4.5"/>
    ${txt(W / 2, TOPO + ARTE_H - 54, cartucho, 21, PRETO, { anc: 'middle', esp: 0, fonte: FONTE_QUADRINHO })}
    <!-- rodapé -->
    ${txt(26, H - 26, nome, 17, CREME, { esp: 2, fonte: FONTE_QUADRINHO })}
    ${txt(W - 26, H - 26, T.marca.dominio, 15, CREME, { esp: 2, anc: 'end' })}
  </svg>`;

  return sharp({ create: { width: W, height: H, channels: 4, background: VERDE } })
    .composite([
      { input: arte, top: TOPO + BORDA, left: MARGEM + BORDA },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ]).png().toBuffer();
};

const nomes = (await readdir(ILUS)).filter((f) => f.startsWith('capa-') && f.endsWith('.png'))
  .map((f) => f.replace('.png', '')).sort();
if (!nomes.length) { console.error('FAIL nenhuma capa-*.png em _ilustracoes/'); process.exit(1); }

const GAP = 26, PAD = 26;
const capas = [];
for (const [i, n] of nomes.entries())
  capas.push({ input: await capa(n), left: PAD, top: PAD + i * (H + GAP) });

const FH = PAD * 2 + nomes.length * H + (nomes.length - 1) * GAP;
const saida = path.join(AQUI, '_prova-capa.png');
await sharp({ create: { width: PAD * 2 + W, height: FH, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite(capas).png().toFile(saida);
console.log(`OK -> ${saida}  (${nomes.length} candidatas: ${nomes.join(', ')})`);
