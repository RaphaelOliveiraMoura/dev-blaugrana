// COMPOSIÇÃO v3: o laboratório com os assets do Grok (15/08/2026).
//
// O pedido do Raphael que criou este arquivo: "eu queria algo diferencial, utilizar assets para
// ajudar a compor, assets auxiliares de detalhe, composições melhores feitas". A v2 tinha DUAS
// composições e as duas usavam a mesma multidão; aqui são SEIS candidatas, cada uma testando um
// jeito diferente de a arte, os spots e as peças desenhadas trabalharem juntos. É folha de
// escolha, não acervo: o que o Raphael aprovar olhando vira o exemplo do manual.
//
//   node futgibi/marca/compor-v3.mjs [--so=heroi]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import {
  VERDE, VERDE_FUNDO, CREME, PAPEL, LARANJA, PRETO, caber, tintaSobre, FONTE_ARTE,
  conferirFonte, CONVITE, CONVITE_APOIO, CHAMADA, HANDLE, POST,
} from './tokens.mjs';

await conferirFonte(sharp);

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');
const SPOTS = path.join(AQUI, 'spots');
const SVG = path.join(AQUI, 'svg');
const SAIDA = path.join(AQUI, '_variacoes-composicao');
const W = POST.w, H = POST.h, CX = W / 2;
const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const txt = (x, y, s, tam, cor, { esp = 1, anc = 'middle' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family='${FONTE_ARTE}' font-size="${tam}"
    font-weight="bold" letter-spacing="${esp}" fill="${cor}">${s}</text>`;
const camada = (svg) => ({ top: 0, left: 0,
  input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`) });

// peça desenhada (balão, moldura), colorida na hora
const peca = async (nome, largura, { tinta = PRETO, fundo = CREME } = {}) => {
  const s = (await readFile(path.join(SVG, `${nome}.svg`), 'utf8'))
    .replace(/currentColor/g, tinta)
    .replace(new RegExp(`var\\(--peca-fundo, ${CREME}\\)`, 'g'), fundo);
  return sharp(Buffer.from(s)).resize({ width: largura }).png().toBuffer();
};

// spot recortado, com escala e rotação leve (o torto de figurinha colada)
const spot = async (nome, largura, giro = 0) => {
  let s = sharp(path.join(SPOTS, `${nome}.png`)).resize({ width: largura });
  if (giro) s = s.rotate(giro, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  return s.png().toBuffer();
};

// ---------------------------------------------------------------- a tinta por COR -------------
// A v2 tingia por LINHA (do y tal pra baixo), o que serve quando o vazio é um bloco horizontal.
// Aqui a grama aparece em volta do personagem, então a tinta escolhe por COR: todo pixel que é
// grama (matiz de verde) é puxado pro verde da marca, com o grão preservado, e pele, camisa e
// traço ficam intactos. É o que resolve o "quatro verdes diferentes" sem lavar ninguém.
const tingirGrama = async (buf, { cor = VERDE, forca = 0.92 } = {}) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [cr, cg, cb] = hex(cor);
  const lumi = (i) => data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
  let soma = 0, n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (g > r + 12 && g > b + 12) { soma += lumi(i); n++; }
  }
  const media = soma / Math.max(1, n);
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (!(g > r + 12 && g > b + 12)) continue;          // só o que é verde de verdade
    const gr = Math.max(0.86, Math.min(1.14, lumi(i) / (media || 1)));
    for (const [ch, alvo] of [[0, cr], [1, cg], [2, cb]])
      data[i + ch] = Math.round(data[i + ch] * (1 - forca) + Math.max(0, Math.min(255, alvo * gr)) * forca);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
};

// céu mosqueado -> papel da marca: pixel CLARO e pouco saturado é céu, o resto fica
const tingirCeu = async (buf, { cor = PAPEL, forca = 0.85 } = {}) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [cr, cg, cb] = hex(cor);
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mn < 128 || mx - mn > 74) continue;   // o mosqueado do Grok chega a rosa (230,180,170)
    if (g > r + 12 && g > b + 12) continue;             // verde claro é grama, não céu
    for (const [ch, alvo] of [[0, cr], [1, cg], [2, cb]])
      data[i + ch] = Math.round(data[i + ch] * (1 - forca) + alvo * forca);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
};

