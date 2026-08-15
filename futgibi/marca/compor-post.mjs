// Três formas de ENCAIXAR a ilustração com o texto, porque o encaixe é o que estava falhando.
//
// O DIAGNÓSTICO: a arte e o texto falavam línguas diferentes. A ilustração tem paleta própria
// (tons de pele, um verde de grama que não é o verde da marca, um creme que não é o creme da
// marca) e o texto entrava em bloco chapado com contorno duro. Duas linguagens coladas, sem
// transição: por isso parecia adesivo sobre foto, não peça única.
//
// As três pontes, da mais leve pra mais forte:
//   A. PEÇA      · o texto entra nas peças desenhadas (tarja e moldura de traço trêmulo), então
//                  arte e texto passam a compartilhar o TRAÇO. Não mexe na imagem.
//   B. PALETA    · a ilustração é remapeada pra rampa de cor da marca. Não mexe no layout.
//   C. AS DUAS   · traço igual e paleta igual.
//
//   node futgibi/marca/compor-post.mjs [--arte=roda]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { VERDE, VERDE_FUNDO, CREME, CREME_SOMBRA, PAPEL, LARANJA, PRETO, caber, FONTE_ARTE, conferirFonte } from './tokens.mjs';

await conferirFonte(sharp);   // a arte não sai em fallback silencioso

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');
const SVG = path.join(AQUI, 'svg');
const SAIDA = path.join(AQUI, '_variacoes-encaixe');
const W = 1080, H = 1440, CX = W / 2;
const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const arte = flag('arte', 'roda');

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------------------------------------------------------------- B. a rampa da marca ---------
// Remapeia a LUMINÂNCIA da ilustração numa rampa de cinco paradas feitas só de cor da marca. É o
// que uma direção de imagem faz: a foto (ou o desenho) para de ter paleta própria e passa a ter a
// da marca. Aqui a rampa é quente e vai do preto de contorno ao creme de papel, passando pelo
// verde, então o desenho perde os tons de pele e ganha ar de impressão de duas tintas.
const RAMPA = [
  [0.00, hex(PRETO)],
  [0.30, hex(VERDE_FUNDO)],
  [0.55, hex(VERDE)],
  [0.80, hex(CREME_SOMBRA)],
  [1.00, hex(CREME)],
];
const rampear = async (src, forca = 1) => {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const l = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
    let j = 0;
    while (j < RAMPA.length - 2 && l > RAMPA[j + 1][0]) j++;
    const [l0, c0] = RAMPA[j], [l1, c1] = RAMPA[j + 1];
    const k = (l - l0) / (l1 - l0 || 1);
    for (let ch = 0; ch < 3; ch++) {
      const alvo = c0[ch] + (c1[ch] - c0[ch]) * k;
      data[i + ch] = Math.round(data[i + ch] * (1 - forca) + alvo * forca);
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png().toBuffer();
};

// ---------------------------------------------------------------- as peças, coloridas ---------
const peca = async (nome, largura, { tinta = PRETO, fundo = CREME } = {}) => {
  const s = (await readFile(path.join(SVG, `${nome}.svg`), 'utf8'))
    .replace(/currentColor/g, tinta)
    .replace(/var\(--peca-fundo, #F3E7D0\)/g, fundo);
  return sharp(Buffer.from(s)).resize({ width: largura }).png().toBuffer();
};

const txt = (x, y, s, tam, cor, { esp = 1, anc = 'middle' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family='${FONTE_ARTE}' font-size="${tam}"
    font-weight="bold" letter-spacing="${esp}" fill="${cor}">${s}</text>`;
const camada = (svg) => ({ top: 0, left: 0,
  input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`) });

const CONVITE = ['FAÇA PARTE DA MAIOR', 'COMUNIDADE DE', 'QUADRINHOS DE FUTEBOL', 'DO BRASIL.'];
const TAM = caber(CONVITE, 66);

// o texto do rodapé, comum às três
const rodape = (yBase, cor) => `
  ${CONVITE.map((l, i) => txt(CX, yBase + i * TAM * 1.08, l, TAM, cor)).join('')}
  ${txt(CX, yBase + 4 * TAM * 1.08 + 26, 'Aqui não tem clube. Cabe o Brasil inteiro.', 34, LARANJA, { esp: 0 })}`;

await mkdir(SAIDA, { recursive: true });
const src = path.join(ILUS, `${arte}.png`);

// A imagem entra numa JANELA, não no quadro inteiro: a moldura desenhada em volta é o que faz a
// ilustração pertencer à página em vez de ser o papel de parede dela.
const JAN = { x: 54, y: 54, w: W - 108, h: 700 };

// O FUNDO era sempre verde chapado, e verde chapado atrás de uma ilustração cheia de verde é o
// que fazia a peça achatar: dois verdes brigando, sem hierarquia entre arte e página.
const FUNDOS = {
  verde:   { cor: VERDE, texto: CREME, trama: null },
  papel:   { cor: PAPEL, texto: PRETO, trama: null },
  trama:   { cor: PAPEL, texto: PRETO, trama: 'ben' },
  rede:    { cor: VERDE, texto: CREME, trama: 'rede' },
  sangra:  { cor: PRETO, texto: CREME, trama: null, cheio: true },
};

const montar = async (id, { comPaleta, comPeca, forca = 0.85, fundo = 'verde' }) => {
  const f = FUNDOS[fundo];
  const img = comPaleta ? await rampear(src, forca) : src;
  const jan = f.cheio ? { x: 0, y: 0, w: W, h: 880 } : JAN;
  const janela = await sharp(img)
    .resize({ width: jan.w, height: jan.h, fit: 'cover', position: 'top' }).png().toBuffer();

  const trama = f.trama === 'ben'
    ? `<defs><pattern id="p" width="13" height="13" patternUnits="userSpaceOnUse">
        <circle cx="6.5" cy="6.5" r="2.4" fill="${PRETO}" opacity="0.13"/></pattern></defs>
       <rect width="${W}" height="${H}" fill="url(#p)"/>`
    : f.trama === 'rede'
    ? `<defs><pattern id="p" width="70" height="70" patternUnits="userSpaceOnUse">
        <path d="M0,0 L70,70 M70,0 L0,70" stroke="${CREME}" stroke-width="3" opacity="0.14" fill="none"/>
      </pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>` : '';

  const camadas = [
    camada(`<rect width="${W}" height="${H}" fill="${f.cor}"/>${trama}`),
    { input: janela, top: jan.y, left: jan.x },
  ];

  if (comPeca) {
    // a moldura de traço trêmulo POR CIMA da imagem: é a ponte de traço entre arte e página
    if (!f.cheio) camadas.push({ input: await peca('moldura-larga', jan.w + 24, { tinta: PRETO, fundo: 'none' }),
      top: jan.y - 24, left: jan.x - 12 });
    // e a tarja desenhada carrega o selo, em vez do retângulo chapado
    camadas.push({ input: await peca('tarja-reta', 560, { tinta: PRETO, fundo: LARANJA }),
      top: 20, left: CX - 280 });
    camadas.push(camada(txt(CX, 82, 'COMEÇA HOJE', 40, PRETO, { esp: 5 })));
  } else {
    camadas.push(camada(`<rect x="${CX - 250}" y="24" width="500" height="76" fill="${LARANJA}"
      stroke="${PRETO}" stroke-width="7"/>` + txt(CX, 80, 'COMEÇA HOJE', 40, PRETO, { esp: 5 })));
  }

  const yBase = jan.y + jan.h + (f.cheio ? 40 : 54);
  camadas.push(camada(`
    <rect x="0" y="${yBase}" width="${W}" height="8" fill="${PRETO}"/>
    ${rodape(yBase + 96, f.texto)}
    ${txt(CX, H - 54, '@futgibi', 44, f.texto, { esp: 8 })}`));

  const arq = path.join(SAIDA, `${id}.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: VERDE } })
    .composite(camadas).png().toFile(arq);
  console.log('OK ->', arq);
  return arq;
};

// A FORÇA da rampa é a decisão fina: em 0.85 a ilustração perde os tons de pele e vira duas
// tintas; em 0.45 ela só é puxada pra família da marca e o desenho continua sendo desenho.
for (const fundo of Object.keys(FUNDOS))
  await montar(fundo, { comPaleta: true, comPeca: true, forca: 0.6, fundo });

// folha comparativa
const TW = 300, GAP = 18, PAD = 22, ROT = 30;
const nomes = Object.keys(FUNDOS);
const pecas = [];
for (const [i, n] of nomes.entries()) {
  pecas.push({ input: await sharp(path.join(SAIDA, `${n}.png`)).resize({ width: TW }).png().toBuffer(),
    left: PAD + i * (TW + GAP), top: PAD + ROT });
}
const FW = PAD * 2 + nomes.length * TW + (nomes.length - 1) * GAP;
const FH = PAD * 2 + ROT + Math.round(TW * H / W);
const rot = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">${nomes
  .map((n, i) => `<text x="${PAD + i * (TW + GAP)}" y="${PAD + 20}" font-family='${FONTE_ARTE}'
    font-size="17" font-weight="bold" fill="#F3E7D0">${n}</text>`).join('')}</svg>`;
await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 26, g: 26, b: 28, alpha: 1 } } })
  .composite([...pecas, { input: Buffer.from(rot), left: 0, top: 0 }])
  .png().toFile(path.join(SAIDA, '_folha.png'));
console.log('OK ->', path.join(SAIDA, '_folha.png'));
