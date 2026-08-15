// Candidatas a BANNER, desenhadas por codigo, pra escolher olhando.
//
// Tres reprovacoes ja viraram regra aqui, e nenhuma delas volta:
//   1. NADA de mascote no banner: a foto de perfil e o mesmo boneco a poucos pixels dali, e os
//      dois juntos ficam repetidos.
//   2. NADA de bola: e o simbolo obvio de futebol, e obvio nao chama atencao. O futebol entra por
//      outros objetos (rede, cachecol, prancheta tatica, arquibancada).
//   3. NADA de cadencia declarada ("terca e sexta"): e promessa que o banner passa a dever, e a
//      primeira semana sem post deixa o proprio banner desmentindo o canal.
//
// Tudo aqui e SVG por codigo: nenhuma geracao de imagem, entao rodar de novo custa zero.
//
//   node marca/variacoes-banner.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(AQUI, '_variacoes-banner');

const W = 1500, H = 500;
const FONTE = 'Chalkboard SE';

// ---------------------------------------------------------------- peças reaproveitadas
const reticula = (id, cor, op, passo = 26, r = 5) => `
  <defs><pattern id="${id}" x="0" y="0" width="${passo}" height="${passo}" patternUnits="userSpaceOnUse">
    <circle cx="${passo / 2}" cy="${passo / 2}" r="${r}" fill="${cor}" fill-opacity="${op}"/>
  </pattern></defs>
  <rect width="${W}" height="${H}" fill="url(#${id})"/>`;

// rede de gol: losangos, o padrao que diz "gol" sem desenhar bola nenhuma
const rede = (id, op = 0.22, passo = 46) => `
  <defs><pattern id="${id}" x="0" y="0" width="${passo}" height="${passo}" patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="${passo}" stroke="${CREME}" stroke-opacity="${op}" stroke-width="3"/>
    <line x1="0" y1="0" x2="${passo}" y2="0" stroke="${CREME}" stroke-opacity="${op}" stroke-width="3"/>
  </pattern></defs>`;

function raios(cx, cy, n, cor, op, r0, r1, grossura = 6) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return `<line x1="${cx + Math.cos(a) * r0}" y1="${cy + Math.sin(a) * r0}"
      x2="${cx + Math.cos(a) * r1}" y2="${cy + Math.sin(a) * r1}"
      stroke="${cor}" stroke-opacity="${op}" stroke-width="${grossura}" stroke-linecap="round"/>`;
  }).join('');
}

