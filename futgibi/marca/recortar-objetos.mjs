// Fatia as folhas de OBJETOS e DETALHES (_ilustracoes/objetos.png, detalhes.png) em spots: os
// PNGs transparentes que decoram composição e manual sem pedir atenção.
//
// COMO: (1) corta a borda mosqueada que o Grok põe em volta; (2) remove o fundo por INUNDAÇÃO a
// partir das bordas (fundo é o claro que ENCOSTA na borda, nunca "o claro em geral": limiar de
// brilho apagaria o creme de dentro da bola junto com o papel); (3) rotula as manchas restantes e
// AGRUPA as próximas, porque um rabisco de movimento são quatro traços soltos que pertencem ao
// mesmo spot; (4) salva cada grupo aparado em `spots/`.
//
// Os NOMES da folha são declarados aqui embaixo, na ordem de leitura (esquerda->direita,
// cima->baixo). Nome errado é o preço de o recorte ser automático; a folha `_folha.png` existe
// pra conferir olhando.
//
//   node futgibi/marca/recortar-objetos.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { VERDE, CREME } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');
const SAIDA = path.join(AQUI, 'spots');

// o que cada folha contém, na ordem de leitura. O cachecol sai listrado (o modelo ignorou o
// "plain") e listra é proibida: ele fica com nome `_descartado-` e não é publicado.
const FOLHAS = {
  // A ordem é a de EXTRAÇÃO (conferida na _folha.png), não a ordem visual da folha: o rótulo por
  // banda de altura põe o gibi fechado antes da chuteira. Dois descartes com motivo: o cachecol
  // saiu LISTRADO (o modelo ignorou o "plain", e listra é proibida) e o gibi fechado saiu com capa
  // camuflada, que não é paleta de ninguém.
  // A BOLA DESTA FOLHA saiu OVAL (276x193, razao 1.43): o prompt dizia "football" e o modelo
  // desenhou os gomos certos numa silhueta de bola de futebol americano. Ela virou o `spot-bola`
  // da marca e entrou em producao. O nome fica aqui, na posicao dela, porque a ordem de extracao e
  // posicional: tirar o nome da lista deslocaria todos os seguintes. A bola boa vem da folha
  // `bola`, gerada sozinha.
  objetos: ['_descartado-bola-oval', 'apito', '_descartado-cachecol', '_descartado-gibi-camuflado', 'chuteira',
    'gibi-aberto', 'cone', 'bandeirinha', 'radinho'],
  bola: ['bola'],
  detalhes: ['movimento', 'espiral', 'impacto', 'gotas', 'poeira', 'confete', 'nota', 'tracos'],
};

const MARGEM = 0.06;     // a borda mosqueada do Grok, cortada antes de tudo
// ...menos onde nao ha borda pra cortar: a folha `bola` sai do codex com o objeto preenchendo o
// quadro, e 6% de cada lado comeria a beirada da propria bola.
const MARGEM_FOLHA = { bola: 0 };
const DIST_GRUPO = 32;   // caixas a menos de 32px viram o mesmo spot (46 fundia o impacto com as gotas)
const AREA_MIN = 900;    // mancha menor que isso é respingo, não spot