// corta a borda de papel que o Grok desenha em volta e cobre o quadro 3:4
const arte34 = async (nome, { borda = 0.035, pos = 'centre' } = {}) => {
  const src = path.join(ILUS, `${nome}.png`);
  const m = await sharp(src).metadata();
  const bx = Math.round(m.width * borda), by = Math.round(m.height * borda);
  return sharp(src)
    .extract({ left: bx, top: by, width: m.width - bx * 2, height: m.height - by * 2 })
    .resize({ width: W, height: H, fit: 'cover', position: pos }).png().toBuffer();
};

const selo = (x, y, texto = 'COMEÇA HOJE', larg = 436) =>
  `<g transform="translate(${x}, ${y}) rotate(-2.4)">
    <rect x="${-larg / 2 + 7}" y="7" width="${larg}" height="72" fill="${PRETO}"/>
    <rect x="${-larg / 2}" y="0" width="${larg}" height="72" fill="${LARANJA}"
      stroke="${PRETO}" stroke-width="7"/>
    ${txt(0, 50, texto, 38, tintaSobre(LARANJA), { esp: 5 })}</g>`;

const bloco = (yTopo, fundo, tam, { linhas = CONVITE, apoio = true } = {}) => {
  const cor = tintaSobre(fundo);
  const corpo = linhas.map((l, i) => txt(CX, yTopo + i * tam * 1.06, l, tam, cor)).join('');
  const yFim = yTopo + linhas.length * tam * 1.06;
  return `${corpo}
    ${apoio ? txt(CX, yFim + 22, CONVITE_APOIO, 34, tintaSobre(fundo, { destaque: true }), { esp: 0 }) : ''}
    ${txt(CX, yFim + (apoio ? 96 : 30), HANDLE, 44, cor, { esp: 8 })}`;
};
const alturaBloco = (tam, linhas = CONVITE.length) => linhas * tam * 1.06 + 96;

// os padrões da marca, desenhados inline (o mesmo desenho dos SVG do acervo)
const PADRAO = {
  rede: (tinta, op = 0.13) => `<defs><pattern id="p" width="110" height="110" patternUnits="userSpaceOnUse">
    <path d="M0,0 L110,110 M110,0 L0,110" stroke="${tinta}" stroke-width="4" opacity="${op}" fill="none"/>
  </pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`,
  pontos: (tinta, op = 0.1) => `<defs><pattern id="p" width="42" height="42" patternUnits="userSpaceOnUse">
    <circle cx="10" cy="10" r="4" fill="${tinta}" opacity="${op}"/>
    <circle cx="31" cy="31" r="4" fill="${tinta}" opacity="${op}"/>
  </pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`,
  campo: (tinta, op = 0.14) => `<defs><pattern id="p" width="220" height="220" patternUnits="userSpaceOnUse">
    <g stroke="${tinta}" stroke-width="5" fill="none" opacity="${op}">
      <path d="M 0,42 A 42,42 0 0 0 42,0"/><path d="M 178,0 A 42,42 0 0 0 220,42"/>
      <path d="M 220,178 A 42,42 0 0 0 178,220"/><path d="M 42,220 A 42,42 0 0 0 0,178"/>
    </g><circle cx="110" cy="110" r="6" fill="${tinta}" opacity="${op}"/>
  </pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`,
};

