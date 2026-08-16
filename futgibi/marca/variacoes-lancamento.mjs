// Candidatas do POST DE INAUGURACAO (o primeiro post das quatro redes).
//
// E peca DIFERENTE da arte fixada (`variacoes-convite.mjs`): aquela e o convite permanente do topo
// do perfil, esta anuncia a abertura e so serve uma vez. Um post de estreia tem tres trabalhos e
// nenhuma das cinco abaixo pode perder nenhum deles:
//   1. dizer O QUE E (quem cai de paraquedas nao faz ideia)
//   2. deixar claro que e o COMECO (e o unico FOMO honesto que existe aqui, e nao se repete)
//   3. CONVIDAR
//
// A linguagem visual e a mesma que a landing (`site/index.html`) usa: halftone, explosao, cartucho
// de narrador, moldura de edicao, sombra dura. Site e feed falando a mesma lingua e o que faz uma
// marca nova ser reconhecida antes de ser lida.
//
// Ilustracao do modelo + texto por codigo, o arranjo da casa (IDENTIDADE.md secao 7.1).
//
//   node futgibi/marca/variacoes-lancamento.mjs [--saida=<dir>]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO, tintaSobre } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = process.argv.find((a) => a.startsWith('--saida='))?.slice(8)
  || path.join(AQUI, '_variacoes-lancamento');
const MASCOTE = path.join(AQUI, '../../saga-fut/personagens/torcedor-12/poses/chamar.png');

const W = 1080, H = 1440, CX = W / 2;

// ------------------------------------------------------------------ peças de linguagem de gibi
const ben = (cor, esc = 15, r = 2.8, op = 0.17) =>
  `<pattern id="ben" width="${esc}" height="${esc}" patternUnits="userSpaceOnUse">
     <circle cx="${esc / 2}" cy="${esc / 2}" r="${r}" fill="${cor}" opacity="${op}"/></pattern>`;

// as linhas de foco que dizem "olhe AQUI", saindo de um ponto
const foco = (cx, cy, cor, op = 0.13) => {
  const raios = 44, L = 1800;
  return `<g opacity="${op}">${Array.from({ length: raios }, (_, i) => {
    const a1 = (i * 2 * Math.PI) / raios, a2 = a1 + (2 * Math.PI) / raios / 2.3;
    return `<path d="M ${cx},${cy} L ${cx + Math.cos(a1) * L},${cy + Math.sin(a1) * L}
             L ${cx + Math.cos(a2) * L},${cy + Math.sin(a2) * L} Z" fill="${cor}"/>`;
  }).join('')}</g>`;
};

// a explosão de gibi: raio externo e interno alternados
const estrela = (cx, cy, re, ri, pontas, attrs) => {
  const p = Array.from({ length: pontas * 2 }, (_, i) => {
    const r = i % 2 ? ri : re;
    const a = (i * Math.PI) / pontas - Math.PI / 2;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${p}" ${attrs}/>`;
};

const txt = (x, y, s, tam, { cor = CREME, esp = 2, anc = 'middle', sombra = null } = {}) =>
  (sombra ? `<text x="${x + 5}" y="${y + 5}" text-anchor="${anc}" font-family="Helvetica"
      font-size="${tam}" font-weight="bold" letter-spacing="${esp}" fill="${sombra}">${s}</text>` : '')
  + `<text x="${x}" y="${y}" text-anchor="${anc}" font-family="Helvetica" font-size="${tam}"
      font-weight="bold" letter-spacing="${esp}" fill="${cor}">${s}</text>`;

// bloco de várias linhas, com entrelinha proporcional ao corpo
const bloco = (x, y, linhas, tam, o = {}) =>
  linhas.map((l, i) => txt(x, y + i * tam * 1.12, l, tam, { ...o, ...(l.cor || {}) })).join('');

// o cartucho do narrador
const cartucho = (x, y, s, { fundo = CREME, cor = PRETO, tam = 30, larg = 480 } = {}) =>
  `<g transform="translate(${x - larg / 2}, ${y})">
     <rect x="6" y="6" width="${larg}" height="66" fill="${PRETO}"/>
     <rect width="${larg}" height="66" fill="${fundo}" stroke="${PRETO}" stroke-width="5"/>
     ${txt(larg / 2, 45, s, tam, { cor, esp: 4 })}</g>`;

