// folha-variacoes.mjs <slug> — as candidatas de ficha lado a lado, NUMERADAS, com a base atual na
// primeira célula.
//
// Não gera nada (por isso não tem porta): lê `personagens/<slug>/_variacoes/` e monta um PNG só.
// A base atual entra como célula 0 porque o julgamento aqui não é "qual é bonita", é "qual é MAIS
// parecida com o homem do que a que já está no acervo" — sem o antes na mesma imagem, a comparação
// vira memória, e memória de arte é ruim. O número é o que deixa escolher sem descrever design.
//
// Saída: personagens/<slug>/_variacoes/_folha.png
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';
import { dirVariacoes, folhaVariacoes, baseImagem, refImagem, variantesJson } from '../../shared/personagem.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node folha-variacoes.mjs <slug>'); process.exit(2); }

const dirRel = dirVariacoes(SLUG), dirAbs = path.join(CONTEUDO, dirRel);
const variantes = await readFile(path.join(CONTEUDO, variantesJson(SLUG)), 'utf8').then(JSON.parse).catch(() => []);

const candidatas = (await readdir(dirAbs).catch(() => []))
  .filter((f) => f.endsWith('.png') && !f.startsWith('_'))
  .sort();
if (!candidatas.length) { console.error(`nenhuma variação em ${dirRel}`); process.exit(1); }

// célula 0 = o que está no acervo hoje; a foto do homem real fecha a fila, como régua
const itens = [];
if (existsSync(path.join(CONTEUDO, baseImagem(SLUG)))) itens.push({ rel: baseImagem(SLUG), n: '0', rotulo: 'ATUAL (no acervo)', nota: 'o que existe hoje' });
for (const arq of candidatas) {
  const n = arq.split('-')[0];
  const v = variantes[Number(n) - 1] || {};
  // o modelo entra no rótulo porque é metade da explicação de por que uma candidata saiu melhor
  itens.push({ rel: `${dirRel}/${arq}`, n, rotulo: v.nome || arq.replace(/\.png$/, ''), nota: [v.nota, v.modelo].filter(Boolean).join(' · ') });
}
if (existsSync(path.join(CONTEUDO, refImagem(SLUG)))) itens.push({ rel: refImagem(SLUG), n: '·', rotulo: 'FOTO REAL', nota: 'a régua da semelhança' });

const CEL_W = 420, CEL_H = 630, ROT = 52, GAP = 10;
// tudo numa linha só até 7 células: a foto real caindo sozinha na linha de baixo tira dela
// justamente o papel de régua, que é estar AO LADO das candidatas
const COLS = Math.min(7, itens.length);
const ROWS = Math.ceil(itens.length / COLS);
const W = COLS * CEL_W + (COLS + 1) * GAP;
const H = ROWS * (CEL_H + ROT) + (ROWS + 1) * GAP;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const corta = (s, max) => (String(s).length > max ? String(s).slice(0, max - 1) + '…' : String(s));

const composicao = [];
for (let i = 0; i < itens.length; i++) {
  const it = itens[i];
  const x = GAP + (i % COLS) * (CEL_W + GAP);
  const y = GAP + Math.floor(i / COLS) * (CEL_H + ROT + GAP);
  const img = await sharp(path.join(CONTEUDO, it.rel)).resize(CEL_W, CEL_H, { fit: 'contain', background: '#1a1a1a' }).png().toBuffer();
  composicao.push({ input: img, left: x, top: y });
  const cor = it.n === '0' ? '#8a8a8a' : it.n === '·' ? '#66aaff' : '#ffcc33';
  const svg = `<svg width="${CEL_W}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${CEL_W}" height="${ROT}" fill="#101010"/>
    <text x="10" y="24" font-family="Helvetica,Arial" font-size="21" font-weight="bold" fill="${cor}">${esc(it.n)}. ${esc(corta(it.rotulo, 30))}</text>
    <text x="10" y="44" font-family="Helvetica,Arial" font-size="14" fill="#8a8a8a">${esc(corta(it.nota, 48))}</text>
  </svg>`;
  composicao.push({ input: Buffer.from(svg), left: x, top: y + CEL_H });
}

const OUTREL = folhaVariacoes(SLUG);
await sharp({ create: { width: W, height: H, channels: 3, background: '#0d0d0d' } })
  .composite(composicao).png().toFile(path.join(CONTEUDO, OUTREL));

console.log(`\nFOLHA DE VARIAÇÕES (${candidatas.length} candidatas) -> ${OUTREL}`);
for (const it of itens.filter((x) => x.n !== '0' && x.n !== '·')) console.log(`  ${it.n}. ${it.rotulo.padEnd(24)} ${it.nota}`);
console.log(`\npromover a escolhida: node scripts/asset.mjs promover ${SLUG} <n>\n`);
