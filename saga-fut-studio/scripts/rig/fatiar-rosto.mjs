// fatiar-rosto.mjs <slug> — separa as expressões da folha e ALINHA todas pelo mesmo ponto.
//
// O ALINHAMENTO É O PONTO TODO. As expressões vão se substituir no MESMO lugar da tela, uma por
// frame; se cada recorte tiver a cabeça um pouco mais alta ou mais à esquerda, a troca vira um
// solavanco e o personagem parece que levou um susto a cada piscada. É o mesmo defeito que a folha
// de exposição já caça nas folhas de movimento, aqui aplicado à cara.
//
// Por isso todas as expressões são gravadas num canvas do MESMO tamanho, com a cabeça centrada
// pelo TOPO DO CRÂNIO e pela BASE DO PESCOÇO — dois pontos que não mudam com a expressão (a boca
// muda, o crânio não).
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, keyMagenta } from '../sprites/config.mjs';
import { EXPRESSOES, GRID_ROSTO, dirRosto, folhaRosto, arquivoExpressao, metaRosto } from '../../shared/rosto.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node fatiar-rosto.mjs <slug>'); process.exit(1); }

const { data, info } = await sharp(path.join(CONTEUDO, folhaRosto(SLUG))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
keyMagenta(data, W, H);

// ilhas de desenho (mesma técnica do boneco: o gerador não centra nas células)
const visto = new Uint8Array(W * H);
const OPACO = (p) => data[p * 4 + 3] > 128;
const ilhas = [];
for (let p0 = 0; p0 < W * H; p0++) {
  if (visto[p0] || !OPACO(p0)) continue;
  const pilha = [p0]; visto[p0] = 1;
  let minX = W, minY = H, maxX = 0, maxY = 0, area = 0;
  while (pilha.length) {
    const p = pilha.pop(), x = p % W, y = (p / W) | 0;
    area++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (!visto[q] && OPACO(q)) { visto[q] = 1; pilha.push(q); }
    }
  }
  if (area > (W * H) / 3000) ilhas.push({ minX, minY, maxX, maxY, area });
}
if (ilhas.length !== EXPRESSOES.length) {
  console.error(`FAIL achei ${ilhas.length} expressão(ões), esperava ${EXPRESSOES.length}.`);
  console.error(`     conserto: node scripts/asset.mjs rosto ${SLUG} --refazer`);
  process.exit(1);
}

const [GC, GR] = GRID_ROSTO;
const alturaMedia = ilhas.reduce((s, i) => s + (i.maxY - i.minY), 0) / ilhas.length;
ilhas.sort((a, b) => a.minY - b.minY);
const linhas = [];
for (const i of ilhas) {
  const cy = (i.minY + i.maxY) / 2;
  const l = linhas.find((x) => Math.abs(x.cy - cy) < alturaMedia * 0.6);
  if (l) { l.itens.push(i); l.cy = (l.cy * (l.itens.length - 1) + cy) / l.itens.length; }
  else linhas.push({ cy, itens: [i] });
}
linhas.forEach((l) => l.itens.sort((a, b) => a.minX - b.minX));
const ordenadas = linhas.flatMap((l) => l.itens);

// CANVAS COMUM: a maior das expressões manda, e todas são coladas nele pelo mesmo ponto de âncora
// (centro horizontal e topo do crânio). É isso que garante que a troca não mexa a cabeça.
const maxW = Math.max(...ordenadas.map((b) => b.maxX - b.minX + 1));
const maxH = Math.max(...ordenadas.map((b) => b.maxY - b.minY + 1));
const CW = maxW + 8, CH = maxH + 8;

await mkdir(path.join(CONTEUDO, dirRosto(SLUG)), { recursive: true });
const expressoes = {};
for (let i = 0; i < EXPRESSOES.length; i++) {
  const e = EXPRESSOES[i], b = ordenadas[i];
  const w = b.maxX - b.minX + 1, h = b.maxY - b.minY + 1;
  const recorte = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: b.minX, top: b.minY, width: w, height: h }).png().toBuffer();
  const png = await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: recorte, left: Math.round((CW - w) / 2), top: 4 }]).png().toBuffer();
  await writeFile(path.join(CONTEUDO, arquivoExpressao(SLUG, e.id)), png);
  expressoes[e.id] = { arquivo: arquivoExpressao(SLUG, e.id), w: CW, h: CH };
}

await writeFile(path.join(CONTEUDO, metaRosto(SLUG)), JSON.stringify({ slug: SLUG, w: CW, h: CH, expressoes }, null, 2) + '\n');
console.log(`OK rosto ${SLUG}: ${EXPRESSOES.length} expressões em canvas ${CW}x${CH} -> ${dirRosto(SLUG)}`);
