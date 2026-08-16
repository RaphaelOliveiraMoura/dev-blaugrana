// RODADA 4 DE LOGOTIPO, por código. As três rodadas anteriores já gastaram os caminhos óbvios
// (moldura de capa, carimbo, gol, figurinha, camisa, balão, monograma, etiqueta, grampo), então
// esta vai atrás do que ainda não foi tentado.
//
// O CRITÉRIO DE ESCOLHA DAS OITO: cada uma tinha que ter um motivo pra existir que não fosse
// "outra caixa em volta do nome", que é o vício das rodadas passadas.
//
//   1. autografo  · o nome como assinatura de jogador. É o gesto mais futebol que existe e o
//                   único aqui que não usa fonte nenhuma: as letras são CURVAS desenhadas.
//   2. onomatopeia· o nome tratado como som de quadrinho, inclinado, com bloco de cor atrás
//   3. selo       · a borda serrilhada de selo postal, que é o objeto colecionável por excelência
//   4. duas-cores · "Fut" e "Gibi" em blocos de cor diferentes, encaixados como peça de dominó
//   5. numero     · o 12 gigante como suporte, o nome pequeno em cima dele
//   6. marquise   · a placa de banca iluminada, com as lâmpadas em volta
//   7. rolo       · a revista enrolada, que é como gibi viaja no bolso de quem lê
//   8. traco      · o nome atravessado pela linha do campo, que continua fora da caixa
//
//   node futgibi/marca/gerar-logo4.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE, T } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'logo4');
const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

const OSWALD = '"Oswald","Big Shoulders Display","Arial Narrow",Impact,sans-serif';
const COMIC = '"Comic Neue","Chalkboard SE",sans-serif';
const NOME = T.marca.escrita.texto;

