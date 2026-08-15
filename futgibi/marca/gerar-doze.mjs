// O 12 COMO DESENHO, não como número digitado numa fonte.
//
// As rodadas anteriores usaram o 12 da Oswald dentro de uma moldura, e é por isso que não
// carregavam nada: um número em fonte é o número que qualquer um teria. Aqui cada 12 é DESENHADO,
// e cada um vem de um lugar real onde o número 12 aparece no futebol brasileiro.
//
//   1. estêncil   · o número pintado em muro de várzea, com as pontes do vazado
//   2. costurado  · o número aplicado na camisa, com o ponto de costura em volta
//   3. mão        · traçado com o mesmo tremor das peças da marca
//   4. placar     · o número de placar mecânico, com a dobra no meio
//   5. giz        · riscado na parede da quadra, traço duplo e falhado
//   6. bloco      · o número recortado em bloco, com a sombra dura da marca
//
//   node futgibi/marca/gerar-doze.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'doze');
const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

// perturba um path de linha reta em pontos trêmulos
const tremido = (pts, tremor, semente) => {
  const p = pts.map(([x, y], i) => [
    x + (rnd(semente + i * 3.7) - 0.5) * 2 * tremor,
    y + (rnd(semente + i * 8.1) - 0.5) * 2 * tremor,
  ]);
  return 'M ' + p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
};

const svg = (corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
${fundo ? `  <rect width="400" height="400" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

// ---- O DESENHO DOS ALGARISMOS, em contorno fechado (não é fonte) --------------------------
// O "1" com o bico e o pé largo, o "2" com a barriga aberta e a base reta. Proporção de número
// de camisa: alto, pesado e com o vão interno grande, que é o que faz ler de longe.
const UM = 'M 96,118 L 150,86 L 178,86 L 178,300 L 216,300 L 216,338 L 100,338 L 100,300 ' +
           'L 140,300 L 140,132 L 108,150 Z';
const DOIS = 'M 236,150 C 236,104 272,82 312,82 C 356,82 388,108 388,152 C 388,196 356,220 ' +
             '318,252 L 268,296 L 390,296 L 390,338 L 234,338 L 234,300 C 276,262 300,244 ' +
             '326,218 C 342,200 348,180 348,156 C 348,130 334,120 312,120 C 290,120 276,132 ' +
             '276,158 Z';

const PECAS = {
  // 1. ESTÊNCIL: o vazado do muro. As PONTES (os cortes brancos) são a assinatura do estêncil,
  //    e é o que o número pintado à mão sempre tem.
  '1-estencil': (c) => svg(`
  <g fill="${c.tinta}">
    <path d="${UM}"/><path d="${DOIS}"/>
  </g>
  <g stroke="${c.papel}" stroke-width="15" stroke-linecap="butt">
    <path d="M 92,196 H 224"/><path d="M 230,196 H 396"/><path d="M 232,268 H 300"/>
  </g>`, c.fundo),

  // 2. COSTURADO: o número aplicado na camisa. O tracejado em volta é o ponto de costura.
  '2-costurado': (c) => svg(`
  <g fill="${c.acento}" stroke="${c.tinta}" stroke-width="12" stroke-linejoin="round">
    <path d="${UM}"/><path d="${DOIS}"/>
  </g>
  <g fill="none" stroke="${c.tinta}" stroke-width="3.5" stroke-dasharray="9 9" opacity="0.85">
    <path d="${UM}" transform="translate(200,212) scale(0.88) translate(-200,-212)"/>
    <path d="${DOIS}" transform="translate(200,212) scale(0.88) translate(-200,-212)"/>
  </g>`, c.fundo),

  // 3. MÃO: o mesmo tremor das peças da marca, aplicado ao número. É o que amarra o 12 ao resto
  //    do sistema, porque o traço é literalmente o mesmo.
  '3-mao': (c) => {
    const t = (d, s) => d.replace(/([\d.]+),([\d.]+)/g, (m, x, y) =>
      `${(+x + (rnd(s + +x) - 0.5) * 7).toFixed(1)},${(+y + (rnd(s + +y * 2) - 0.5) * 7).toFixed(1)}`);
    return svg(`
  <g fill="${c.papel}" stroke="${c.tinta}" stroke-width="13" stroke-linejoin="round">
    <path d="${t(UM, 11)}"/><path d="${t(DOIS, 29)}"/>
  </g>`, c.fundo);
  },

  // 4. PLACAR: o número mecânico que vira, com a dobra atravessando no meio.
  '4-placar': (c) => svg(`
  <rect x="40" y="60" width="320" height="300" rx="16" fill="${c.tinta}"/>
  <g fill="${c.papel}">
    <path d="${UM}" transform="translate(200,210) scale(0.86) translate(-200,-210)"/>
    <path d="${DOIS}" transform="translate(200,210) scale(0.86) translate(-200,-210)"/>
  </g>
  <rect x="40" y="205" width="320" height="9" fill="${c.acento}"/>`, c.fundo),

  // 5. GIZ: riscado na parede da quadra. Traço aberto, duplo e falhado, sem preenchimento.
  '5-giz': (c) => {
    const risco = (pts, s) => `<path d="${tremido(pts, 5, s)}" fill="none" stroke="${c.tinta}"
      stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>`;
    return svg(`
  ${risco([[110, 128], [156, 96], [156, 330]], 3)}
  ${risco([[112, 330], [206, 330]], 17)}
  ${risco([[240, 128], [258, 96], [318, 92], [362, 122], [354, 176], [244, 300]], 41)}
  ${risco([[240, 328], [376, 328]], 59)}`, c.fundo);
  },

  // 6. BLOCO: o número recortado, com a sombra dura da marca. É a leitura mais neobrutalista e a
  //    que mais conversa com os componentes.
  '6-bloco': (c) => svg(`
  <g fill="${c.tinta}" transform="translate(14,14)">
    <path d="${UM}"/><path d="${DOIS}"/>
  </g>
  <g fill="${c.acento}" stroke="${c.tinta}" stroke-width="11" stroke-linejoin="round">
    <path d="${UM}"/><path d="${DOIS}"/>
  </g>`, c.fundo),
};

const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, fundo: CREME },
  mono:      { tinta: PRETO, papel: CREME, acento: CREME, fundo: CREME },
  invertido: { tinta: CREME, papel: VERDE, acento: VERDE, fundo: VERDE },
};

await mkdir(SAIDA, { recursive: true });
for (const [id, fn] of Object.entries(PECAS)) {
  for (const [teste, c] of Object.entries(TESTES)) {
    await writeFile(path.join(SAIDA, `${id}-${teste}.svg`), fn(c));
  }
}
console.log(`OK -> ${SAIDA} (${Object.keys(PECAS).length} desenhos do 12)`);