function estrela(cx, cy, pontas, rInt, rExt, fill, stroke, sw) {
  const p = Array.from({ length: pontas * 2 }, (_, i) => {
    const a = (i / (pontas * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? rInt : rExt;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${p}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

// cachecol de torcedor: o objeto de arquibancada que NAO pertence a clube nenhum quando as cores
// sao as da casa. Entra listrado, com franja, atravessando o quadro.
function cachecol(x, y, comp, alt, ang) {
  const listras = Math.round(comp / (alt * 0.62));
  const lw = comp / listras;
  return `<g transform="translate(${x}, ${y}) rotate(${ang})">
    <rect x="0" y="0" width="${comp}" height="${alt}" fill="${CREME}" stroke="${PRETO}" stroke-width="8"/>
    ${Array.from({ length: listras }, (_, i) => i % 2
      ? `<rect x="${i * lw}" y="0" width="${lw}" height="${alt}" fill="${VERDE}"/>` : '').join('')}
    <rect x="0" y="0" width="${comp}" height="${alt}" fill="none" stroke="${PRETO}" stroke-width="8"/>
    ${Array.from({ length: 7 }, (_, i) =>
      `<line x1="${comp + 2}" y1="${8 + i * ((alt - 16) / 6)}" x2="${comp + 34}" y2="${8 + i * ((alt - 16) / 6)}"
        stroke="${PRETO}" stroke-width="7" stroke-linecap="round"/>`).join('')}
  </g>`;
}

// prancheta do tecnico: setas, circulos e tracejado. E o futebol DESENHADO, que e o assunto do
// canal, sem recorrer a bola.
function tatico(op = 0.30) {
  const t = `stroke="${CREME}" stroke-opacity="${op}" fill="none" stroke-width="5"`;
  return `<g>
    <path d="M 120 400 C 260 300, 300 180, 470 150" ${t} stroke-dasharray="18 16"/>
    <path d="M 440 138 l 42 12 l -34 26" ${t} stroke-dasharray="0"/>
    <path d="M 1380 120 C 1240 200, 1230 330, 1060 372" ${t} stroke-dasharray="18 16"/>
    <path d="M 1090 356 l -44 18 l 36 22" ${t} stroke-dasharray="0"/>
    <circle cx="150" cy="150" r="26" ${t}/>
    <circle cx="1350" cy="392" r="26" ${t}/>
    <g ${t} stroke-linecap="round">
      <line x1="1316" y1="118" x2="1372" y2="174"/><line x1="1372" y1="118" x2="1316" y2="174"/>
      <line x1="106" y1="368" x2="162" y2="424"/><line x1="162" y1="368" x2="106" y2="424"/>
    </g>
  </g>`;
}

// arquibancada: fileiras de blocos, gente SEM ROSTO (o que se move nunca tem rosto, mesma regra do
// fundo animado dos videos)
function arquibancada(y0, alturaLinha, linhas) {
  let out = '';
  for (let l = 0; l < linhas; l++) {
    const y = y0 + l * alturaLinha;
    const passo = 34 + l * 4;
    for (let x = -20; x < W + 40; x += passo) {
      const op = 0.10 + (l % 3) * 0.035;
      out += `<circle cx="${x + (l % 2 ? passo / 2 : 0)}" cy="${y}" r="${11 + l}" fill="${CREME}" fill-opacity="${op}"/>`;
    }
  }
  return out;
}

function wordmark(x, y, corpo, { fill = CREME, sombra = PRETO, desloc = 0.05, anchor = 'start' } = {}) {
  const d = Math.round(corpo * desloc);
  const comum = `font-family="${FONTE}" font-size="${corpo}" font-weight="bold" text-anchor="${anchor}"`;
  return `<text x="${x + d}" y="${y + d}" ${comum} fill="${sombra}">FutGibi</text>
          <text x="${x}" y="${y}" ${comum} fill="${fill}" stroke="${sombra}"
            stroke-width="${Math.round(corpo * 0.03)}" paint-order="stroke" stroke-linejoin="round">FutGibi</text>`;
}

const gramado = () => {
  const faixa = Math.round(H / 7);
  return `<rect width="${W}" height="${H}" fill="${VERDE}"/>` +
    Array.from({ length: Math.ceil(W / faixa) }, (_, i) =>
      i % 2 ? `<rect x="${i * faixa}" y="0" width="${faixa}" height="${H}" fill="${VERDE_FUNDO}" fill-opacity="0.45"/>` : '').join('');
};

// ---------------------------------------------------------------- as candidatas
const CANDIDATAS = {
  // 1. EXPLOSAO: estrela creme com o nome em verde, raios laranja. O impacto vem da forma, nao de
  //    nenhum objeto de futebol.
  explosao: `
    ${gramado()}
    ${reticula('d1', CREME, 0.08)}
    ${raios(W / 2, H / 2, 30, LARANJA, 0.42, 250, 980, 8)}
    ${raios(W / 2, H / 2, 30, CREME, 0.14, 236, 920, 6)}
    ${estrela(W / 2, H / 2, 20, 168, 232, CREME, PRETO, 11)}
    <text x="${W / 2}" y="${H / 2 + 4}" font-family="${FONTE}" font-size="92" font-weight="bold"
      text-anchor="middle" fill="${VERDE}">FutGibi</text>
    <text x="${W / 2}" y="${H / 2 + 56}" font-family="${FONTE}" font-size="34" text-anchor="middle" fill="${PRETO}">futebol em quadrinhos</text>`,

  // 2. REDE: o nome dentro do gol. A malha diz futebol sem desenhar bola.
  redegol: `
    ${gramado()}
    ${rede('net', 0.30)}
    ${reticula('d2', CREME, 0.05)}
    <rect x="118" y="58" width="${W - 236}" height="${H - 116}" fill="url(#net)"/>
    <g stroke="${CREME}" stroke-width="16" fill="none" stroke-linejoin="round">
      <path d="M 118 442 V 58 H ${W - 118} V 442"/>
    </g>
    <g transform="translate(${W / 2}, ${H / 2})">
      <rect x="-430" y="-96" width="860" height="196" rx="14" fill="${CREME}" stroke="${PRETO}" stroke-width="10"/>
      <text x="0" y="10" font-family="${FONTE}" font-size="116" font-weight="bold" text-anchor="middle" fill="${VERDE}">FutGibi</text>
      <text x="0" y="70" font-family="${FONTE}" font-size="40" text-anchor="middle" fill="${PRETO}">futebol em quadrinhos</text>
    </g>`,

  // 3. CACHECOL: o objeto de torcedor, listrado nas cores da casa (que nao sao de clube nenhum).
  cachecol: `
    ${gramado()}
    ${reticula('d3', CREME, 0.07)}
    ${arquibancada(80, 58, 2)}
    ${/* os cachecois ficam nos CANTOS: cruzando o meio eles passavam por cima do nome, e a franja
          comia a primeira letra */ ''}
    ${cachecol(-70, 372, 470, 84, -12)}
    ${cachecol(1090, 44, 470, 84, 14)}
    ${wordmark(W / 2, H / 2 + 12, 128, { anchor: 'middle' })}
    <text x="${W / 2}" y="${H / 2 + 78}" font-family="${FONTE}" font-size="42" text-anchor="middle" fill="${CREME}">futebol em quadrinhos</text>`,

  // 4. PRANCHETA: o futebol como DESENHO (setas, X e O), que e literalmente o que o canal faz.
  prancheta: `
    ${gramado()}
    ${reticula('d4', CREME, 0.06)}
    ${tatico(0.34)}
    <g transform="translate(${W / 2}, ${H / 2})">
      <rect x="-404" y="-108" width="808" height="216" rx="12" fill="${CREME}" stroke="${PRETO}" stroke-width="10"/>
      <rect x="-380" y="-86" width="760" height="172" rx="8" fill="none" stroke="${PRETO}" stroke-width="4" stroke-dasharray="14 12"/>
      <text x="0" y="6" font-family="${FONTE}" font-size="112" font-weight="bold" text-anchor="middle" fill="${VERDE}">FutGibi</text>
      <text x="0" y="66" font-family="${FONTE}" font-size="38" text-anchor="middle" fill="${PRETO}">futebol em quadrinhos</text>
    </g>`,

  // 5. CAPA: o banner PARECE o objeto que o canal produz. Sem numero de edicao e sem calendario:
  //    o que fica na tarja e o RECORTE editorial, que nao vence a validade.
  capa: `
    ${gramado()}
    ${reticula('d5', CREME, 0.07)}
    ${raios(W / 2, 300, 30, CREME, 0.10, 240, 900, 9)}
    ${arquibancada(212, 66, 3)}
    <rect x="0" y="0" width="${W}" height="146" fill="${CREME}"/>
    <rect x="0" y="146" width="${W}" height="12" fill="${PRETO}"/>
    <text x="${W / 2}" y="110" font-family="${FONTE}" font-size="104" font-weight="bold"
      text-anchor="middle" fill="${VERDE}">FutGibi</text>
    ${/* os selos ficam FORA da tarja: encostados nela, eles cortavam a caixa e o proprio texto */ ''}
    <g transform="translate(${W / 2}, 340)">
      <rect x="-330" y="-52" width="660" height="94" rx="10" fill="${CREME}" stroke="${PRETO}" stroke-width="9"/>
      <text x="0" y="14" font-family="${FONTE}" font-size="46" text-anchor="middle" fill="${PRETO}">futebol em quadrinhos</text>
    </g>
    <g transform="translate(232, 336) rotate(-12)">
      ${estrela(0, 0, 14, 58, 92, LARANJA, PRETO, 8)}
      <text x="0" y="-6" font-family="${FONTE}" font-size="25" font-weight="bold" text-anchor="middle" fill="${CREME}">HISTÓRIA</text>
      <text x="0" y="22" font-family="${FONTE}" font-size="25" font-weight="bold" text-anchor="middle" fill="${CREME}">REAL</text>
    </g>
    <g transform="translate(1268, 336) rotate(10)">
      ${estrela(0, 0, 14, 58, 92, LARANJA, PRETO, 8)}
      <text x="0" y="8" font-family="${FONTE}" font-size="25" font-weight="bold" text-anchor="middle" fill="${CREME}">RESENHA</text>
    </g>`,
};

await mkdir(DIR, { recursive: true });

const nomes = Object.keys(CANDIDATAS);
for (const [i, nome] of nomes.entries()) {
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${CANDIDATAS[nome]}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(DIR, `${i + 1}-${nome}.png`));
  console.log(`OK  ${i + 1}. ${nome}`);
}

const LARG = 1180, PAD = 26, ROT = 34;
const pecas = [];
let y = PAD;
for (const [i, nome] of nomes.entries()) {
  const img = await sharp(path.join(DIR, `${i + 1}-${nome}.png`)).resize(LARG - PAD * 2).png().toBuffer();
  const alt = (await sharp(img).metadata()).height;
  pecas.push({ input: img, left: PAD, top: y, rotulo: `${i + 1}. ${nome}`, ry: y + alt + 23 });
  y += alt + ROT + 14;
}
const rotulos = `<svg width="${LARG}" height="${y}" xmlns="http://www.w3.org/2000/svg">
  ${pecas.map((p) => `<text x="${PAD}" y="${p.ry}" font-family="Helvetica" font-size="18" fill="#9aa0a6">${p.rotulo}</text>`).join('')}
</svg>`;

await sharp({ create: { width: LARG, height: y, channels: 4, background: { r: 18, g: 18, b: 20, alpha: 1 } } })
  .composite([...pecas.map(({ input, left, top }) => ({ input, left, top })), { input: Buffer.from(rotulos), left: 0, top: 0 }])
  .png().toFile(path.join(DIR, '_folha.png'));
console.log('\nFOLHA ->', path.join(DIR, '_folha.png'));