// ================================================================= as seis candidatas =========
const CANDIDATAS = {
  // 1. RESPIRO com a arte nova: a turma grande em cima, o chão da própria cena tingido no verde
  respiro: async () => {
    const tam = await caber(sharp, CONVITE, 62);
    const arte = await tingirGrama(await arte34('topo2', { pos: 'top' }));
    const CHAO = 880;    // MEDIDO na arte 3:4: onde a grama começa
    return {
      camadas: [{ input: arte, top: 0, left: 0 }],
      frente: `${selo(CX, 40)}
        ${bloco(Math.round((CHAO + H) / 2 - alturaBloco(tam) / 2 + 20), VERDE, tam)}`,
    };
  },

  // 2. FAIXA com a mureta: o apoio físico que a fileira solta não tinha. Um detalhe de spot no
  //    céu (a nota da resenha) pra provar o que um auxiliar faz: preenche sem pedir atenção.
  faixa: async () => {
    const tam = await caber(sharp, CONVITE, 62);
    const arte = await sharp(await arte34('base2', { borda: 0.01, pos: 'bottom' })).png().toBuffer();
    const CABECAS = 620;   // MEDIDO no 3:4: o topo da cabeça mais alta da mureta
    return {
      camadas: [
        { input: arte, top: 0, left: 0 },
        { input: await spot('det-nota', 84, -8), top: CABECAS - 60, left: 96 },
      ],
      frente: `${selo(CX, 76)}
        ${bloco(Math.round((190 + CABECAS) / 2 - alturaBloco(tam) / 2 + 46), PAPEL, tam)}`,
    };
  },

  // 3. HERÓI: um personagem só, grande, apontando pro texto. O espaço negativo foi pedido no
  //    prompt, então o texto entra num vazio que existe DE VERDADE na cena.
  heroi: async () => {
    const tam = await caber(sharp, CONVITE, 60);
    // a arte é paisagem e entra INTEIRA no rodapé: cortar em 3:4 jogava fora exatamente o espaço
    // negativo que o prompt pediu, e o texto caía no rosto. O céu dela é tingido pro papel e o
    // topo do quadro é papel chapado: o padrão de pontos por cima é o que une as duas metades.
    const bruta = await sharp(path.join(ILUS, 'heroi.png')).resize({ width: W }).png().toBuffer();
    const arte = await tingirGrama(await tingirCeu(bruta));
    const am = await sharp(arte).metadata();
    return {
      camadas: [
        camada(`<rect width="${W}" height="${H}" fill="${PAPEL}"/>`),
        { input: arte, top: H - am.height, left: 0 },
        // a bola mora ONDE O DEDO APONTA: gesto apontando pro vazio é o mesmo defeito do rabicho
        // de balão apontando pro nada
        { input: await spot('spot-bola', 200, -12), top: H - 250, left: 170 },
        { input: await spot('det-movimento', 100, 165), top: H - 350, left: 380 },
        camada(PADRAO.pontos(PRETO, 0.07)),
      ],
      frente: `${selo(CX, 84)}
        ${bloco(Math.round((170 + (H - am.height + 140)) / 2 - alturaBloco(tam) / 2 + 60), PAPEL, tam)}`,
    };
  },

  // 4. LEITURA: o gesto do canal (futebol + gibi) no canto, o resto é campo tingido e texto.
  //    A mais calma das seis, e a que mais parece capa de livro.
  leitura: async () => {
    const tam = await caber(sharp, CONVITE, 64);
    const arte = await tingirGrama(await arte34('leitura', { borda: 0.04 }));
    return {
      camadas: [
        { input: arte, top: 0, left: 0 },
        { input: await spot('det-nota', 84, 10), top: 700, left: W - 320 },
      ],
      frente: `${selo(CX, 60)}
        ${bloco(300, VERDE, tam)}`,
    };
  },

  // 5. BALÃO: o mascote FALA a chamada, no balão novo (o de rabicho de vírgula). É a candidata
  //    mais quadrinho, e a que mostra as peças desenhadas trabalhando.
  balao: async () => {
    const mascote = await sharp(path.join(AQUI, '../site/mascote.png'))
      .resize({ width: 560 }).png().toBuffer();
    const mm = await sharp(mascote).metadata();
    // o balão é ESPELHADO na hora: o rabicho desenhado aponta pra baixo-esquerda e o mascote
    // está à direita, e balão apontando pro vazio é o erro que a própria peça existe pra evitar
    const b = await sharp(await peca('balao-largo', 760)).flop().png().toBuffer();
    const bm = await sharp(b).metadata();
    const frase = await caber(sharp, ['PRA VESTIR A 12,', 'BASTA GOSTAR', 'DE FUTEBOL.'], 54,
      { largura: 560, margem: 0 });
    return {
      camadas: [
        camada(`<rect width="${W}" height="${H}" fill="${VERDE}"/>${PADRAO.rede(CREME)}`),
        { input: b, top: 120, left: Math.round(CX - bm.width / 2) },
        { input: mascote, top: H - mm.height - 40, left: Math.round(CX - mm.width / 2) + 130 },
        { input: await spot('spot-bola', 170, -10), top: H - 240, left: 90 },
        { input: await spot('det-movimento', 110, -20), top: H - mm.height - 60, left: Math.round(CX - mm.width / 2) + 40 },
      ],
      frente: `
        ${['PRA VESTIR A 12,', 'BASTA GOSTAR', 'DE FUTEBOL.'].map((l, i) =>
          txt(CX - 20, 250 + i * frase * 1.08, l, frase, PRETO)).join('')}
        ${txt(CX, H - 64, `${HANDLE}   ·   futgibi.com`, 36, tintaSobre(VERDE), { esp: 3 })}`,
    };
  },

  // 6. VITRINE: a moldura desenhada como palco e os spots como elenco, sobre o papel com pontos.
  //    É a candidata "guia de marca": a que mostra o sistema inteiro de uma vez.
  vitrine: async () => {
    const mold = await peca('moldura-larga', 880);
    const mMold = await sharp(mold).metadata();
    const frase = await caber(sharp, [CHAMADA], 56, { largura: 700, margem: 0 });
    return {
      camadas: [
        camada(`<rect width="${W}" height="${H}" fill="${PAPEL}"/>${PADRAO.pontos(PRETO)}`),
        { input: mold, top: Math.round(H / 2 - mMold.height / 2 - 60), left: Math.round(CX - mMold.width / 2) },
        { input: await spot('spot-bola', 210, -8), top: 150, left: 90 },
        { input: await spot('spot-apito', 180, 10), top: 190, left: W - 280 },
        { input: await spot('spot-radinho', 190, -6), top: H - 360, left: 100 },
        { input: await spot('spot-chuteira', 210, 7), top: H - 330, left: W - 320 },
        { input: await spot('spot-gibi-aberto', 230, -4), top: H - 210, left: Math.round(CX - 115) },
        { input: await spot('det-tracos', 110, 0), top: 120, left: Math.round(CX - 55) },
      ],
      frente: `
        ${txt(CX, Math.round(H / 2 - 90), 'PRA VESTIR A 12,', frase, PRETO)}
        ${txt(CX, Math.round(H / 2 - 90 + frase * 1.15), 'BASTA GOSTAR DE FUTEBOL.', frase, PRETO)}
        ${txt(CX, Math.round(H / 2 + 110), CONVITE_APOIO, 32, tintaSobre(CREME, { destaque: true }), { esp: 0 })}
        ${txt(CX, Math.round(H / 2 + 180), HANDLE, 42, PRETO, { esp: 8 })}`,
    };
  },
};

