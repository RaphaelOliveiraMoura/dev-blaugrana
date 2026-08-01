// spine-kit.mjs — gera do ZERO um kit Spine decente pro personagem.
//
// Ignora o boneco antigo. Cria:
//   1) vista lateral inteira (referência de proporção)
//   2) folha de peças desenhada pra cutout limpo (junta SEM contorno, overlap generoso)
//   3) fatia, atlas, skeleton Spine 4.2, animações e preview com traço na SILHUETA
//
// Uso: node scripts/rig/spine-kit.mjs raphinha-riso
import { generateImage } from '../../server/providers/codex-image.mjs';
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH } from '../sprites/config.mjs';

const SLUG = process.argv[2] || 'raphinha-riso';
const FORCAR = process.argv.includes('--refazer');
const DIR = path.join(CONTEUDO, `personagens/${SLUG}/spine-kit`);
const BASE = path.join(CONTEUDO, `personagens/${SLUG}/base.png`);
const NAME = 'kit';

const PECAS = [
  // ordem da folha 5x2 — vista lateral, um braço visível + perna longe/perto
  'cabeca', 'tronco', 'braco-sup', 'braco-inf', 'coxa-frente',
  'canela-frente', 'pe-frente', 'coxa-atras', 'canela-atras', 'pe-atras',
];

const ESTILO = `
FLAT 2D hand-drawn cartoon, bold black outlines ONLY on the OUTER silhouette of each piece,
flat solid colors, subtle paper grain, chibi football player proportions (about 3 heads tall),
thick limbs, big expressive head. Match the reference character identity EXACTLY: same face,
same hair, same red-blue striped kit with yellow number 11 and yellow star, same boots.
NO 3D, NO gradients, NO drop shadows, NO text labels, NO arrows, NO watermarks.
`;

async function gen(outAbs, prompt, refs) {
  if (existsSync(outAbs) && !FORCAR) {
    console.log('   skip (já existe)', path.basename(outAbs));
    return;
  }
  await mkdir(path.dirname(outAbs), { recursive: true });
  console.log('→ gerando', path.basename(outAbs));
  const t0 = Date.now();
  const r = await generateImage({
    cwd: CONTEUDO,
    prompt: `${prompt}\n\nSave the final image to: ${outAbs}`,
    referencias: refs,
    outAbs,
    timeoutMs: 600000,
  });
  if (!r?.ok && r?.ok !== 'closed') throw new Error(r?.reason || 'falha na geração');
  if (!existsSync(outAbs)) throw new Error(`não gravou ${outAbs}`);
  console.log('   OK', Math.round((Date.now() - t0) / 1000) + 's');
}

// --- 1) vista lateral de referência -----------------------------------------------------------
const lateralAbs = path.join(DIR, '_lateral.png');
await mkdir(DIR, { recursive: true });
await gen(lateralAbs, `
Create ONE full-body character in STRICT SIDE VIEW (profile looking RIGHT), standing on a solid flat pure magenta (#FF00FF) background.
${ESTILO}
Pose: neutral standing, feet flat, arms hanging naturally along the body, weight centered.
The WHOLE character is a single continuous drawing with ONE outer black outline — limbs connected to the torso, no gaps, no floating parts.
Keep the cream/beige paper look of the style but the BACKGROUND must be pure magenta for chroma key.
Output a single PNG, character centered, full body visible with margin.
`, [BASE, ESTILO_PATH]);

// --- 2) folha de peças pra Spine --------------------------------------------------------------
const sheetAbs = path.join(DIR, '_sheet.png');
await gen(sheetAbs, `
Create a PAPER-DOLL / PUPPET PARTS sheet for Spine 2D. Copy the SIDE-VIEW character from the lateral reference — every piece must be STRICT PROFILE facing RIGHT (like the lateral image). Solid flat pure magenta (#FF00FF) background.

NEVER draw a front-view torso or front-view face. If you draw the chest with a readable number "11" facing the camera, that is WRONG. In profile the jersey shows the SIDE: mostly one stripe color, maybe a hint of the number on the flank.

Arrange EXACTLY 10 SEPARATE pieces in a 5-column × 2-row layout with wide magenta gaps:
ROW 1: (1) HEAD in profile + short neck stump  (2) TORSO in profile (shirt+shorts as ONE side silhouette, rounded shoulder pad and hip pad)  (3) UPPER ARM in profile with sleeve  (4) FOREARM+HAND in profile  (5) THIGH in profile (skin + top of shorts overlap pad)
ROW 2: (6) SHIN in profile with striped sock, NO foot  (7) BOOT/FOOT in profile  (8) FAR THIGH (slightly smaller/darker duplicate for the back leg)  (9) FAR SHIN with sock  (10) FAR BOOT

CLEAN CUTOUT RULES (mandatory):
- Joint ends are soft rounded flesh/fabric pads with NO black outline on the connecting edge.
- Black outline ONLY on the outer silhouette of each piece.
- Limb thickness matches the lateral reference (chunky chibi, not sticks, not giant capsules).
- Same face/hair/kit as the references. No labels, no assembled full body, no front view.

${ESTILO}
`, [lateralAbs, BASE, ESTILO_PATH]);

