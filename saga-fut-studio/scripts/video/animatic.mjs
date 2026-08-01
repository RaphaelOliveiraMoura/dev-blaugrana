// animatic.mjs <id> [--n=12] [--cena=N] [--tudo] — O STORYBOARD ANIMADO, ANTES DE GERAR ASSET.
//
// POR QUE EXISTE: o primeiro momento em que dava pra VER um vídeo era depois do build de assets.
// Enquadramento pequeno demais, todo mundo na mesma linha, três cenas no mesmo pedaço do cenário,
// câmera parada o vídeo inteiro: tudo isso só aparecia quando já tinha custado geração, e o
// conserto virava refino detalhe a detalhe. A decupagem existe pra decidir isso antes, mas é
// tabela em texto, e ninguém julga composição lendo texto.
//
// Aqui o vídeo roda no MOTOR DE VERDADE com BONECOS no lugar do que ainda não existe: sprite
// faltando vira silhueta no canvas normalizado (480x620, pé em 610), cenário faltando vira grade
// com a régua de x do mundo. Escala, posição, orientação, ritmo e movimento de câmera são os
// definitivos; só a arte é provisória. Reprovar aqui custa zero.
//
// O boneco é ASSIMÉTRICO de propósito (nariz e seta apontando pra direita): o motor orienta por
// flip, então quem estiver andando de costas aparece de cara na folha, antes do INV-4.
//
// Saída: videos/<id>/_animatic.png + a lista de compras no console.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { CONTEUDO_DIR, VIDEO_DIR, videoDir } from '../../server/config.mjs';
import { montarCena } from '../../server/video/montar-cena.mjs';
import { stage } from '../../server/video/render-video.mjs';
import { spritesDoRoteiro } from '../../server/video/sprites-do-roteiro.mjs';
import { comVaga } from '../../server/lib/lock.mjs';
import { statusPersonagem } from '../sprites/contratos.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = path.resolve(__dirname, '../../remotion');
const PUB = path.join(REMOTION_DIR, 'public');
const reqR = createRequire(path.join(REMOTION_DIR, 'package.json'));
const { bundle } = await import(reqR.resolve('@remotion/bundler'));
const { selectComposition, renderStill } = await import(reqR.resolve('@remotion/renderer'));

const args = process.argv.slice(2);
const ID = args[0];
const flag = (n, d = null) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };
const N = Math.max(2, Math.min(24, Number(flag('n', 12))));
const CENA = flag('cena') != null ? Number(flag('cena')) : null;   // 1-based, como no rótulo da folha
const TUDO = args.includes('--tudo');                              // ignora o acervo: TODO mundo vira boneco
if (!ID) {
  console.error('uso: node scripts/video/animatic.mjs <id> [--n=12] [--cena=N] [--tudo]');
  console.error('  --tudo  desenha TODOS os personagens como boneco, mesmo os que já têm arte');
  console.error('          (serve pra julgar só a encenação, sem a arte distrair)');
  process.exit(2);
}

// ---------------------------------------------------------------- canvas normalizado do sprite
// Estes números são os mesmos do slicer (scripts/sprites/config.mjs). Se o boneco sair em outro
// canvas, a ALTURA na tela mente: o composer desenha com `width: w` e deixa a altura sair da
// proporção do arquivo, e ancora o pé em `floorY - 0.625*w`.
const CW = 480, CH = 620, PE = 610;
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// cor estável por personagem: o mesmo slug sai sempre da mesma cor, em vídeos diferentes também
function corDoSlug(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return { corpo: `hsl(${h} 62% 58%)`, cabeca: `hsl(${h} 55% 74%)` };
}

// nome do arquivo no acervo -> o que esse sprite É (rótulo curto + fase do ciclo)
function leituraDaOrigem(origem) {
  let m = /rigs\/([^/]+)\/[a-zA-Z]+(\d+)\.png$/.exec(origem);
  if (m) return { rotulo: m[1], fase: Number(m[2]), compra: ['rig', m[1].replace(/-esq$/, '')] };
  m = /acoes\/([^/]+)\/[^/]*?(\d+)\.png$/.exec(origem);
  if (m) return { rotulo: m[1], fase: Number(m[2]), compra: ['folha', m[1]] };
  m = /poses\/([^/]+)\.png$/.exec(origem);
  if (m) return { rotulo: `pose ${m[1]}`, fase: 1, compra: ['pose', m[1]] };
  return { rotulo: path.basename(origem, '.png'), fase: 1, compra: null };
}

