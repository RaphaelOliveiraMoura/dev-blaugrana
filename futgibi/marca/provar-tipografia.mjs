// Folha de prova da TIPOGRAFIA: a mesma frase da marca em oito direções, pra escolher OLHANDO.
//
// POR QUE COM FONTE DE SISTEMA: as candidatas de verdade são webfonts de licença aberta, e baixar
// arquivo é decisão do Raphael. Cada bloco abaixo usa uma fonte que JÁ EXISTE nesta máquina e que
// é parente próxima da webfont indicada, então a escolha aqui é de DIREÇÃO (condensada? slab?
// manuscrita? cartoon?), não da fonte final. Escolhida a direção, a webfont correspondente é
// baixada, servida do próprio domínio e vira o token `--fonte-display`.
//
// A tensão que a folha existe pra resolver: cartoon demais (Bangers, Luckiest Guy) infantiliza um
// canal que também conta história de fuzilamento e roubo de taça; grotesca neutra demais devolve a
// marca pro genérico. O ponto certo é personalidade de CARTAZ, não de desenho animado.
//
//   node futgibi/marca/provar-tipografia.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { VERDE, CREME, LARANJA, PRETO, FONTE_ARTE, conferirFonte } from './tokens.mjs';

await conferirFonte(sharp);   // a arte não sai em fallback silencioso

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, '_prova-tipografia.png');
const W = 1500;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// familia do sistema -> a webfont equivalente que entraria no site
const DIRECOES = [
  { fam: 'Helvetica',        peso: 'bold', web: 'Archivo Black / Inter Black',
    rot: 'GROTESCA NEUTRA', nota: 'o que está no ar hoje. Segura, legível, sem personalidade nenhuma.' },
  { fam: 'Impact',           peso: 'normal', web: 'Anton',
    rot: 'CONDENSADA DE MANCHETE', nota: 'a linguagem do cartaz esportivo e da capa de jornal. Cabe muito texto em pouca largura.' },
  { fam: 'Phosphate',        peso: 'normal', web: 'Big Shoulders Display / Oswald',
    rot: 'CONDENSADA DE CARTAZ', nota: 'mais fina e mais alta que a Impact. Ar de pôster antigo, menos peso de manchete.' },
  { fam: 'American Typewriter', peso: 'bold', web: 'Ultra / Alfa Slab One',
    rot: 'SLAB PESADA', nota: 'serifa grossa de gibi antigo e de papel de banca. A webfont Ultra é bem mais gorda que esta prévia.' },
  { fam: 'Futura',           peso: 'bold', web: 'Poppins / Montserrat ExtraBold',
    rot: 'GEOMÉTRICA', nota: 'moderna e limpa. Elegante, mas puxa a marca pra design de app.' },
  { fam: 'Arial Rounded MT Bold', peso: 'bold', web: 'Bowlby One / Titan One / Fredoka',
    rot: 'ARREDONDADA GORDA', nota: 'a família do cartoon pesado: canto redondo, muito peso. Cara de logo, e a mais amigável de todas.' },
  { fam: 'Marker Felt',      peso: 'bold', web: 'Patrick Hand / Permanent Marker',
    rot: 'MANUSCRITA', nota: 'combina com o traço rabisco, mas some em tamanho pequeno e infantiliza fato sério.' },
  { fam: 'Trattatello',      peso: 'normal', web: 'Bangers / Luckiest Guy',
    rot: 'DECORATIVA', nota: 'o extremo oposto do neutro. Tem personalidade demais pra carregar uma marca inteira.' },
];

const ALTURA = 196;
const H = 150 + DIRECOES.length * ALTURA + 40;

const blocos = DIRECOES.map((d, i) => {
  const y = 150 + i * ALTURA;
  return `
    <rect x="0" y="${y}" width="${W}" height="${ALTURA - 10}" fill="${i % 2 ? '#12572f' : VERDE}"/>
    <text x="46" y="${y + 40}" font-family='${FONTE_ARTE}' font-size="21" font-weight="bold"
          letter-spacing="3" fill="${LARANJA}">${i + 1}. ${d.rot}</text>
    <text x="46" y="${y + 118}" font-family="${esc(d.fam)}" font-size="76" font-weight="${d.peso}"
          fill="${CREME}">PRA VESTIR A 12</text>
    <text x="46" y="${y + 160}" font-family="${esc(d.fam)}" font-size="27" font-weight="${d.peso}"
          fill="${CREME}" opacity="0.9">Todo perfil de futebol no Brasil torce pra alguém</text>
    <text x="${W - 46}" y="${y + 40}" text-anchor="end" font-family='${FONTE_ARTE}' font-size="20"
          font-weight="bold" fill="${CREME}">web: ${esc(d.web)}</text>
    <text x="${W - 46}" y="${y + 68}" text-anchor="end" font-family='${FONTE_ARTE}' font-size="17"
          fill="${CREME}" opacity="0.78">${esc(d.nota)}</text>`;
}).join('');

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${PRETO}"/>
  <rect x="0" y="0" width="${W}" height="132" fill="${CREME}"/>
  <text x="46" y="60" font-family='${FONTE_ARTE}' font-size="34" font-weight="bold"
        letter-spacing="2" fill="${PRETO}">FUTGIBI · direções de tipografia</text>
  <text x="46" y="98" font-family='${FONTE_ARTE}' font-size="20" fill="${PRETO}" opacity="0.8">
    Escolha a DIREÇÃO olhando. A fonte de sistema é só a parente próxima; a webfont indicada à direita é a que vai pro site.</text>
  ${blocos}
</svg>`;

await mkdir(path.dirname(SAIDA), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(SAIDA);
console.log('OK ->', SAIDA);