// --- 3) chroma + fatiar por ilhas -------------------------------------------------------------
console.log('→ fatiando peças');
const { data, info } = await sharp(sheetAbs).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
// key magenta
for (let i = 0; i < W * H; i++) {
  const o = i * 4;
  if (data[o] > 200 && data[o + 2] > 200 && data[o + 1] < 120) data[o + 3] = 0;
}
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
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (!visto[q] && OPACO(q)) { visto[q] = 1; pilha.push(q); }
    }
  }
  if (area > (W * H) / 5000) ilhas.push({ minX, minY, maxX, maxY, area });
}

// ordena em grade 4×3 por leitura
ilhas.sort((a, b) => a.minY - b.minY);
const alturaMedia = ilhas.reduce((s, i) => s + (i.maxY - i.minY), 0) / ilhas.length;
const linhas = [];
for (const i of ilhas) {
  const cy = (i.minY + i.maxY) / 2;
  const linha = linhas.find((l) => Math.abs(l.cy - cy) < alturaMedia * 0.55);
  if (linha) { linha.itens.push(i); linha.cy = (linha.cy * (linha.itens.length - 1) + cy) / linha.itens.length; }
  else linhas.push({ cy, itens: [i] });
}
linhas.forEach((l) => l.itens.sort((a, b) => a.minX - b.minX));
const ordenadas = linhas.flatMap((l) => l.itens);

if (ordenadas.length < 8) {
  console.error(`FAIL: achei ${ordenadas.length} peças, preciso de pelo menos 8. Rode com --refazer.`);
  process.exit(1);
}

const partsDir = path.join(DIR, 'parts');
await mkdir(partsDir, { recursive: true });
const meta = {};
const n = Math.min(ordenadas.length, PECAS.length);
for (let i = 0; i < n; i++) {
  const id = PECAS[i];
  const isl = ordenadas[i];
  const pad = 2;
  const left = Math.max(0, isl.minX - pad);
  const top = Math.max(0, isl.minY - pad);
  const width = Math.min(W - left, isl.maxX - isl.minX + 1 + pad * 2);
  const height = Math.min(H - top, isl.maxY - isl.minY + 1 + pad * 2);
  // recorta do raw com alpha já keyed
  const raw = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = left + x, sy = top + y;
      const si = (sy * W + sx) * 4;
      const di = (y * width + x) * 4;
      raw[di] = data[si]; raw[di + 1] = data[si + 1]; raw[di + 2] = data[si + 2]; raw[di + 3] = data[si + 3];
    }
  }
  const out = path.join(partsDir, `${id}.png`);
  await sharp(raw, { raw: { width, height, channels: 4 } }).png().toFile(out);

  // pivô: cabeça/tronco = base (pescoço/quadril); pés = tornozelo; membros = topo
  let pivo;
  if (id === 'cabeca') pivo = [width * 0.55, height * 0.9];
  else if (id === 'tronco') pivo = [width * 0.5, height * 0.78];
  else if (id.startsWith('pe-')) pivo = [width * 0.35, height * 0.28];
  else pivo = [width * 0.5, height * 0.1];
  meta[id] = {
    arquivo: `personagens/${SLUG}/spine-kit/parts/${id}.png`,
    w: width,
    h: height,
    pivo,
  };
}
await writeFile(path.join(DIR, '_meta.json'), JSON.stringify({ slug: SLUG, pecas: meta }, null, 2));
console.log(`   ${n} peças → parts/`);