const svg = (w, h, corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${fundo ? `  <rect width="${w}" height="${h}" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

const bolinha = (cx, cy, r, { tinta, papel }) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${papel}" stroke="${tinta}" stroke-width="${r * 0.34}"/>
  <path d="M ${cx},${cy - r * 0.62} L ${cx + r * 0.6},${cy - r * 0.18} L ${cx + r * 0.37},${cy + r * 0.5}
    L ${cx - r * 0.37},${cy + r * 0.5} L ${cx - r * 0.6},${cy - r * 0.18} Z" fill="${tinta}"/>`;

const LOGOS = {
  // 1. AUTÓGRAFO. O único sem fonte: cada letra é um caminho desenhado à mão, com a espessura
  //    variando como caneta de verdade (stroke fino nas subidas, grosso nas descidas). É o gesto
  //    do jogador assinando a camisa, que é o objeto mais afetivo do futebol.
  //    A primeira versão desenhava cada letra como path à mão e saiu "AutGnibi": letra desenhada
  //    sem referência de desenhista não fecha, e teimar nisso gasta a rodada. O GESTO sobrevive
  //    por outro meio: lettering inclinado, floreio de caneta embaixo e a linha da camisa onde a
  //    assinatura pousa.
  '1-autografo': (c) => svg(600, 230, `
  <g transform="translate(46,146) skewX(-12)">
    <text x="0" y="0" font-family='${COMIC}' font-size="104" font-weight="700"
      fill="${c.tinta}">${NOME}</text>
  </g>
  <path d="M 40,176 C 150,196 300,192 430,170 C 470,163 492,150 486,138 C 480,126 462,132 458,148
    C 454,166 472,182 512,186" fill="none" stroke="${c.tinta}" stroke-width="7"
    stroke-linecap="round"/>
  <path d="M 34,206 L 566,206" stroke="${c.acento}" stroke-width="7" stroke-linecap="round"/>`, c.fundo),

  // 2. ONOMATOPEIA. O nome como SOM: inclinado, com bloco de cor atrás e o contorno duplo das
  //    interjeições de gibi. É a rodada mais barulhenta, e a única que tem movimento.
  '2-onomatopeia': (c) => svg(600, 230, `
  <g transform="translate(300,120) rotate(-7)">
    <text x="6" y="26" text-anchor="middle" font-family='${COMIC}' font-size="104"
      font-weight="700" fill="${c.acento}">${NOME}</text>
    <text x="0" y="20" text-anchor="middle" font-family='${COMIC}' font-size="104"
      font-weight="700" stroke="${c.tinta}" stroke-width="13" stroke-linejoin="round"
      fill="${c.papel}" paint-order="stroke">${NOME}</text>
  </g>
  <g stroke="${c.tinta}" stroke-width="7" stroke-linecap="round">
    <path d="M 54,44 L 92,66"/><path d="M 30,96 L 74,102"/><path d="M 546,44 L 508,66"/>
    <path d="M 570,96 L 526,102"/>
  </g>`, c.fundo),

  // 3. SELO POSTAL. A borda serrilhada é a forma mais reconhecível de "coisa que se coleciona", e
  //    o canal é um acervo. O 12 no canto faz o papel do valor facial.
  '3-selo': (c) => {
    const w = 420, h = 460, p = 15, r = 11;
    const dentes = [];
    for (let x = p + 20; x < w - p - 10; x += 26) dentes.push(`<circle cx="${x}" cy="${p}" r="${r}" fill="${c.fundo || c.papelFora}"/>`,
      `<circle cx="${x}" cy="${h - p}" r="${r}" fill="${c.fundo || c.papelFora}"/>`);
    for (let y = p + 20; y < h - p - 10; y += 26) dentes.push(`<circle cx="${p}" cy="${y}" r="${r}" fill="${c.fundo || c.papelFora}"/>`,
      `<circle cx="${w - p}" cy="${y}" r="${r}" fill="${c.fundo || c.papelFora}"/>`);
    return svg(w, h, `
  <rect x="${p}" y="${p}" width="${w - p * 2}" height="${h - p * 2}" fill="${c.papel}"/>
  ${dentes.join('\n  ')}
  <rect x="${p + 22}" y="${p + 22}" width="${w - p * 2 - 44}" height="${h - p * 2 - 44}"
    fill="none" stroke="${c.tinta}" stroke-width="6"/>
  ${bolinha(210, 190, 76, c)}
  <text x="210" y="330" text-anchor="middle" font-family='${OSWALD}' font-size="62"
    font-weight="700" fill="${c.tinta}">${NOME}</text>
  <text x="210" y="382" text-anchor="middle" font-family='${OSWALD}' font-size="21"
    font-weight="700" letter-spacing="2" fill="${c.tinta}">FUTEBOL EM QUADRINHOS</text>
  <text x="${w - p - 46}" y="${p + 74}" text-anchor="middle" font-family='${OSWALD}'
    font-size="44" font-weight="700" fill="${c.acento}">12</text>`, c.fundo);
  },

  // 4. DUAS CORES. "Fut" e "Gibi" em blocos que se encaixam, como peça de dominó. O nome vira
  //    FORMA antes de virar palavra, e é o único que funciona sem nenhuma moldura em volta.
  '4-duas-cores': (c) => svg(560, 240, `
  <rect x="30" y="34" width="238" height="80" fill="${c.tinta}"/>
  <text x="149" y="96" text-anchor="middle" font-family='${OSWALD}' font-size="66"
    font-weight="700" fill="${c.papel}">Fut</text>
  <rect x="268" y="114" width="262" height="80" fill="${c.acento}"
    stroke="${c.tinta}" stroke-width="5"/>
  <text x="399" y="176" text-anchor="middle" font-family='${OSWALD}' font-size="66"
    font-weight="700" fill="${c.sobreAcento}">Gibi</text>
  <rect x="30" y="114" width="238" height="80" fill="none" stroke="${c.tinta}" stroke-width="5"/>
  <text x="149" y="176" text-anchor="middle" font-family='${OSWALD}' font-size="26"
    font-weight="700" letter-spacing="2" fill="${c.tinta}">FUTEBOL EM</text>
  <rect x="268" y="34" width="262" height="80" fill="none" stroke="${c.tinta}" stroke-width="5"/>
  <text x="399" y="96" text-anchor="middle" font-family='${OSWALD}' font-size="26"
    font-weight="700" letter-spacing="2" fill="${c.tinta}">QUADRINHOS</text>`, c.fundo),

  // 5. NÚMERO. O 12 é o que a marca tem de mais próprio, então aqui ele é o SUPORTE e o nome mora
  //    em cima dele. É o mais forte no tamanho pequeno, porque a 32px sobra o número.
  '5-numero': (c) => svg(460, 460, `
  <text x="230" y="368" text-anchor="middle" font-family='${OSWALD}' font-size="380"
    font-weight="700" letter-spacing="-14" fill="${c.tinta}">12</text>
  <rect x="46" y="176" width="368" height="94" fill="${c.papel}" stroke="${c.tinta}" stroke-width="8"/>
  <text x="230" y="244" text-anchor="middle" font-family='${OSWALD}' font-size="70"
    font-weight="700" fill="${c.tinta}">${NOME}</text>
  <rect x="46" y="270" width="368" height="9" fill="${c.acento}"/>`, c.fundo),

  // 6. MARQUISE. A placa de banca com lâmpadas em volta: é o objeto que anuncia que ABRIU, e o
  //    canal é uma banca que acabou de abrir.
  '6-marquise': (c) => {
    const luzes = [];
    for (let x = 52; x <= 508; x += 38) luzes.push(`<circle cx="${x}" cy="34" r="10" fill="${c.acento}" stroke="${c.tinta}" stroke-width="4"/>`,
      `<circle cx="${x}" cy="186" r="10" fill="${c.acento}" stroke="${c.tinta}" stroke-width="4"/>`);
    return svg(560, 220, `
  <rect x="34" y="34" width="492" height="152" fill="${c.papel}" stroke="${c.tinta}" stroke-width="8"/>
  ${luzes.join('\n  ')}
  <text x="280" y="126" text-anchor="middle" font-family='${OSWALD}' font-size="76"
    font-weight="700" fill="${c.tinta}">${NOME}</text>
  <text x="280" y="160" text-anchor="middle" font-family='${OSWALD}' font-size="20"
    font-weight="700" letter-spacing="6" fill="${c.tinta}">FUTEBOL EM QUADRINHOS</text>`, c.fundo);
  },

  // 7. ROLO. A revista enrolada, que é como gibi anda no bolso de quem lê. O nome acompanha a
  //    curva, e é o único da rodada com volume.
  '7-rolo': (c) => svg(560, 240, `
  <path d="M 70,62 C 70,40 96,32 130,32 L 470,32 C 436,32 410,44 410,66 L 410,178
    C 410,200 436,210 470,210 L 130,210 C 96,210 70,200 70,178 Z"
    fill="${c.papel}" stroke="${c.tinta}" stroke-width="9" stroke-linejoin="round"/>
  <ellipse cx="470" cy="121" rx="34" ry="89" fill="${c.papel}" stroke="${c.tinta}" stroke-width="9"/>
  <path d="M 470,58 C 452,74 452,168 470,184" fill="none" stroke="${c.tinta}" stroke-width="5"
    opacity="0.5"/>
  <text x="240" y="140" text-anchor="middle" font-family='${OSWALD}' font-size="68"
    font-weight="700" fill="${c.tinta}">${NOME}</text>
  <rect x="112" y="156" width="256" height="8" fill="${c.acento}"/>`, c.fundo),

  // 8. TRAÇO. A linha do campo atravessa o nome e SAI da caixa dos dois lados: é o único que não
  //    se fecha, e por isso o que melhor funciona como assinatura no rodapé de uma arte.
  '8-traco': (c) => svg(600, 200, `
  <path d="M 0,166 L 600,166" stroke="${c.tinta}" stroke-width="9"/>
  <path d="M 150,166 A 104,52 0 0 1 418,166" fill="none" stroke="${c.tinta}" stroke-width="9"/>
  <text x="284" y="130" text-anchor="middle" font-family='${OSWALD}' font-size="92"
    font-weight="700" letter-spacing="1" fill="${c.tinta}">${NOME}</text>
  ${bolinha(500, 166, 24, c)}
  <circle cx="104" cy="166" r="8" fill="${c.acento}"/>`, c.fundo),
};

const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, fundo: null, papelFora: CREME, sobreAcento: PRETO },
  mono:      { tinta: PRETO, papel: CREME, acento: PRETO, fundo: null, papelFora: CREME, sobreAcento: CREME },
  invertido: { tinta: CREME, papel: VERDE, acento: CREME, fundo: VERDE, papelFora: VERDE, sobreAcento: VERDE },
};

await mkdir(SAIDA, { recursive: true });
for (const [id, fn] of Object.entries(LOGOS))
  for (const [teste, cores] of Object.entries(TESTES))
    await writeFile(path.join(SAIDA, `${id}-${teste}.svg`), fn(cores));

console.log(`OK -> ${SAIDA}  (${Object.keys(LOGOS).length} direções x ${Object.keys(TESTES).length} testes)`);
