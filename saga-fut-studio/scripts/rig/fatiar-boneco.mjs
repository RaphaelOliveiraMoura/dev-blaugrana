// fatiar-boneco.mjs <slug> — separa as peças da folha, tira o magenta e MEDE cada uma.
//
// O que ele grava no `_boneco.json` é o que transforma imagem solta em esqueleto: para cada peça, o
// tamanho, o PIVÔ (onde ela gira) e a PONTA (onde o filho se encaixa). Sai da convenção da folha —
// peça na vertical, ligação no topo — então ninguém precisa marcar articulação na mão.
//
// POR QUE NÃO CORTA POR GRID: a primeira versão dividia a folha em células iguais, como o
// slice-acao faz. Numa folha de AÇÃO isso funciona, porque cada célula tem o personagem inteiro e
// centrado. Numa folha de PEÇAS não: o gerador espalha doze objetos pequenos e não os centra nas
// células, então o corte reto entregou um tronco cortado ao meio com um naco do braço vizinho
// junto. Aqui as peças são achadas pelo DESENHO (ilhas de pixel conectado) e o grid vira só a
// ordem de leitura.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, keyMagenta } from '../sprites/config.mjs';
import { PECAS, GRID_BONECO, dirBoneco, arquivoPeca, folhaBoneco, metaBoneco } from '../../shared/boneco.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node fatiar-boneco.mjs <slug>'); process.exit(1); }

const sheetAbs = path.join(CONTEUDO, folhaBoneco(SLUG));
const { data, info } = await sharp(sheetAbs).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
keyMagenta(data, W, H);   // zera o alpha do fundo na folha inteira

// --- ilhas de desenho -------------------------------------------------------------------------
// Rótulo por varredura iterativa (pilha, não recursão: uma peça tem centenas de milhares de pixels
// e recursão estoura a pilha do node).
const visto = new Uint8Array(W * H);
const ilhas = [];
const OPACO = (p) => data[p * 4 + 3] > 128;
for (let p0 = 0; p0 < W * H; p0++) {
  if (visto[p0] || !OPACO(p0)) continue;
  const pilha = [p0];
  visto[p0] = 1;
  let minX = W, minY = H, maxX = 0, maxY = 0, area = 0;
  while (pilha.length) {
    const p = pilha.pop();
    const x = p % W, y = (p / W) | 0;
    area++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    // 8-vizinhos: o contorno preto às vezes só encosta na diagonal e 4-vizinhos parte a peça em duas
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (!visto[q] && OPACO(q)) { visto[q] = 1; pilha.push(q); }
    }
  }
  if (area > (W * H) / 4000) ilhas.push({ minX, minY, maxX, maxY, area });
}

const [GC, GR] = GRID_BONECO;
if (ilhas.length !== PECAS.length) {
  console.error(`FAIL achei ${ilhas.length} peça(s) na folha de "${SLUG}", esperava ${PECAS.length}.`);
  console.error('     duas peças encostadas viram uma só, e peça faltando deixa o boneco sem membro.');
  console.error(`     conserto: node scripts/asset.mjs boneco ${SLUG} --refazer`);
  process.exit(1);
}

// ORDEM DE LEITURA: linha por linha, esquerda para a direita — a mesma ordem que o prompt manda
// desenhar. Agrupar por linha usa a altura média como tolerância, porque as peças de uma mesma
// linha não ficam alinhadas no pixel.
const alturaMedia = ilhas.reduce((s, i) => s + (i.maxY - i.minY), 0) / ilhas.length;
ilhas.sort((a, b) => a.minY - b.minY);
const linhas = [];
for (const i of ilhas) {
  const cy = (i.minY + i.maxY) / 2;
  const linha = linhas.find((l) => Math.abs(l.cy - cy) < alturaMedia * 0.6);
  if (linha) { linha.itens.push(i); linha.cy = (linha.cy * (linha.itens.length - 1) + cy) / linha.itens.length; }
  else linhas.push({ cy, itens: [i] });
}
linhas.forEach((l) => l.itens.sort((a, b) => a.minX - b.minX));
const ordenadas = linhas.flatMap((l) => l.itens);
if (linhas.length !== GR) console.warn(`aviso: li ${linhas.length} linha(s) de peças, o grid é ${GC}x${GR} — confira a folha.`);

// --- recorte e medida -------------------------------------------------------------------------
await mkdir(path.join(CONTEUDO, dirBoneco(SLUG)), { recursive: true });
const pecas = {};
for (let i = 0; i < PECAS.length; i++) {
  const p = PECAS[i], b = ordenadas[i];
  const w = b.maxX - b.minX + 1, h = b.maxY - b.minY + 1;
  const png = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: b.minX, top: b.minY, width: w, height: h }).png().toBuffer();
  await writeFile(path.join(CONTEUDO, arquivoPeca(SLUG, p.id)), png);

  // O X DO PIVÔ SAI DA FAIXA DA JUNTA, NÃO DO MEIO DA PEÇA. Usar w/2 assume que o eixo do membro
  // passa pelo centro do retângulo, e isso é falso sempre que a peça tem algo projetado pro lado:
  // o antebraço tem a MÃO, que puxa o retângulo, e o cotovelo saía deslocado.
  const centroDaFaixa = (deTopo) => {
    const faixa = Math.max(3, Math.round(h * 0.10));
    let soma = 0, n = 0;
    for (let yy = 0; yy < faixa; yy++) {
      const y = deTopo ? b.minY + yy : b.maxY - yy;
      for (let x = b.minX; x <= b.maxX; x++) if (data[(y * W + x) * 4 + 3] > 128) { soma += x - b.minX; n++; }
    }
    return n ? soma / n : w / 2;
  };
  const doTopo = p.ancora === 'topo';
  const pivo = [centroDaFaixa(doTopo), doTopo ? 0 : h];
  const ponta = [centroDaFaixa(!doTopo), doTopo ? h : 0];

  // ONDE O TRONCO É LARGO, MEDIDO NELE. Os quatro filhos do tronco não podem sair de fração da
  // largura TOTAL da peça: o desenho tem ombro estreito em cima e calção largo embaixo, então uma
  // fração fixa cai no vazio ao lado do ombro e o braço nasce solto, flutuando ao lado do corpo.
  let bordas = null;
  if (p.id === 'tronco') {
    const larguraEm = (fy) => {
      const y = b.minY + Math.round(h * fy);
      let x1 = null, x2 = null;
      for (let x = b.minX; x <= b.maxX; x++) if (data[(y * W + x) * 4 + 3] > 128) { if (x1 === null) x1 = x; x2 = x; }
      return x1 === null ? [0, w] : [x1 - b.minX, x2 - b.minX];
    };
    bordas = { ombro: larguraEm(0.22), quadril: larguraEm(0.70) };
  }
  pecas[p.id] = { arquivo: arquivoPeca(SLUG, p.id), w, h, pivo, ponta, ancora: p.ancora, ...(bordas ? { bordas } : {}) };
}

await writeFile(path.join(CONTEUDO, metaBoneco(SLUG)), JSON.stringify({ slug: SLUG, pecas }, null, 2) + '\n');
console.log(`OK boneco ${SLUG}: ${Object.keys(pecas).length} peças -> ${dirBoneco(SLUG)}`);
for (const [id, p] of Object.entries(pecas)) console.log(`   ${id.padEnd(18)} ${p.w}x${p.h}`);