// --- 4) atlas + skeleton Spine ----------------------------------------------------------------
console.log('→ montando Spine');
const ids = Object.keys(meta);
const PAD = 2;
let x = PAD, y = PAD, rowH = 0, maxW = 0;
const places = [];
const MAX_ROW = 1400;
for (const id of ids) {
  const p = meta[id];
  const buf = await sharp(path.join(CONTEUDO, p.arquivo)).ensureAlpha().png().toBuffer();
  if (x + p.w + PAD > MAX_ROW && x > PAD) { y += rowH + PAD; x = PAD; rowH = 0; }
  places.push({ id, w: p.w, h: p.h, x, y, buf, pivo: p.pivo });
  x += p.w + PAD;
  rowH = Math.max(rowH, p.h);
  maxW = Math.max(maxW, x);
}
const pageW = Math.max(64, maxW);
const pageH = Math.max(64, y + rowH + PAD);
await sharp({
  create: { width: pageW, height: pageH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
}).composite(places.map((p) => ({ input: p.buf, left: p.x, top: p.y }))).png()
  .toFile(path.join(DIR, `${NAME}.png`));

let atlas = `${NAME}.png\nsize:${pageW},${pageH}\nformat:RGBA8888\nfilter:Linear,Linear\nrepeat:none\n`;
for (const p of places) {
  atlas += `${p.id}\n  rotate: false\n  xy: ${p.x}, ${p.y}\n  size: ${p.w}, ${p.h}\n  orig: ${p.w}, ${p.h}\n  offset: 0, 0\n  index: -1\n`;
}
await writeFile(path.join(DIR, `${NAME}.atlas`), atlas);

// hierarquia em vista LATERAL (direita = frente do personagem)
// Spine: Y up. Peças desenhadas penduradas pra baixo → filho em y negativo.
const sy = (v) => -v;
const srot = (g) => -g;
const EASE = [0.25, 0, 0.75, 1];

if (!meta.tronco || !meta.cabeca) {
  console.error('FAIL: folha sem tronco/cabeça. Rode com --refazer.');
  process.exit(1);
}
const tronco = meta.tronco;
const cabeca = meta.cabeca;
const hipY = (meta['canela-frente']?.h || 80) + (meta['coxa-frente']?.h || 70) * 0.85;
const has = (id) => !!meta[id];
const childY = (id, k) => sy((meta[id]?.h || 40) * k);

const bones = [
  { name: 'root' },
  { name: 'quadril', parent: 'root', x: 0, y: +hipY.toFixed(2) },
  { name: 'tronco', parent: 'quadril', x: 0, y: 0 },
];
if (has('cabeca')) bones.push({ name: 'cabeca', parent: 'tronco', x: 0, y: +(tronco.h * 0.52).toFixed(2) });
if (has('coxa-atras')) {
  bones.push({ name: 'coxa-atras', parent: 'quadril', x: -6, y: 0 });
  if (has('canela-atras')) {
    bones.push({ name: 'canela-atras', parent: 'coxa-atras', x: 0, y: childY('coxa-atras', 0.8) });
    if (has('pe-atras')) bones.push({ name: 'pe-atras', parent: 'canela-atras', x: meta['canela-atras'].w * 0.08, y: childY('canela-atras', 0.86) });
  }
}
if (has('coxa-frente')) {
  bones.push({ name: 'coxa-frente', parent: 'quadril', x: 6, y: 0 });
  if (has('canela-frente')) {
    bones.push({ name: 'canela-frente', parent: 'coxa-frente', x: 0, y: childY('coxa-frente', 0.8) });
    if (has('pe-frente')) bones.push({ name: 'pe-frente', parent: 'canela-frente', x: meta['canela-frente'].w * 0.08, y: childY('canela-frente', 0.86) });
  }
}
if (has('braco-sup')) {
  bones.push({ name: 'braco-sup', parent: 'tronco', x: tronco.w * 0.12, y: +(tronco.h * 0.32).toFixed(2) });
  if (has('braco-inf')) bones.push({ name: 'braco-inf', parent: 'braco-sup', x: 0, y: childY('braco-sup', 0.78) });
}

const drawOrder = [
  'coxa-atras', 'canela-atras', 'pe-atras',
  'tronco',
  'coxa-frente', 'canela-frente', 'pe-frente',
  'braco-sup', 'braco-inf',
  'cabeca',
].filter(has);

const slots = drawOrder.map((id) => ({ name: id, bone: id, attachment: id }));

const attachments = {};
for (const id of ids) {
  const p = meta[id];
  const ax = p.w / 2 - p.pivo[0];
  const ay = sy(p.h / 2 - p.pivo[1]);
  attachments[id] = {
    [id]: { x: +ax.toFixed(2), y: +ay.toFixed(2), width: p.w, height: p.h },
  };
}

function rotKeys(dur, keyframes /* [{t, ...angs}] */) {
  const ossos = new Set();
  for (const k of keyframes) for (const n of Object.keys(k)) if (n !== 't') ossos.add(n);
  const out = {};
  for (const osso of ossos) {
    out[osso] = {
      rotate: keyframes.map((k, i) => {
        const frame = { time: +(k.t * dur).toFixed(4), value: +srot(k[osso] ?? 0).toFixed(2) };
        if (i < keyframes.length - 1) frame.curve = EASE;
        return frame;
      }),
    };
  }
  return out;
}

const animations = {
  parado: {
    bones: rotKeys(2.0, [
      { t: 0, tronco: 0, cabeca: 0, 'braco-sup': 5, 'braco-inf': -6 },
      { t: 0.5, tronco: -2, cabeca: 2, 'braco-sup': 9, 'braco-inf': -8 },
      { t: 1, tronco: 0, cabeca: 0, 'braco-sup': 5, 'braco-inf': -6 },
    ]),
  },
  andar: {
    bones: rotKeys(0.85, [
      { t: 0, 'coxa-frente': 26, 'canela-frente': -12, 'pe-frente': 8, 'coxa-atras': -22, 'canela-atras': 18, 'pe-atras': -5, 'braco-sup': -20, 'braco-inf': -14, tronco: 2, cabeca: -1 },
      { t: 0.25, 'coxa-frente': 5, 'canela-frente': -3, 'pe-frente': 2, 'coxa-atras': 3, 'canela-atras': 36, 'pe-atras': 9, 'braco-sup': 0, 'braco-inf': -9, tronco: 0, cabeca: 0 },
      { t: 0.5, 'coxa-frente': -22, 'canela-frente': 18, 'pe-frente': -5, 'coxa-atras': 26, 'canela-atras': -12, 'pe-atras': 8, 'braco-sup': 20, 'braco-inf': -12, tronco: 2, cabeca: -1 },
      { t: 0.75, 'coxa-frente': 3, 'canela-frente': 36, 'pe-frente': 9, 'coxa-atras': 5, 'canela-atras': -3, 'pe-atras': 2, 'braco-sup': 0, 'braco-inf': -9, tronco: 0, cabeca: 0 },
      { t: 1, 'coxa-frente': 26, 'canela-frente': -12, 'pe-frente': 8, 'coxa-atras': -22, 'canela-atras': 18, 'pe-atras': -5, 'braco-sup': -20, 'braco-inf': -14, tronco: 2, cabeca: -1 },
    ]),
  },
  correr: {
    bones: rotKeys(0.5, [
      { t: 0, tronco: -10, cabeca: 6, 'coxa-frente': 48, 'canela-frente': -36, 'pe-frente': 10, 'coxa-atras': -38, 'canela-atras': 64, 'pe-atras': -6, 'braco-sup': -50, 'braco-inf': -65 },
      { t: 0.25, tronco: -12, cabeca: 6, 'coxa-frente': 9, 'canela-frente': -6, 'pe-frente': 3, 'coxa-atras': 7, 'canela-atras': 78, 'pe-atras': 12, 'braco-sup': -10, 'braco-inf': -50 },
      { t: 0.5, tronco: -10, cabeca: 6, 'coxa-frente': -38, 'canela-frente': 64, 'pe-frente': -6, 'coxa-atras': 48, 'canela-atras': -36, 'pe-atras': 10, 'braco-sup': 44, 'braco-inf': -38 },
      { t: 0.75, tronco: -12, cabeca: 6, 'coxa-frente': 7, 'canela-frente': 78, 'pe-frente': 12, 'coxa-atras': 9, 'canela-atras': -6, 'pe-atras': 3, 'braco-sup': 10, 'braco-inf': -50 },
      { t: 1, tronco: -10, cabeca: 6, 'coxa-frente': 48, 'canela-frente': -36, 'pe-frente': 10, 'coxa-atras': -38, 'canela-atras': 64, 'pe-atras': -6, 'braco-sup': -50, 'braco-inf': -65 },
    ]),
  },
  comemorar: {
    bones: rotKeys(0.9, [
      { t: 0, tronco: 0, cabeca: 0, 'braco-sup': 5, 'braco-inf': -6 },
      { t: 0.2, tronco: 7, cabeca: 3, 'braco-sup': 28, 'braco-inf': -22, 'coxa-frente': -8, 'canela-frente': 14 },
      { t: 0.45, tronco: -7, cabeca: -12, 'braco-sup': -160, 'braco-inf': -8, 'coxa-frente': 6 },
      { t: 1, tronco: -4, cabeca: -9, 'braco-sup': -152, 'braco-inf': -6 },
    ]),
  },
  apontar: {
    bones: rotKeys(0.8, [
      { t: 0, 'braco-sup': 5, 'braco-inf': -6, tronco: 0, cabeca: 0 },
      { t: 0.28, 'braco-sup': 38, 'braco-inf': -32, tronco: 4, cabeca: -3 },
      { t: 0.55, 'braco-sup': -98, 'braco-inf': 4, tronco: -5, cabeca: 4 },
      { t: 1, 'braco-sup': -88, 'braco-inf': -2, tronco: -3, cabeca: 2 },
    ]),
  },
};

const skel = {
  skeleton: {
    hash: `sagafut-kit-${SLUG}`,
    spine: '4.2.33',
    x: -260,
    y: 0,
    width: 520,
    height: Math.round(hipY + tronco.h + cabeca.h * 0.5),
    images: './',
  },
  bones,
  slots,
  skins: [{ name: 'default', attachments }],
  animations,
};
await writeFile(path.join(DIR, `${NAME}.json`), JSON.stringify(skel, null, 2));

// --- 5) preview com silhueta ------------------------------------------------------------------
const anims = Object.keys(animations);
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Spine kit — ${SLUG}</title>
<link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.2.82/dist/spine-player.css">
<style>
  :root { color-scheme: dark; }
  body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; background:#12161a; color:#e8eef2; }
  header { padding:16px 20px 6px; }
  h1 { margin:0 0 4px; font-size:18px; }
  p { margin:0; opacity:.7; font-size:13px; }
  #controles { display:flex; flex-wrap:wrap; gap:8px; padding:8px 20px 12px; }
  button { appearance:none; border:1px solid #3a4550; background:#243039; color:#e8eef2; border-radius:8px; padding:8px 12px; cursor:pointer; font:inherit; }
  button.ativo { background:#3d6df0; border-color:#3d6df0; }
  #player { width:min(560px,100vw); height:min(760px,86vh); margin:0 auto; }
</style>
</head>
<body>
<header>
  <h1>Spine kit novo — ${SLUG}</h1>
  <p>Peças geradas do zero (vista lateral, juntas sem contorno). Compare com o cutout antigo.</p>
</header>
<div id="controles">
  ${anims.map((a) => `<button type="button" data-anim="${a}" data-loop="${a === 'apontar' || a === 'comemorar' ? '0' : '1'}">${a}</button>`).join('\n  ')}
</div>
<div id="player"></div>
<script src="https://unpkg.com/@esotericsoftware/spine-player@4.2.82/dist/iife/spine-player.js"></script>
<script>
  let player=null, pronto=false;
  function play(anim, loop){
    document.querySelectorAll('#controles button').forEach(b=>b.classList.toggle('ativo', b.dataset.anim===anim));
    if(!pronto) return;
    try{ player.setAnimation(anim, loop); }catch(e){ console.error(e); }
  }
  player = new spine.SpinePlayer('player', {
    skeleton:'${NAME}.json', atlas:'${NAME}.atlas', animation:'andar',
    premultipliedAlpha:false, backgroundColor:'#1c2228', showControls:true, alpha:true,
    success:(p)=>{ player=p; pronto=true; document.querySelector('[data-anim=andar]')?.classList.add('ativo'); },
    error:(_p,r)=>{ document.body.insertAdjacentHTML('beforeend','<pre style="color:#f66;padding:20px">'+r+'</pre>'); }
  });
  document.querySelectorAll('#controles button').forEach(b=>{
    b.addEventListener('click',()=>play(b.dataset.anim, b.dataset.loop==='1'));
  });
</script>
</body>
</html>`;
await writeFile(path.join(DIR, 'preview.html'), html);

console.log('OK');
console.log(`   ${path.relative(CONTEUDO, DIR)}/`);
console.log(`   abra: ${path.join(DIR, 'preview.html')}`);
console.log(`   sirva: python3 -m http.server 8766 --directory ${DIR}`);