await mkdir(SAIDA, { recursive: true });
const so = flag('so');
const alvo = so ? { [so]: CANDIDATAS[so] } : CANDIDATAS;
if (so && !CANDIDATAS[so]) { console.error(`FAIL "${so}" nao existe`); process.exit(1); }

const feitas = [];
for (const [id, fn] of Object.entries(alvo)) {
  try {
    const c = await fn();
    const arq = path.join(SAIDA, `${id}.png`);
    await sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
      .composite([...c.camadas, camada(c.frente)]).png().toFile(arq);
    feitas.push(arq);
    console.log('OK ->', arq);
  } catch (e) {
    console.log(`pulando "${id}": ${e.message.slice(0, 90)}`);
  }
}

if (feitas.length > 1) {
  const TW = 330, GAP = 18, PAD = 24, ROT = 30, COL = 3;
  const pecas = [];
  for (const [i, a] of feitas.entries())
    pecas.push({ input: await sharp(a).resize({ width: TW }).png().toBuffer(),
      left: PAD + (i % COL) * (TW + GAP), top: PAD + ROT + Math.floor(i / COL) * (Math.round(TW * H / W) + ROT + GAP) });
  const linhas = Math.ceil(feitas.length / COL);
  const FW = PAD * 2 + COL * TW + (COL - 1) * GAP;
  const FH = PAD * 2 + linhas * (Math.round(TW * H / W) + ROT + GAP);
  const rot = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">${feitas
    .map((a, i) => `<text x="${PAD + (i % COL) * (TW + GAP)}" y="${PAD + 20 + Math.floor(i / COL) * (Math.round(TW * H / W) + ROT + GAP)}"
      font-family="Helvetica" font-size="17" font-weight="bold" fill="${CREME}">${path.basename(a, '.png')}</text>`).join('')}</svg>`;
  await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 26, g: 26, b: 28, alpha: 1 } } })
    .composite([...pecas, { input: Buffer.from(rot), left: 0, top: 0 }])
    .png().toFile(path.join(SAIDA, '_folha.png'));
  console.log('OK ->', path.join(SAIDA, '_folha.png'));
}
