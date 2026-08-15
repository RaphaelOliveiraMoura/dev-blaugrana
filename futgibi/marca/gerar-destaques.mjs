// Capas dos DESTAQUES do perfil, por codigo.
//
// Sao 1080x1920 (story) porque a capa de destaque e recortada do CENTRO de um story: gerar
// quadrado e deixar o Instagram recortar poe o pictograma fora do circulo. Tudo que importa mora
// dentro de um circulo central de 480px de raio, que e a area que sobrevive ao recorte.
//
//   node futgibi-destaques.mjs [--saida=<dir>]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO } from './tokens.mjs';

const SAIDA = process.argv.find((a) => a.startsWith('--saida='))?.slice(8)
  || '/private/tmp/claude-501/-Users-raphaeloliveira-projects-dev-blaugrana/afd09484-7f97-42bb-bd97-868c118f5a4b/scratchpad/destaques';

const W = 1080, H = 1920, CX = W / 2, CY = H / 2;

// Cada pictograma e desenhado com traco GROSSO e forma unica: no circulo de destaque o icone
// aparece com ~90px de diametro na tela do celular, e desenho fino vira mancha.
const PICTOGRAMAS = {
  'o-dia-em-que': {
    rotulo: 'O DIA\nEM QUE',
    cor: CREME,
    // calendario com uma pagina arrancada
    svg: `<g stroke="${CREME}" stroke-width="26" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="-150" y="-130" width="300" height="270" rx="28"/>
        <line x1="-150" y1="-50" x2="150" y2="-50"/>
        <line x1="-80" y1="-130" x2="-80" y2="-180"/>
        <line x1="80" y1="-130" x2="80" y2="-180"/>
      </g>
      <text x="0" y="80" text-anchor="middle" font-family="Helvetica" font-size="130" font-weight="bold" fill="${LARANJA}">?</text>`,
  },
  resenha: {
    rotulo: 'RESENHA',
    cor: CREME,
    // dois baloes de fala cruzados
    svg: `<g stroke="${CREME}" stroke-width="26" fill="none" stroke-linejoin="round">
        <path d="M -170 -140 h 220 a 26 26 0 0 1 26 26 v 130 a 26 26 0 0 1 -26 26 h -140 l -80 62 v -62 a 26 26 0 0 1 -26 -26 v -130 a 26 26 0 0 1 26 -26 z"/>
      </g>
      <g stroke="${LARANJA}" stroke-width="26" fill="none" stroke-linejoin="round">
        <path d="M 20 20 h 150 a 26 26 0 0 1 26 26 v 100 a 26 26 0 0 1 -26 26 h -90 l -60 50 v -50 a 26 26 0 0 1 -26 -26 v -100 a 26 26 0 0 1 26 -26 z"/>
      </g>`,
  },
  memoria: {
    rotulo: 'MEMÓRIA',
    cor: CREME,
    // bola de gomos antiga
    svg: `<g stroke="${CREME}" stroke-width="26" fill="none">
        <circle cx="0" cy="0" r="150"/>
        <line x1="-150" y1="-50" x2="150" y2="-50"/>
        <line x1="-150" y1="50" x2="150" y2="50"/>
        <line x1="-50" y1="-142" x2="-50" y2="142"/>
        <line x1="50" y1="-142" x2="50" y2="142"/>
      </g>`,
  },
  bastidor: {
    rotulo: 'BASTIDOR',
    cor: CREME,
    // lapis inclinado
    svg: `<g stroke="${CREME}" stroke-width="26" fill="none" stroke-linejoin="round" stroke-linecap="round" transform="rotate(-38)">
        <rect x="-52" y="-160" width="104" height="230" rx="12"/>
        <line x1="-52" y1="70" x2="0" y2="150"/>
        <line x1="52" y1="70" x2="0" y2="150"/>
        <line x1="-52" y1="-90" x2="52" y2="-90"/>
      </g>`,
  },
};

await mkdir(SAIDA, { recursive: true });

for (const [id, p] of Object.entries(PICTOGRAMAS)) {
  const linhas = p.rotulo.split('\n');
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${VERDE}"/>
    <g transform="translate(${CX}, ${CY - 60})">${p.svg}</g>
    ${linhas.map((l, i) => `<text x="${CX}" y="${CY + 250 + i * 78}" text-anchor="middle"
       font-family="Helvetica" font-size="66" font-weight="bold" letter-spacing="6" fill="${CREME}">${l}</text>`).join('')}
  </svg>`;
  const arq = path.join(SAIDA, `destaque-${id}.png`);
  await sharp(Buffer.from(svg)).png().toFile(arq);
  console.log('OK ->', arq);
}

// folha de conferencia: as quatro capas ja RECORTADAS no circulo, que e como o perfil mostra
const D = 260, GAP = 40, PAD = 40;
const capas = [];
for (const [i, id] of Object.keys(PICTOGRAMAS).entries()) {
  const centro = await sharp(path.join(SAIDA, `destaque-${id}.png`))
    .extract({ left: 0, top: Math.round(H / 2 - W / 2), width: W, height: W })
    .resize(D, D).toBuffer();
  const mascara = Buffer.from(
    `<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="#fff"/></svg>`);
  capas.push({
    input: await sharp(centro).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer(),
    left: PAD + i * (D + GAP),
    top: PAD,
  });
}
const FW = PAD * 2 + D * 4 + GAP * 3, FH = PAD * 2 + D;
await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite(capas).png().toFile(path.join(SAIDA, '_folha.png'));
console.log('OK ->', path.join(SAIDA, '_folha.png'));