// ------------------------------------------------------------------------------ as candidatas
const CANDIDATAS = {
  // 1. A CAPA DE ESTREIA. O formato mais nativo da marca: o post e a capa do gibi numero 1.
  '1-capa-estreia': {
    fundo: `<defs>${ben(PRETO, 15, 2.8, 0.14)}</defs>
      <rect width="${W}" height="${H}" fill="${LARANJA}"/>
      <rect width="${W}" height="${H}" fill="url(#ben)"/>
      <rect x="38" y="38" width="${W - 76}" height="${H - 76}" fill="${VERDE}" stroke="${PRETO}" stroke-width="12"/>
      ${foco(CX, 760, CREME, 0.12)}
      <rect x="38" y="38" width="${W - 76}" height="150" fill="${CREME}" stroke="${PRETO}" stroke-width="12"/>
      ${txt(CX, 148, 'Fut Gibi', 94, { cor: PRETO, esp: 15 })}`,
    mascote: { alt: 760, base: 1150 },
    frente: `<g transform="translate(910, 300)">
        ${estrela(0, 0, 118, 78, 12, `fill="${CREME}" stroke="${PRETO}" stroke-width="10"`)}
        ${txt(0, -14, 'EDIÇÃO', 26, { cor: PRETO, esp: 1 })}
        ${txt(0, 58, 'Nº 1', 62, { cor: tintaSobre(CREME, { destaque: true }), esp: 0 })}
      </g>
      <rect x="38" y="1180" width="${W - 76}" height="222" fill="${CREME}" stroke="${PRETO}" stroke-width="12"/>
      ${bloco(CX, 1262, ['O FUTEBOL AGORA', 'TEM GIBI.'], 62, { cor: PRETO })}
      ${txt(CX, 1372, '@futgibi   ·   nas quatro redes', 34, { cor: tintaSobre(CREME, { destaque: true }), esp: 3 })}`,
  },

  // 2. O APITO. O comeco dito como o futebol diz: apitou, o jogo comecou.
  '2-apitou': {
    fundo: `<defs>${ben(CREME, 16, 3, 0.16)}</defs>
      <rect width="${W}" height="${H}" fill="${VERDE}"/>
      <rect width="${W}" height="${H}" fill="url(#ben)"/>
      ${foco(CX, 380, CREME, 0.16)}
      <g transform="translate(${CX}, 348)">
        ${estrela(0, 0, 312, 208, 14, `fill="${LARANJA}" stroke="${PRETO}" stroke-width="12"`)}
        ${txt(6, 30, 'APITOU!', 112, { cor: PRETO, esp: -2 })}
        ${txt(0, 24, 'APITOU!', 112, { cor: CREME, esp: -2 })}
      </g>`,
    mascote: { alt: 610, base: 1252 },
    frente: `${bloco(CX, 1310, ['O FUTEBOL AGORA TEM GIBI.'], 56, { cor: CREME })}
      ${txt(CX, 1392, '@futgibi', 52, { cor: tintaSobre(VERDE), esp: 8 })}`,
  },

  // 3. O MANIFESTO. Nao anuncia produto, anuncia a VAGA que existia: e o argumento mais forte que
  //    o canal tem, e o unico que nenhum concorrente pode copiar sem deixar de ser do time dele.
  '3-manifesto': {
    fundo: `<defs>${ben(PRETO, 14, 2.4, 0.13)}</defs>
      <rect width="${W}" height="${H}" fill="${CREME}"/>
      <rect width="${W}" height="${H}" fill="url(#ben)"/>
      ${cartucho(CX, 90, 'COMEÇA HOJE', { fundo: LARANJA, larg: 420 })}
      ${bloco(CX, 330, ['TODO PERFIL DE', 'FUTEBOL NO BRASIL', 'TORCE PRA ALGUÉM.'], 74, { cor: PRETO })}
      ${bloco(CX, 610, ['ESTE NÃO.'], 108, { cor: LARANJA })}`,
    mascote: { alt: 740, base: 1305 },
    frente: `${txt(CX, 1378, 'FUTEBOL EM QUADRINHOS   ·   @futgibi', 38, { cor: PRETO, esp: 3 })}`,
  },

  // 4. A AMBICAO DECLARADA. Dizer o tamanho do plano em publico e o que transforma seguidor em
  //    fundador: quem entra sabe que entrou numa coisa que ainda vai ser construida.
  '4-comunidade': {
    fundo: `<defs>${ben(CREME, 16, 3, 0.15)}</defs>
      <rect width="${W}" height="${H}" fill="${VERDE}"/>
      <rect width="${W}" height="${H}" fill="url(#ben)"/>
      ${cartucho(CX, 84, 'DIA 1', { fundo: LARANJA, larg: 300 })}
      ${bloco(CX, 320, ['VAMOS SER A MAIOR', 'COMUNIDADE DE'], 68, { cor: CREME })}
      ${bloco(CX, 480, ['QUADRINHOS DE', 'FUTEBOL DO BRASIL.'], 68, { cor: LARANJA })}`,
    mascote: { alt: 600, base: 1250 },
    frente: `<rect x="70" y="1268" width="${W - 140}" height="104" fill="${CREME}"
            stroke="${PRETO}" stroke-width="10"/>
      ${txt(CX, 1337, 'COMEÇA COM VOCÊ.  @futgibi', 46, { cor: PRETO, esp: 2 })}`,
  },

  // 5. O CONVITE FALADO. A unica em que o mascote FALA, e por isso a mais quente das cinco.
  '5-balao': {
    fundo: `<defs>${ben(CREME, 16, 3, 0.15)}</defs>
      <rect width="${W}" height="${H}" fill="${VERDE}"/>
      <rect width="${W}" height="${H}" fill="url(#ben)"/>
      <g stroke="${PRETO}" stroke-width="12" fill="${CREME}" stroke-linejoin="round">
        <path d="M 92,120 h 896 a 62,62 0 0 1 62,62 v 470 a 62,62 0 0 1 -62,62 h -430
                 l -168,150 v -150 h -298 a 62,62 0 0 1 -62,-62 v -470 a 62,62 0 0 1 62,-62 z"/>
      </g>
      ${bloco(CX, 300, ['CHEGA AÍ.'], 108, { cor: PRETO })}
      ${bloco(CX, 440, ['TEM GIBI NOVO', 'DE FUTEBOL,', 'E É DE TODO MUNDO.'], 62, { cor: PRETO })}`,
    mascote: { alt: 620, base: 1330 },
    frente: `${txt(CX, 1400, '@futgibi', 50, { cor: tintaSobre(VERDE), esp: 8 })}`,
  },
};