const fatiar = async (folha, nomes) => {
  const src = path.join(ILUS, `${folha}.png`);
  const meta = await sharp(src).metadata();
  const margem = MARGEM_FOLHA[folha] ?? MARGEM;
  const mx = Math.round(meta.width * margem), my = Math.round(meta.height * margem);
  const corte = { left: mx, top: my, width: meta.width - mx * 2, height: meta.height - my * 2 };
  const { data, info } = await sharp(src).extract(corte)
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  // fundo: claro E pouco saturado, porque o papel do Grok é mosqueado (rosa e azul pálidos), não
  // branco. O limiar de saturação é o que impede o cinza do apito de contar como papel.
  const claro = (n) => {
    const r = data[n * c], g = data[n * c + 1], b = data[n * c + 2];
    return Math.min(r, g, b) >= 132 && Math.max(r, g, b) - Math.min(r, g, b) <= 60;
  };
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

  // manchas do que sobrou
  const visto = new Uint8Array(w * h);
  const caixas = [];
  for (let p = 0; p < w * h; p++) {
    if (fundo[p] || visto[p] || data[p * c + 3] < 128) continue;
    let ini = 0, fim = 0, n = 0, xa = w, xb = 0, ya = h, yb = 0;
    fila[fim++] = p; visto[p] = 1;
    while (ini < fim) {
      const q = fila[ini++]; n++;
      const qx = q % w, qy = (q / w) | 0;
      if (qx < xa) xa = qx; if (qx > xb) xb = qx;
      if (qy < ya) ya = qy; if (qy > yb) yb = qy;
      for (const v of [q - 1, q + 1, q - w, q + w]) {
        const vx = v % w;
        if (v < 0 || v >= w * h || visto[v] || fundo[v] || data[v * c + 3] < 128) continue;
        if (Math.abs(vx - qx) > 1) continue;
        visto[v] = 1; fila[fim++] = v;
      }
    }
    if (n >= AREA_MIN / 4) caixas.push({ xa, xb, ya, yb, n });
  }

  // agrupar caixas próximas (o rabisco de movimento são traços soltos do mesmo desenho)
  const perto = (a, b) =>
    a.xa - DIST_GRUPO < b.xb && b.xa - DIST_GRUPO < a.xb &&
    a.ya - DIST_GRUPO < b.yb && b.ya - DIST_GRUPO < a.yb;
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let a = 0; a < caixas.length && !mudou; a++)
      for (let b = a + 1; b < caixas.length && !mudou; b++)
        if (perto(caixas[a], caixas[b])) {
          caixas[a] = { xa: Math.min(caixas[a].xa, caixas[b].xa), xb: Math.max(caixas[a].xb, caixas[b].xb),
            ya: Math.min(caixas[a].ya, caixas[b].ya), yb: Math.max(caixas[a].yb, caixas[b].yb),
            n: caixas[a].n + caixas[b].n };
          caixas.splice(b, 1); mudou = true;
        }
  }
  const grupos = caixas.filter((g) => g.n >= AREA_MIN)
    .sort((a, b) => (Math.round(a.ya / 220) - Math.round(b.ya / 220)) || (a.xa - b.xa));

  if (grupos.length !== nomes.length)
    console.warn(`AVISO ${folha}: ${grupos.length} spots recortados para ${nomes.length} nomes declarados. Confira a _folha.png antes de usar.`);

  // o fundo vira alfa zero e cada grupo sai aparado
  for (let p = 0; p < w * h; p++) if (fundo[p]) data[p * c + 3] = 0;
  const semFundo = await sharp(data, { raw: { width: w, height: h, channels: c } }).png().toBuffer();

  const feitos = [];
  for (const [idx, g] of grupos.entries()) {
    const nome = nomes[idx] ?? `extra-${idx}`;
    const M = 6;
    const buf = await sharp(semFundo).extract({
      left: Math.max(0, g.xa - M), top: Math.max(0, g.ya - M),
      width: Math.min(w - Math.max(0, g.xa - M), g.xb - g.xa + M * 2),
      height: Math.min(h - Math.max(0, g.ya - M), g.yb - g.ya + M * 2),
    }).png().toBuffer();
    const arq = path.join(SAIDA, `${folha === 'detalhes' ? 'det' : 'spot'}-${nome}.png`);
    await sharp(buf).toFile(arq);
    feitos.push({ nome: path.basename(arq), buf });
    console.log(`OK -> spots/${path.basename(arq)}  (${g.xb - g.xa}x${g.yb - g.ya})`);
  }
  return feitos;
};

await mkdir(SAIDA, { recursive: true });
const todos = [];
for (const [folha, nomes] of Object.entries(FOLHAS)) todos.push(...await fatiar(folha, nomes));

// a folha de conferência: cada spot nomeado, sobre o verde da marca (spot é pra usar em cima de
// cor, então a prova é sobre cor)
{
  const COL = 5, CEL = 240, PAD = 24, ROT = 34;
  const linhas = Math.ceil(todos.length / COL);
  const comps = [];
  for (const [i, t] of todos.entries()) {
    const m = await sharp(t.buf).metadata();
    const esc = Math.min((CEL - 40) / m.width, (CEL - 40 - ROT) / m.height, 1);
    const im = await sharp(t.buf).resize({ width: Math.max(1, Math.round(m.width * esc)) }).png().toBuffer();
    const m2 = await sharp(im).metadata();
    const cx = PAD + (i % COL) * CEL, cy = PAD + Math.floor(i / COL) * CEL;
    comps.push({ input: im, left: cx + Math.round((CEL - m2.width) / 2),
      top: cy + ROT + Math.round((CEL - ROT - m2.height) / 2) });
    comps.push({ input: Buffer.from(`<svg width="${CEL}" height="${ROT}">
      <text x="${CEL / 2}" y="24" text-anchor="middle" font-family="Helvetica" font-size="15"
        font-weight="bold" fill="${CREME}">${t.nome.replace('.png', '')}</text></svg>`),
      left: cx, top: cy });
  }
  const FW = PAD * 2 + COL * CEL, FH = PAD * 2 + linhas * CEL;
  await sharp({ create: { width: FW, height: FH, channels: 4, background: VERDE } })
    .composite(comps).png().toFile(path.join(SAIDA, '_folha.png'));
  console.log('OK -> spots/_folha.png');
}
