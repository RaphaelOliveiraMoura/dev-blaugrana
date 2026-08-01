// folha-estilos.mjs [slug] — FOLHA COMPARATIVA dos estudos de estilo, numerada.
//
// Não gera nada (por isso não tem porta): lê o que já está em `estilos/testes/` e monta um PNG
// único, cada candidato com NÚMERO e nome. Existe porque estilo não se julga um por vez: lado a
// lado, em dois segundos se vê qual segura o personagem e qual apaga a cara dele. O número é o que
// permite escolher sem precisar descrever design em palavras.
//
// Saída: estilos/testes/_folha[-<slug>].png
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';
import { ESTILOS_TESTE, dirTestes } from './estilos.mjs';

const SLUG = process.argv[2] || null;
const dirAbs = path.join(CONTEUDO, dirTestes);

const ents = await readdir(dirAbs).catch(() => []);
const itens = ents
  .filter((f) => f.endsWith('.png') && !f.startsWith('_') && f.includes('__'))
  .map((f) => ({ arq: f, slug: f.split('__')[0], estilo: f.split('__')[1].replace(/\.png$/, '') }))
  .filter((i) => !SLUG || i.slug === SLUG)
  .sort((a, b) => a.slug.localeCompare(b.slug) || a.estilo.localeCompare(b.estilo));

if (!itens.length) { console.error('nenhum estudo de estilo em ' + dirTestes); process.exit(1); }

const CEL_W = 460, CEL_H = 613, ROT = 54, GAP = 10;
const COLS = Math.min(4, itens.length);
const ROWS = Math.ceil(itens.length / COLS);
const W = COLS * CEL_W + (COLS + 1) * GAP;
const H = ROWS * (CEL_H + ROT) + (ROWS + 1) * GAP;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const composicao = [];
for (let i = 0; i < itens.length; i++) {
  const it = itens[i];
  const col = i % COLS, row = Math.floor(i / COLS);
  const x = GAP + col * (CEL_W + GAP);
  const y = GAP + row * (CEL_H + ROT + GAP);
  const img = await sharp(path.join(dirAbs, it.arq)).resize(CEL_W, CEL_H, { fit: 'contain', background: '#1a1a1a' }).png().toBuffer();
  composicao.push({ input: img, left: x, top: y });
  const rotulo = ESTILOS_TESTE[it.estilo]?.rotulo || it.estilo;
  const svg = `<svg width="${CEL_W}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CEL_W}" height="${ROT}" fill="#101010"/>
    <text x="10" y="24" font-family="Helvetica,Arial" font-size="22" font-weight="bold" fill="#ffcc33">${i + 1}. ${esc(rotulo)}</text>
    <text x="10" y="45" font-family="Helvetica,Arial" font-size="15" fill="#8a8a8a">${esc(it.estilo)} · ${esc(it.slug)}</text>
  </svg>`;
  composicao.push({ input: Buffer.from(svg), left: x, top: y + CEL_H });
}

const OUTREL = `${dirTestes}/_folha${SLUG ? '-' + SLUG : ''}.png`;
await sharp({ create: { width: W, height: H, channels: 3, background: '#0d0d0d' } })
  .composite(composicao).png().toFile(path.join(CONTEUDO, OUTREL));

console.log(`\nFOLHA DE ESTILOS (${itens.length} candidatos) -> ${OUTREL}\n`);
for (let i = 0; i < itens.length; i++) {
  const e = ESTILOS_TESTE[itens[i].estilo];
  console.log(`  ${String(i + 1).padStart(2)}. ${(e?.rotulo || itens[i].estilo).padEnd(28)} ${e?.nota || ''}`);
}
console.log('');
