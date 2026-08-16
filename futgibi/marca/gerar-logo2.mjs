// SEGUNDA rodada de logotipo. A primeira (moldura de figurinha, capa de gibi, gol, camisa,
// carimbo, desalinho) foi reprovada inteira, e a leitura do porquê é que todas ELAS RESOLVIAM O
// LOGO COM UMA CAIXA EM VOLTA DO NOME: moldura, faixa, trave, cromo. Caixa é embalagem, não marca.
//
// Esta rodada ataca o nome POR DENTRO: intervenção nas letras, monograma e o balão como forma.
//
// O nome se escreve Fut Gibi em texto e Fut Gibi em caixa alta (foi assim que ele ficou em
// 15/08/2026, ver marca.escrita no tokens.json). O @futgibi é só o handle.
//
//   node futgibi/marca/gerar-logo2.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'logo2');
const b64 = (await readFile(path.join(AQUI, '../site/marca/fontes/oswald.woff2'))).toString('base64');
const FACE = `  <defs><style>
    @font-face{font-family:"FG";src:url(data:font/woff2;base64,${b64}) format("woff2");
      font-weight:700;font-style:normal}
  </style></defs>`;
const F = '"FG","Oswald","Arial Narrow",Impact,sans-serif';

const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
const t = (x, y, s, tam, cor, { esp = 0, anc = 'middle', op = 1 } = {}) =>
  `  <text x="${x}" y="${y}" text-anchor="${anc}" font-family='${F}' font-size="${tam}"
    font-weight="700" letter-spacing="${esp}" fill="${cor}"${op < 1 ? ` opacity="${op}"` : ''}>${s}</text>`;
const svg = (w, h, corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${FACE}
${fundo ? `  <rect width="${w}" height="${h}" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

const elipse = (cx, cy, rx, ry, { n = 30, tremor = 0.035, semente = 3 } = {}) => {
  const p = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rnd(semente + i * 7.3) - 0.5) * 2 * tremor;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  let d = `M ${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}` +
         ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}` +
         ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
};

const LOGOS = {
  // 1. BALÃO: a marca É um balão de fala. Usa o ativo que o sistema já tem, e é a leitura mais
  //    direta de "quadrinho" sem precisar de moldura em volta.
  '1-balao': (c) => svg(520, 400, `
  <path d="${elipse(260, 176, 246, 160, { semente: 9 })}" fill="${c.papel}" stroke="${c.tinta}"
    stroke-width="13" stroke-linejoin="round"/>
  <path d="M 150,300 L 108,382 L 246,318 Z" fill="${c.papel}" stroke="${c.tinta}"
    stroke-width="13" stroke-linejoin="round"/>
${t(260, 152, 'FUT', 104, c.tinta, { esp: 2 })}
${t(260, 250, 'GIBI', 104, c.realce, { esp: 2 })}`, c.fundo),

  // 2. BOLA NO I: o pingo do I vira bola. É a intervenção tipográfica mais barata que existe e a
  //    que mais sobrevive à redução, porque a bola é uma forma cheia.
  '2-bola-i': (c) => svg(620, 210, `
${t(20, 150, 'FUT GIB', 132, c.tinta, { esp: 1, anc: 'start' })}
  <rect x="498" y="70" width="31" height="80" fill="${c.tinta}"/>
  <circle cx="513" cy="36" r="29" fill="${c.acento}" stroke="${c.tinta}" stroke-width="9"/>
  <path d="M513 17 L527 27.5 L521.5 44 H504.5 L499 27.5 Z" fill="${c.tinta}"/>`, c.fundo),

  // 3. MONOGRAMA: FG em bloco, pra onde só cabe um quadrado. É a peça que a primeira rodada não
  //    tinha e que todo sistema precisa: a marca em um caractere.
  '3-monograma': (c) => svg(400, 400, `
  <rect x="14" y="14" width="372" height="372" rx="26" fill="${c.acento}"
    stroke="${c.tinta}" stroke-width="14"/>
${t(200, 268, 'FG', 220, c.tinta, { esp: -6 })}
  <rect x="70" y="300" width="260" height="10" fill="${c.tinta}"/>`, c.fundo),

  // 4. FLÂMULA: a bandeirinha triangular de bar, que é objeto de futebol brasileiro e não pertence
  //    a clube nenhum enquanto estiver lisa.
  '4-flamula': (c) => svg(560, 300, `
  <path d="M 26,26 L 534,120 L 26,214 Z" fill="${c.papel}" stroke="${c.tinta}"
    stroke-width="13" stroke-linejoin="round"/>
  <path d="M 26,26 V 274" stroke="${c.tinta}" stroke-width="15" stroke-linecap="round" fill="none"/>
${t(70, 104, 'FUT', 74, c.tinta, { esp: 2, anc: 'start' })}
${t(70, 176, 'GIBI', 74, c.realce, { esp: 2, anc: 'start' })}`, c.fundo),

  // 5. PLACAR: o nome em painel de placar de estádio, com o 12 no lugar do número. Traz o
  //    contador da marca sem precisar da moldura de cromo.
  '5-placar': (c) => svg(640, 220, `
  <rect x="8" y="8" width="624" height="204" rx="10" fill="${c.tinta}"/>
${t(30, 92, 'FUT', 84, c.papel, { esp: 4, anc: 'start' })}
${t(30, 178, 'GIBI', 84, c.realce === c.tinta ? c.papel : c.realce, { esp: 4, anc: 'start' })}
  <rect x="404" y="34" width="204" height="152" rx="8" fill="${c.papel}"/>
${t(506, 152, '12', 118, c.tinta, { esp: -3 })}`, c.fundo),

  // 6. GRAMPO: o nome com o grampo da lombada do gibi, que é o detalhe que só quem pegou revista
  //    de banca reconhece.
  '6-grampo': (c) => svg(560, 260, `
  <rect x="24" y="24" width="512" height="212" fill="${c.papel}" stroke="${c.tinta}" stroke-width="12"/>
  <rect x="24" y="24" width="52" height="212" fill="${c.acento}"/>
  <rect x="42" y="66" width="16" height="46" rx="6" fill="${c.tinta}"/>
  <rect x="42" y="148" width="16" height="46" rx="6" fill="${c.tinta}"/>
${t(316, 122, 'FUT', 82, c.tinta, { esp: 3 })}
${t(316, 202, 'GIBI', 82, c.tinta, { esp: 3 })}`, c.fundo),
};

// `acento` é FUNDO de bloco; `realce` é TEXTO. Eram a mesma variável, e no teste de uma cor as
// duas viravam creme: o texto realçado sumia dentro do papel. Um logo que perde uma palavra na
// versão mono não passou no teste, ele quebrou nele.
const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, realce: LARANJA, fundo: null },
  mono:      { tinta: PRETO, papel: CREME, acento: CREME,   realce: PRETO,   fundo: null },
  invertido: { tinta: CREME, papel: VERDE, acento: VERDE,   realce: CREME,   fundo: VERDE },
};

await mkdir(SAIDA, { recursive: true });
for (const [id, fn] of Object.entries(LOGOS)) {
  for (const [teste, c] of Object.entries(TESTES)) {
    await writeFile(path.join(SAIDA, `${id}-${teste}.svg`), fn(c));
  }
}
console.log(`OK -> ${SAIDA} (${Object.keys(LOGOS).length} direções novas)`);
