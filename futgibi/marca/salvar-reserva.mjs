// A RESERVA DE ÍCONES DA MARCA (17/08/2026). Do funil do símbolo, o Raphael aprovou os TRÊS
// finalistas (apito-balão, painel-bola e camisa-12) NAS TRÊS CORES (creme, verde e laranja), com
// o destino dito na escolha: o painel-bola laranja virou o símbolo oficial, e o resto fica salvo
// "para eventualmente serem usados também em outros contextos". A bola-balão meio-tom entra
// junto: foi símbolo oficial por um dia e continua aprovada, só perdeu o posto.
//
// Este script tira as peças do rascunho (`_icone-conceitos/` e `_logo-final/`, pastas de
// trabalho) e grava a versão PREPARADA em `icones-reserva/` (sem underscore: acervo, não
// rascunho): fundo fora por inundação e paleta normalizada pros hex da marca, a mesma cozinha do
// gerar-logo-oficial. O tokens.mjs publica a pasta no site, e o manual mostra a galeria.
//
//   node futgibi/marca/salvar-reserva.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FONTE = path.join(AQUI, '_icone-conceitos');
const SAIDA = path.join(AQUI, 'icones-reserva');
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const DE_PARA = [hex(PRETO), hex(CREME), hex(LARANJA), hex(VERDE)];
const CORES = [PRETO, CREME, LARANJA, VERDE];

const preparar = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const claro = (n) => data[n * c] >= 232 && data[n * c + 1] >= 232 && data[n * c + 2] >= 232;
  const fundo = new Uint8Array(w * h), fila = new Int32Array(w * h);
  let i = 0, f = 0;
  const semear = (n) => { if (!fundo[n] && claro(n)) { fundo[n] = 1; fila[f++] = n; } };
  for (let x = 0; x < w; x++) { semear(x); semear((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semear(y * w); semear(y * w + w - 1); }
  while (i < f) {
    const n = fila[i++], x = n % w, y = (n / w) | 0;
    if (x > 0) semear(n - 1);
    if (x < w - 1) semear(n + 1);
    if (y > 0) semear(n - w);
    if (y < h - 1) semear(n + w);
  }
  for (let n = 0; n < w * h; n++) {
    if (fundo[n]) { data[n * c + 3] = 0; continue; }
    const rgb = [data[n * c], data[n * c + 1], data[n * c + 2]];
    let melhor = 0, dm = Infinity;
    for (const [k, alvo] of DE_PARA.entries()) {
      const d = (rgb[0] - alvo[0]) ** 2 + (rgb[1] - alvo[1]) ** 2 + (rgb[2] - alvo[2]) ** 2;
      if (d < dm) { dm = d; melhor = k; }
    }
    const novo = hex(CORES[melhor]);
    data[n * c] = novo[0]; data[n * c + 1] = novo[1]; data[n * c + 2] = novo[2];
  }
  return sharp(data, { raw: { width: w, height: h, channels: c } }).trim({ threshold: 1 }).png().toBuffer();
};

await mkdir(SAIDA, { recursive: true });
const FINAL = path.join(AQUI, '_logo-final');
const PECAS = [
  // [arquivo na reserva, origem]
  ['apito-balao.png', path.join(FONTE, 'apito-balao.png')],
  ['apito-balao-verde.png', path.join(FINAL, 'apito-balao--verde.png')],
  ['apito-balao-laranja.png', path.join(FINAL, 'apito-balao--laranja.png')],
  ['painel-bola.png', path.join(FONTE, 'painel-bola.png')],
  ['painel-bola-verde.png', path.join(FINAL, 'painel-bola--verde.png')],
  ['painel-bola-laranja.png', path.join(FINAL, 'painel-bola--laranja.png')],
  ['camisa-12.png', path.join(FONTE, 'camisa-12.png')],
  ['camisa-12-verde.png', path.join(FINAL, 'camisa-12--verde.png')],
  ['camisa-12-laranja.png', path.join(FINAL, 'camisa-12--laranja.png')],
  ['bola-balao.png', path.join(AQUI, '_bola-variantes/meio-tom.png')],
];
for (const [nome, origem] of PECAS) {
  const png = await preparar(origem);
  await writeFile(path.join(SAIDA, nome), png);
  const m = await sharp(png).metadata();
  console.log(`OK -> icones-reserva/${nome}  (${m.width}x${m.height})`);
}