// BONECO: silhueta no canvas normalizado. Cabeça grande (a proporção chibi do acervo), contorno
// grosso pra sobreviver ao thumb, e a passada abrindo conforme a fase do ciclo — o que faz um
// ciclo de caminhada LER como caminhada mesmo sem arte nenhuma.
function bonecoSVG({ slug, rotulo, fase, cor }) {
  const par = fase % 2 === 0;
  const aA = par ? 62 : 14, aB = par ? 14 : 62;      // abertura de cada perna
  const braco = par ? 18 : -18;
  const nome = slug.split('-')[0].slice(0, 11).toUpperCase();
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}">
  <ellipse cx="240" cy="${PE - 4}" rx="132" ry="15" fill="#000" opacity="0.22"/>
  <g stroke="#1c1c1c" stroke-width="26" stroke-linecap="round">
    <line x1="238" y1="418" x2="${238 - aA}" y2="${PE - 8}"/>
    <line x1="242" y1="418" x2="${242 + aB}" y2="${PE - 8}"/>
  </g>
  <g stroke="#1c1c1c" stroke-width="22" stroke-linecap="round">
    <line x1="168" y1="280" x2="${132 - braco}" y2="${392 + braco}"/>
    <line x1="312" y1="280" x2="${348 + braco}" y2="${392 - braco}"/>
  </g>
  <rect x="152" y="248" width="176" height="186" rx="30" fill="${cor.corpo}" stroke="#1c1c1c" stroke-width="9"/>
  <circle cx="240" cy="152" r="112" fill="${cor.cabeca}" stroke="#1c1c1c" stroke-width="9"/>
  <circle cx="298" cy="132" r="14" fill="#1c1c1c"/>
  <path d="M348,156 l42,15 l-42,17 z" fill="#1c1c1c"/>
  <path d="M300,${PE - 26} l46,0 l0,-13 l30,20 l-30,20 l0,-13 l-46,0 z" fill="#1c1c1c" opacity="0.5"/>
  <text x="240" y="330" font-family="monospace" font-size="34" font-weight="bold" fill="#12121a" text-anchor="middle">${esc(nome)}</text>
  <text x="240" y="382" font-family="monospace" font-size="27" fill="#12121a" text-anchor="middle">${esc(rotulo)} ${fase}</text>
</svg>`);
}

// CENÁRIO PROVISÓRIO: grade + RÉGUA DE X DO MUNDO. A régua é o ponto: `spot` e o `cam.x` são
// coordenadas de mundo em px, e sem ver a régua a escolha do "onde" da decupagem é chute. As
// faixas de tela mostram quanto do panorama a câmera está deixando de usar.
function cenarioSVG({ w, h, nome, tela, z }) {
  const frente = z > 1;
  const piso = Math.round(h * 0.9);
  // A régua tem que sobreviver a DOIS cortes: o plano fechado (que enquadra um pedaço pequeno do
  // mundo) e o thumb da folha de contato (que reduz tudo umas 7 vezes). Por isso o número de x se
  // repete em várias alturas e a fonte é grande: uma régua só no topo do panorama é uma régua que
  // só existe no plano geral, justamente o plano em que ela é menos necessária.
  const linhas = [];
  for (let x = 0; x <= w; x += 100) {
    const forte = x % 500 === 0;
    linhas.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="#8ea4c6" stroke-width="${forte ? 6 : 2}" opacity="${forte ? 0.75 : 0.32}"/>`);
    if (!forte) continue;
    for (let y = 190; y < piso; y += 430) {
      linhas.push(`<text x="${x + 14}" y="${y}" font-family="monospace" font-size="76" font-weight="bold" fill="#cfe0fb" opacity="0.9">${x}</text>`);
    }
  }
  for (let y = 0; y <= h; y += 100) linhas.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#8ea4c6" stroke-width="2" opacity="0.2"/>`);
  const telas = [];
  for (let i = 0, x = 0; x < w; i++, x += tela) {
    telas.push(`<rect x="${x + 4}" y="4" width="${Math.min(tela, w - x) - 8}" height="${h - 8}" fill="none" stroke="#e0b341" stroke-width="10" opacity="0.75"/>`);
    telas.push(`<text x="${x + 28}" y="${h - 34}" font-family="monospace" font-size="66" fill="#e0b341" opacity="0.9">tela ${i + 1} de ${Math.ceil(w / tela)}</text>`);
    telas.push(`<text x="${x + 28}" y="${piso - 34}" font-family="monospace" font-size="60" font-weight="bold" fill="#c9d7ee" opacity="0.85">CENÁRIO PROVISÓRIO: ${esc(nome)}</text>`);
  }
  // camada de frente cobre TUDO que está atrás dela, inclusive a sombra: aqui ela é só a faixa
  // abaixo da linha do chão, que é como ela deve ser pedida de verdade.
  if (frente) {
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect x="0" y="${piso + 40}" width="${w}" height="${h - piso - 40}" fill="#2b3a2f" opacity="0.85"/>
      <text x="40" y="${piso + 110}" font-family="monospace" font-size="44" fill="#b9d6b0">FRENTE z=${z}  ${esc(nome)}</text>
    </svg>`);
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="#38445c"/>
    <rect x="0" y="${piso}" width="${w}" height="${h - piso}" fill="#2f4a38"/>
    ${linhas.join('')}
    <line x1="0" y1="${piso}" x2="${w}" y2="${piso}" stroke="#8fe0a8" stroke-width="6"/>
    <text x="24" y="${piso - 24}" font-family="monospace" font-size="40" fill="#8fe0a8">chão y=${piso}</text>
    ${telas.join('')}
    <text x="24" y="110" font-family="monospace" font-size="64" font-weight="bold" fill="#c9d7ee">CENÁRIO PROVISÓRIO: ${esc(nome)}</text>
  </svg>`);
}