await mkdir(SAIDA, { recursive: true });

const feitas = [];
for (const [id, c] of Object.entries(CANDIDATAS)) {
  const camadas = [{ input: Buffer.from(`<svg width="${W}" height="${H}"
    xmlns="http://www.w3.org/2000/svg">${c.fundo}</svg>`), top: 0, left: 0 }];

  if (c.mascote) {
    // sprite ancorada no PE: a posição vem da linha de base, então mudar a altura não faz o
    // personagem flutuar nem afundar
    const sprite = await sharp(MASCOTE).resize({ height: c.mascote.alt }).png().toBuffer();
    const { width: sw, height: sh } = await sharp(sprite).metadata();
    camadas.push({ input: sprite, top: Math.round(c.mascote.base - sh), left: Math.round(CX - sw / 2) });
  }

  camadas.push({ input: Buffer.from(`<svg width="${W}" height="${H}"
    xmlns="http://www.w3.org/2000/svg">${c.frente}</svg>`), top: 0, left: 0 });

  const arq = path.join(SAIDA, `${id}.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: VERDE } })
    .composite(camadas).png().toFile(arq);
  feitas.push({ id, arq });
  console.log('OK ->', arq);
}

// folha numerada, que é como toda decisão visual da casa é tomada
const TW = 380, TH = Math.round(TW * H / W), PAD = 36, GAP = 26, ROT = 56;
const pecas = [];
for (const [i, f] of feitas.entries()) {
  pecas.push({
    input: await sharp(f.arq).resize(TW, TH).png().toBuffer(),
    left: PAD + i * (TW + GAP), top: PAD + ROT,
  });
}
const FW = PAD * 2 + TW * feitas.length + GAP * (feitas.length - 1);
const FH = PAD * 2 + TH + ROT;
const rotulos = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">
  ${feitas.map((f, i) => `<text x="${PAD + i * (TW + GAP) + TW / 2}" y="${PAD + 36}"
     text-anchor="middle" font-family="Helvetica" font-size="30" font-weight="bold"
     fill="#F3E7D0">${i + 1}. ${f.id.slice(2)}</text>`).join('')}</svg>`;

await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite([...pecas, { input: Buffer.from(rotulos), left: 0, top: 0 }])
  .png().toFile(path.join(SAIDA, '_folha.png'));
console.log('OK ->', path.join(SAIDA, '_folha.png'));
