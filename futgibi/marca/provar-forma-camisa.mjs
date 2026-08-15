// A FORMA da camisa, antes de qualquer tratamento.
//
// A rodada anterior aplicou seis acabamentos sobre UMA forma, e a forma estava errada. A tentativa
// seguinte errou pior: o path era montado com aritmética em cima do centro (`cx - ax`) e a AXILA
// caía mais pra fora que a ponta da manga, então a manga colapsava e a camisa virava um retângulo
// chanfrado. Coordenada relativa em desenho é onde o erro se esconde.
//
// Aqui os doze pontos são ABSOLUTOS e nomeados. Dá pra conferir a olho antes de renderizar: a
// ponta da manga tem que ser o ponto mais externo, a boca da manga o mais baixo dela, e a axila
// tem que estar DENTRO do corpo.
//
//   node futgibi/marca/provar-forma-camisa.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { CREME, PRETO, PAPEL } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'camisa-forma');

// gola(x,y) · ombro(x,y) · manga: ponta(x,y) e boca(x,y) · axila(x,y) · corpo(x) · barra(y)
const forma = ({
  golaX = 164, golaY = 76, decote = 120,
  ombroX = 118, ombroY = 64,
  pontaX = 56, pontaY = 110,
  bocaX = 88, bocaY = 176,
  axilaX = 130, axilaY = 150,
  corpoX = 126, barraY = 344,
  redonda = false, curva = 0,
} = {}) => {
  const e = (x) => 400 - x;                       // espelha pro lado direito
  const c = curva;                                 // 0 = reto, >0 = ombro e barra curvos
  const decoteD = redonda
    ? `C ${golaX},${decote} ${e(golaX)},${decote} ${e(golaX)},${golaY}`
    : `L 200,${decote} L ${e(golaX)},${golaY}`;
  return `M ${golaX},${golaY}
    ${c ? `C ${golaX - 18},${golaY - 8} ${ombroX + 18},${ombroY - 4} ${ombroX},${ombroY}`
        : `L ${ombroX},${ombroY}`}
    L ${pontaX},${pontaY}
    L ${bocaX},${bocaY}
    L ${axilaX},${axilaY}
    L ${corpoX},${barraY}
    L ${e(corpoX)},${barraY}
    L ${e(axilaX)},${axilaY}
    L ${e(bocaX)},${bocaY}
    L ${e(pontaX)},${pontaY}
    L ${e(ombroX)},${ombroY}
    ${c ? `C ${e(ombroX) - 18},${ombroY - 4} ${e(golaX) + 18},${golaY - 8} ${e(golaX)},${golaY}`
        : `L ${e(golaX)},${golaY}`}
    ${decoteD} Z`.replace(/\s+/g, ' ');
};

const FORMAS = {
  '1-classica':     forma(),
  '2-ombro-caido':  forma({ ombroX: 126, ombroY: 70, pontaX: 48, pontaY: 124, bocaX: 84, bocaY: 190 }),
  '3-manga-curta':  forma({ pontaX: 76, pontaY: 104, bocaX: 104, bocaY: 158, axilaX: 132, axilaY: 140 }),
  '4-gola-redonda': forma({ redonda: true, golaX: 158, decote: 112 }),
  '5-cintura':      forma({ corpoX: 138, axilaX: 132, barraY: 336 }),
  '6-organica':     forma({ curva: 1, redonda: true, golaX: 158, decote: 112, barraY: 338 }),
};

const UM = 'M 150,168 L 176,152 L 190,152 L 190,262 L 208,262 L 208,282 L 152,282 L 152,262 ' +
           'L 172,262 L 172,178 L 156,187 Z';
const DOIS = 'M 216,186 C 216,162 234,151 254,151 C 276,151 292,164 292,187 C 292,209 276,221 ' +
             '257,238 L 232,261 L 293,261 L 293,282 L 215,282 L 215,262 C 236,242 248,233 ' +
             '261,220 C 269,211 272,200 272,188 C 272,175 265,170 254,170 C 243,170 236,176 ' +
             '236,190 Z';
const DOZE = (fill) => `<g transform="translate(200,238) scale(0.78) translate(-221,-216)"
    fill="${fill}"><path d="${UM}"/><path d="${DOIS}"/></g>`;

await mkdir(SAIDA, { recursive: true });
const ids = Object.keys(FORMAS);
for (const [id, d] of Object.entries(FORMAS)) {
  await writeFile(path.join(SAIDA, `${id}-cheia.svg`),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" fill="${PAPEL}"/>
  <path d="${d}" fill="${PRETO}"/>${DOZE(CREME)}</svg>`);
  await writeFile(path.join(SAIDA, `${id}-linha.svg`),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" fill="${PAPEL}"/>
  <path d="${d}" fill="none" stroke="${PRETO}" stroke-width="14" stroke-linejoin="round"/>
  ${DOZE(PRETO)}</svg>`);
}

const TW = 220, GAP = 14, PAD = 22, ROT = 28;
const cells = [];
for (const [i, id] of ids.entries()) {
  const y = PAD + ROT + i * (TW + GAP + ROT);
  for (const [j, v] of ['cheia', 'linha'].entries())
    cells.push({ input: await sharp(Buffer.from(await readFile(path.join(SAIDA, `${id}-${v}.svg`), 'utf8')))
      .resize({ width: TW }).png().toBuffer(), left: PAD + j * (TW + GAP), top: y });
  const cheia = Buffer.from(await readFile(path.join(SAIDA, `${id}-cheia.svg`), 'utf8'));
  for (const [k, px] of [64, 34].entries())
    cells.push({ input: await sharp(cheia).resize({ width: px }).png().toBuffer(),
      left: PAD + 2 * (TW + GAP) + k * 84, top: y + Math.round((TW - px) / 2) });
}
const FW = PAD * 2 + 2 * (TW + GAP) + 180, FH = PAD * 2 + ids.length * (TW + GAP + ROT);
const rot = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">${ids
  .map((id, i) => `<text x="${PAD}" y="${PAD + 19 + i * (TW + GAP + ROT)}" font-family="Helvetica"
    font-size="17" font-weight="bold" fill="${PRETO}">${i + 1}. ${id.slice(2)}</text>`).join('')}
  <text x="${PAD}" y="${FH - 6}" font-family="Helvetica" font-size="13" fill="${PRETO}">cheia · contorno · 64px / 34px</text></svg>`;
await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 237, g: 224, b: 198, alpha: 1 } } })
  .composite([...cells, { input: Buffer.from(rot), left: 0, top: 0 }])
  .png().toFile(path.join(AQUI, '_prova-forma-camisa.png'));
console.log('OK ->', path.join(AQUI, '_prova-forma-camisa.png'));