// ---------------------------------------------------------------- monta a cena e o que falta
const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, ID + '.json'), 'utf-8'));
const { scene, totalFrames } = montarCena(video);
const fps = scene.fps || 30;

// TRAVA: o animatic monta o `remotion/public` e o `src/scene.json`, que são caminhos FIXOS. Dois
// animatics ao mesmo tempo (o botão do studio e alguém no terminal) se sobrescreviam no meio e a
// folha saía com sprite do outro vídeo, sem erro nenhum — a mesma classe de defeito que fez o
// render ganhar pasta por execução. Aqui a fila resolve, porque o animatic dura ~10s.
await comVaga('animatic', 1, gerar, { aviso: 'outro animatic em andamento, esperando a vez...' });

async function gerar() {
// stage() lê videos/<id>/cenario/ direto; num vídeo que ainda não gerou nada ela não existe
await fs.mkdir(path.join(videoDir(ID), 'cenario'), { recursive: true });
await stage(video);

const existe = (p) => fs.access(p).then(() => true).catch(() => false);
const compras = [];                                         // [{ slug, tipo, nome, comando }]
const vistas = new Set();
const bonecos = [];
for (const s of spritesDoRoteiro(video)) {
  if (!TUDO && await existe(path.join(PUB, s.nome))) continue;
  const { rotulo, fase, compra } = leituraDaOrigem(s.origem);
  await sharp(bonecoSVG({ slug: s.slug, rotulo, fase, cor: corDoSlug(s.slug) })).png().toFile(path.join(PUB, s.nome));
  bonecos.push(s.nome);
  // a compra é do que falta NO ACERVO, não do que faltou no staging: com --tudo o boneco entra
  // por cima de sprite que existe, e cobrar geração do que já está pronto seria orçamento falso
  if (!compra || vistas.has(s.slug + compra.join(':'))) continue;
  if (await existe(path.join(CONTEUDO_DIR, s.origem))) continue;
  vistas.add(s.slug + compra.join(':'));
  const [tipo, nome] = compra;
  compras.push({ slug: s.slug, tipo, nome, comando:
    tipo === 'rig' ? `node scripts/asset.mjs ${nome} ${s.slug}`
    : tipo === 'pose' ? `node scripts/asset.mjs pose ${s.slug} ${nome}`
    : `node scripts/asset.mjs folha ${s.slug} ${nome} --classe=primaria --muda="..."` });
}

// PRÉ-REQUISITOS DA FICHA vêm ANTES na lista. A lista cobrava só o que o ROTEIRO referencia (a
// folha de correr, a pose), e o gate cobra outra coisa depois: personagem sem model sheet e sem
// idle não renderiza. No primeiro vídeo real a lista disse 6 itens e o custo era 14 — orçamento que
// mente por omissão é pior que orçamento nenhum, porque a decisão de cortar elenco é tomada em cima
// dele. Model sheet primeiro porque é o que trava a proporção de tudo que vem depois.
const fichas = [];
for (const slug of [...new Set(spritesDoRoteiro(video).map((s) => s.slug))]) {
  const st = await statusPersonagem(slug);
  for (const f of st.faltando.filter((x) => x.essencial)) {
    fichas.push({ slug, tipo: 'ficha', nome: f.rotulo, comando: `node scripts/asset.mjs ${f.comoFazer.replace(/^asset /, '')}` });
  }
}
// dedupe pelo COMANDO: o idle aparece nos dois lados (é pré-requisito da ficha e é o sprite de
// repouso que o roteiro referencia), e cobrar a mesma geração duas vezes infla o orçamento
{
  const vistos = new Set();
  const juntas = [...fichas, ...compras].filter((c) => !vistos.has(c.comando) && vistos.add(c.comando));
  compras.length = 0;
  compras.push(...juntas);
}

// cenários referenciados pela cena montada (o composer nomeia tudo como cenario-<nome>.png)
const camadas = new Map();
const mundo = (scene.shots || []).map((sh) => sh.mundo).find(Boolean) || null;
for (const sh of scene.shots || []) {
  if (sh.bg?.src) camadas.set(sh.bg.src, 1);
  for (const c of sh.bg?.camadas || []) camadas.set(c.src, c.z ?? 1);
}
const cenariosFalsos = [];
for (const [src, z] of camadas) {
  if (!src.endsWith('.png')) continue;
  if (await existe(path.join(PUB, src))) continue;
  const w = mundo ? mundo.w : scene.width, h = mundo ? mundo.h : scene.height;
  const nome = src.replace(/^cenario-/, '').replace(/\.png$/, '');
  await sharp(cenarioSVG({ w, h, nome, tela: scene.width, z })).png().toFile(path.join(PUB, src));
  cenariosFalsos.push(nome);
}

// ---------------------------------------------------------------- render dos stills
const bounds = []; let cursor = 0;
(scene.shots || []).forEach((s, i) => {
  const ov = (i > 0 && s.transition && s.transition !== 'none') ? (s.tdur || 0) : 0;
  const start = Math.max(0, cursor - ov); const end = start + s.dur; bounds.push([start, end]); cursor = end;
});
const cenaDe = (f) => { for (let i = 0; i < bounds.length; i++) if (f >= bounds[i][0] && f < bounds[i][1]) return i + 1; return bounds.length; };

let lo = 0, hi = totalFrames - 1, tag = `vídeo inteiro (${bounds.length} cenas)`;
if (CENA != null && bounds[CENA - 1]) { lo = bounds[CENA - 1][0]; hi = Math.min(totalFrames - 1, bounds[CENA - 1][1] - 1); tag = `cena ${CENA}`; }

console.log(`\nanimatic ${ID}: ${tag}, ${N} stills`);
console.log(`  ${bonecos.length} sprite(s) como boneco${TUDO ? ' (--tudo: o acervo foi ignorado)' : ''} · ${cenariosFalsos.length} cenário(s) como grade`);

await fs.writeFile(path.join(REMOTION_DIR, 'src', 'scene.json'), JSON.stringify(scene, null, 2));
const serveUrl = await bundle({ entryPoint: path.join(REMOTION_DIR, 'src', 'index.jsx') });
const composition = await selectComposition({ serveUrl, id: 'Cena' });

// TODA CENA APARECE. Amostragem uniforme pura pula cena curta: a cena da virada (42 frames) sumiu
// de uma folha de 12 stills sobre 550 frames, e cena que não aparece é cena que ninguém aprovou.
// Agora o meio de cada cena é reservado primeiro, e os stills que sobram preenchem o resto.
let frames;
if (CENA != null) {
  frames = Array.from({ length: N }, (_, i) => Math.round(lo + (i * (hi - lo)) / (N - 1)));
} else {
  const meios = bounds.map(([a, b]) => Math.min(hi, Math.round((a + b) / 2)));
  const alvo = meios.slice(0, N);
  // o preenchimento guarda distância dos já escolhidos: sem isso saíam stills a 1 frame um do outro
  // (o uniforme caindo em cima do meio de uma cena) e uma cena longa ficava com um quadro só
  const gap = Math.max(4, Math.round((hi - lo) / (N * 2)));
  for (let i = 0; alvo.length < N && i < N * 4; i++) {
    const f = Math.round(lo + (i * (hi - lo)) / Math.max(1, N * 2 - 1));
    if (f <= hi && alvo.every((x) => Math.abs(x - f) >= gap)) alvo.push(f);
  }
  frames = alvo.sort((a, b) => a - b).slice(0, N);
  if (meios.length > N) console.log(`  aviso: ${meios.length} cenas e só ${N} stills — as cenas ${meios.length - N} últimas ficaram de fora. Use --n=${meios.length}.`);
}
const tmp = path.join(REMOTION_DIR, '_animatic_tmp');
await fs.rm(tmp, { recursive: true, force: true }); await fs.mkdir(tmp, { recursive: true });
const stills = [];
for (const f of frames) {
  const out = path.join(tmp, `f${f}.png`);
  await renderStill({ composition, serveUrl, output: out, frame: f, imageFormat: 'png', scale: 0.5, chromiumOptions: { gl: 'swiftshader' } });
  stills.push({ f, out });
  process.stdout.write(`  frame ${f} (${(f / fps).toFixed(1)}s, cena ${cenaDe(f)})\n`);
}

// ---------------------------------------------------------------- folha de contato
const cols = N <= 6 ? 3 : (N <= 12 ? 4 : 5);
const rows = Math.ceil(N / cols);
const m0 = await sharp(stills[0].out).metadata();
const tw = m0.width, th = m0.height, pad = 8, lab = 34, topo = 52;
const cw = tw + pad * 2, ch = th + pad * 2 + lab;
const comps = [];
for (let i = 0; i < stills.length; i++) {
  const { f, out } = stills[i];
  const r = Math.floor(i / cols), c = i % cols;
  const x = c * cw + pad, y = topo + r * ch + pad;
  comps.push({ input: out, left: x, top: y });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${lab}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="8" y="24" font-family="monospace" font-size="21" fill="#fff">#${i + 1}  f${f}  ${(f / fps).toFixed(1)}s  CENA ${cenaDe(f)}</text></svg>`);
  comps.push({ input: svg, left: x, top: y + th + pad });
}
const cab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cw}" height="${topo}"><rect width="100%" height="100%" fill="#101014"/><text x="12" y="34" font-family="monospace" font-size="24" fill="#ffd24a">ANIMATIC ${esc(ID)} — bonecos: ${bonecos.length} sprite(s), ${cenariosFalsos.length} cenário(s). Escala, posição, orientação e ritmo são os DEFINITIVOS.</text></svg>`);
comps.unshift({ input: cab, left: 0, top: 0 });

