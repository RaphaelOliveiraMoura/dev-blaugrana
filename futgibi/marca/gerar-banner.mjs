// Banners do futgibi (X e YouTube), desenhados por codigo.
//
// O Instagram NAO tem banner: o perfil de la e so foto, nome e bio. Estes dois existem porque o
// mesmo handle vai ser registrado nas outras plataformas.
//
// Desenho escolhido em 14/08/2026 entre cinco candidatas (ver variacoes-banner.mjs): o NOME DENTRO
// DO GOL. Tres coisas ficaram de fora por decisao, e voltar atras em qualquer uma refaz um erro ja
// cometido:
//   - sem MASCOTE, porque a foto de perfil e o mesmo boneco a poucos pixels dali;
//   - sem BOLA, porque e o simbolo obvio de futebol e obvio nao chama atencao (a malha da rede diz
//     "gol" sem precisar dela);
//   - sem CADENCIA ("terca e sexta"), porque e promessa que o banner passa a dever.
//
// O que manda no layout e a AREA SEGURA, diferente em cada plataforma:
//   X (1500x500)        corta as LATERAIS em tela estreita e cobre o canto inferior esquerdo com a
//                       foto de perfil.
//   YouTube (2560x1440) mostra so 1546x423 do centro na TV e no celular; o resto e sangria de
//                       desktop. Por isso O GOL INTEIRO e desenhado dentro da area segura, e nao
//                       do quadro: gol proporcional ao arquivo ficaria com as traves cortadas fora
//                       justamente onde quase todo mundo ve.
//
//   node marca/gerar-banner.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

const FONTE = 'Chalkboard SE';

const FORMATOS = {
  x: { w: 1500, h: 500, seguraW: 1500, seguraH: 500, arquivo: 'banner-x.png' },
  youtube: { w: 2560, h: 1440, seguraW: 1546, seguraH: 423, arquivo: 'banner-youtube.png' },
};

function svgBanner({ w, h, seguraW, seguraH }) {
  const faixa = Math.round(h / 7);
  const gramado = `<rect width="${w}" height="${h}" fill="${VERDE}"/>` +
    Array.from({ length: Math.ceil(w / faixa) }, (_, i) =>
      i % 2 ? `<rect x="${i * faixa}" y="0" width="${faixa}" height="${h}" fill="${VERDE_FUNDO}" fill-opacity="0.45"/>` : '').join('');

  // o gol vive na area segura, centralizado no quadro
  const sx = Math.round((w - seguraW) / 2), sy = Math.round((h - seguraH) / 2);
  const margemX = Math.round(seguraW * 0.08), margemY = Math.round(seguraH * 0.12);
  const golX = sx + margemX, golY = sy + margemY;
  const golW = seguraW - margemX * 2, golH = seguraH - margemY * 2;
  const trave = Math.max(10, Math.round(seguraH * 0.035));
  const passoRede = Math.max(28, Math.round(seguraH * 0.11));
  const passoDots = Math.max(18, Math.round(seguraH * 0.062));

  const corpo = Math.round(seguraH * 0.28);
  const tag = Math.round(seguraH * 0.095);
  const caixaW = Math.round(golW * 0.72), caixaH = Math.round(corpo * 1.72);
  const cx = sx + Math.round(seguraW / 2), cy = sy + Math.round(seguraH / 2);

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="rede" width="${passoRede}" height="${passoRede}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="${passoRede}" stroke="${CREME}" stroke-opacity="0.30" stroke-width="3"/>
        <line x1="0" y1="0" x2="${passoRede}" y2="0" stroke="${CREME}" stroke-opacity="0.30" stroke-width="3"/>
      </pattern>
      <pattern id="dots" width="${passoDots}" height="${passoDots}" patternUnits="userSpaceOnUse">
        <circle cx="${passoDots / 2}" cy="${passoDots / 2}" r="${Math.max(3, passoDots * 0.19)}" fill="${CREME}" fill-opacity="0.05"/>
      </pattern>
    </defs>
    ${gramado}
    <rect width="${w}" height="${h}" fill="url(#dots)"/>
    <rect x="${golX}" y="${golY}" width="${golW}" height="${golH}" fill="url(#rede)"/>
    <path d="M ${golX} ${golY + golH} V ${golY} H ${golX + golW} V ${golY + golH}"
      stroke="${CREME}" stroke-width="${trave}" fill="none" stroke-linejoin="round"/>
    <g transform="translate(${cx}, ${cy})">
      <rect x="${-caixaW / 2}" y="${-caixaH / 2}" width="${caixaW}" height="${caixaH}" rx="${Math.round(caixaH * 0.08)}"
        fill="${CREME}" stroke="${PRETO}" stroke-width="${Math.max(7, Math.round(seguraH * 0.024))}"/>
      <text x="0" y="${Math.round(corpo * 0.1)}" font-family="${FONTE}" font-size="${corpo}" font-weight="bold"
        text-anchor="middle" fill="${VERDE}">FutGibi</text>
      <text x="0" y="${Math.round(corpo * 0.62)}" font-family="${FONTE}" font-size="${tag}"
        text-anchor="middle" fill="${PRETO}">futebol em quadrinhos</text>
    </g>
  </svg>`;
}

for (const [id, f] of Object.entries(FORMATOS)) {
  await sharp(Buffer.from(svgBanner(f))).png().toFile(path.join(AQUI, f.arquivo));
  console.log(`OK -> ${f.arquivo}  (${f.w}x${f.h}, gol dentro de ${f.seguraW}x${f.seguraH})`);
}