const outFile = path.join(videoDir(ID), '_animatic.png');
await sharp({ create: { width: cols * cw, height: topo + rows * ch, channels: 4, background: { r: 24, g: 24, b: 24, alpha: 1 } } })
  .composite(comps).png().toFile(outFile);
await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});

// ---------------------------------------------------------------- resumo em JSON (o studio lê ESTE)
// A rota do studio precisa do mesmo resultado que sai no terminal. Ler stdout pra descobrir o que
// aconteceu é contrato por texto, que quebra na primeira vez que alguém mexe numa mensagem; o JSON
// ao lado da folha é o contrato de verdade, e serve os dois consumidores.
await fs.writeFile(path.join(videoDir(ID), '_animatic.json'), JSON.stringify({
  id: ID, arquivo: `videos/${ID}/_animatic.png`, geradoEm: new Date().toISOString(),
  cenas: bounds.length, stills: frames, cena: CENA, tudo: TUDO,
  bonecos, cenariosFalsos, compras,
}, null, 2) + '\n');

// ---------------------------------------------------------------- lista de compras
// O animatic também é o ORÇAMENTO: sai daqui a conta do que ainda precisa ser gerado de verdade,
// já com o comando ao lado. Aprovar a encenação antes de pagar essa conta é o ponto do comando.
// o cenário também é geração, e ficava de fora do orçamento por não ser sprite de personagem
for (const nome of cenariosFalsos) {
  compras.push({ slug: '(cenário)', tipo: 'cenario', nome,
    comando: `declare "${nome}" em videos/${ID}/sprites.json (cenarios[]) e rode: node scripts/asset.mjs video ${ID}` });
}
if (compras.length) {
  console.log(`\nLISTA DE COMPRAS (o que ainda não existe no acervo):`);
  for (const c of compras) {
    const rotulo = c.tipo === 'rig' ? c.nome : `${c.tipo} ${c.nome}`;
    console.log(`  ${c.slug.padEnd(22)} ${rotulo.padEnd(16)} -> ${c.comando}`);
  }
} else if (!TUDO) {
  console.log(`\nnada a comprar: todo sprite do roteiro já existe no acervo.`);
}
console.log(`\nOK folha de contato: videos/${ID}/_animatic.png  (${cols}x${rows})`);
console.log(`   aprove a ENCENAÇÃO aqui (quem está onde, de que tamanho, olhando pra onde, em que ritmo)`);
console.log(`   antes de rodar: node scripts/asset.mjs video ${ID}\n`);
}
