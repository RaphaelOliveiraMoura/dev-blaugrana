// spine-kit-lateral.mjs — fatia a VISTA LATERAL inteira em peças com overlap.
//
// Por quê: a folha gerada misturou frente/lado e ficou colagem. Cortar UM desenho só
// garante que, na pose de repouso, o boneco remonta o personagem original pixel a pixel.
//
// Uso: node scripts/rig/spine-kit-lateral.mjs raphinha-riso
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO } from '../sprites/config.mjs';

const SLUG = process.argv[2] || 'raphinha-riso';
const DIR = path.join(CONTEUDO, `personagens/${SLUG}/spine-kit`);
const LATERAL = path.join(DIR, '_lateral.png');
const NAME = 'kit';
const EASE = [0.25, 0, 0.75, 1];
const sy = (v) => -v;
const srot = (g) => -g;

const { data, info } = await sharp(LATERAL).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

// chroma magenta
for (let i = 0; i < W * H; i++) {
  const o = i * 4;
  if (data[o] > 180 && data[o + 2] > 180 && data[o + 1] < 140) data[o + 3] = 0;
}

// bbox do personagem
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (data[(y * W + x) * 4 + 3] > 128) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const cw = maxX - minX + 1, ch = maxY - minY + 1;
console.log(`personagem ${cw}x${ch} em (${minX},${minY})`);

// Cortes em fração da altura do personagem (vista lateral chibi).
// Cada peça sobe/desce um pouco na junta (= overlap) pra esconder a emenda.
const OVER = 0.04; // 4% da altura em cada junta
const cuts = {
  // [y0, y1] em fração 0..1 do topo→base + [x0,x1] opcional da largura
  cabeca: { y0: 0, y1: 0.40 + OVER, x0: 0.05, x1: 1 },
  tronco: { y0: 0.34 - OVER, y1: 0.70 + OVER, x0: 0.12, x1: 0.88 },
  // braço visível: faixa da direita do torso (personagem olha pra direita)
  'braco-frente-sup': { y0: 0.38 - OVER, y1: 0.58 + OVER, x0: 0.55, x1: 1 },
  'braco-frente-inf': { y0: 0.54 - OVER, y1: 0.78 + OVER, x0: 0.58, x1: 1 },
  // pernas: metade traseira / dianteira da largura na região das pernas
  'coxa-atras': { y0: 0.62 - OVER, y1: 0.78 + OVER, x0: 0.15, x1: 0.58 },
  'coxa-frente': { y0: 0.62 - OVER, y1: 0.78 + OVER, x0: 0.42, x1: 0.85 },
  'canela-atras': { y0: 0.74 - OVER, y1: 0.90 + OVER, x0: 0.12, x1: 0.58 },
  'canela-frente': { y0: 0.74 - OVER, y1: 0.90 + OVER, x0: 0.40, x1: 0.88 },
  'pe-atras': { y0: 0.86 - OVER, y1: 1, x0: 0.05, x1: 0.55 },
  'pe-frente': { y0: 0.86 - OVER, y1: 1, x0: 0.35, x1: 0.98 },
};

const partsDir = path.join(DIR, 'parts');
await mkdir(partsDir, { recursive: true });
const meta = {};

async function extrair(id, c) {
  const x0 = Math.max(0, Math.floor(minX + c.x0 * cw));
  const x1 = Math.min(W, Math.ceil(minX + c.x1 * cw));
  const y0 = Math.max(0, Math.floor(minY + c.y0 * ch));
  const y1 = Math.min(H, Math.ceil(minY + c.y1 * ch));
  const w = x1 - x0, h = y1 - y0;
  const raw = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * W + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      raw[di] = data[si]; raw[di + 1] = data[si + 1]; raw[di + 2] = data[si + 2]; raw[di + 3] = data[si + 3];
    }
  }
  // suaviza a borda do recorte: pixels muito na beira do retângulo com alpha baixo
  // (não cria traço novo — só evita o "quadrado cortado")
  const feather = 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (edge < feather) {
      const di = (y * w + x) * 4 + 3;
      raw[di] = Math.round(raw[di] * (edge / feather));
    }
  }
  const out = path.join(partsDir, `${id}.png`);
  await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toFile(out);

  // pivô: posição do osso no recorte, em coords de imagem
  // cabeça gira na base do pescoço; tronco no quadril; membros no topo
  let pivo;
  if (id === 'cabeca') pivo = [w * 0.55, h * 0.88];
  else if (id === 'tronco') pivo = [w * 0.5, h * 0.82];
  else if (id.startsWith('pe-')) pivo = [w * 0.35, h * 0.25];
  else pivo = [w * 0.5, h * 0.12];

  meta[id] = {
    arquivo: `personagens/${SLUG}/spine-kit/parts/${id}.png`,
    w, h, pivo,
    // posição do pivô no espaço do personagem (origem = canto topo-esq do bbox), Y pra baixo
    world: {
      x: (x0 - minX) + pivo[0],
      y: (y0 - minY) + pivo[1],
    },
  };
  return meta[id];
}

for (const [id, c] of Object.entries(cuts)) await extrair(id, c);
await writeFile(path.join(DIR, '_meta.json'), JSON.stringify({ slug: SLUG, fonte: 'lateral', pecas: meta }, null, 2));
console.log(`→ ${Object.keys(meta).length} peças cortadas da lateral`);

// --- atlas ------------------------------------------------------------------------------------
const ids = Object.keys(meta);
const PAD = 2;
let ax = PAD, ay = PAD, rowH = 0, maxW = 0;
const places = [];
const MAX_ROW = 1600;
for (const id of ids) {
  const p = meta[id];
  const buf = await sharp(path.join(CONTEUDO, p.arquivo)).png().toBuffer();
  if (ax + p.w + PAD > MAX_ROW && ax > PAD) { ay += rowH + PAD; ax = PAD; rowH = 0; }
  places.push({ id, ...p, x: ax, y: ay, buf });
  ax += p.w + PAD; rowH = Math.max(rowH, p.h); maxW = Math.max(maxW, ax);
}
const pageW = Math.max(64, maxW), pageH = Math.max(64, ay + rowH + PAD);
await sharp({
  create: { width: pageW, height: pageH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
}).composite(places.map((p) => ({ input: p.buf, left: p.x, top: p.y }))).png()
  .toFile(path.join(DIR, `${NAME}.png`));
let atlas = `${NAME}.png\nsize:${pageW},${pageH}\nformat:RGBA8888\nfilter:Linear,Linear\nrepeat:none\n`;
for (const p of places) {
  atlas += `${p.id}\n  rotate: false\n  xy: ${p.x}, ${p.y}\n  size: ${p.w}, ${p.h}\n  orig: ${p.w}, ${p.h}\n  offset: 0, 0\n  index: -1\n`;
}
await writeFile(path.join(DIR, `${NAME}.atlas`), atlas);

// --- skeleton: bones nas posições WORLD medidas, pra pose 0 = lateral original ----------------
// Spine Y up: worldY_spine = (ch - worldY_down)
const toSpine = (wx, wy) => ({ x: wx - cw / 2, y: ch - wy }); // origem no centro-base? usamos centro horizontal, base dos pés = 0
// melhor: root nos pés (y=0), x centrado
const footY = ch;
const bonePos = (wx, wy) => ({ x: +(wx - cw / 2).toFixed(2), y: +(footY - wy).toFixed(2) });

const hip = meta.tronco.world;
const hipSP = bonePos(hip.x, hip.y);

function localOf(childWorld, parentWorld) {
  // ambos em coords spine (Y up), rotação 0 no setup
  return {
    x: +(childWorld.x - parentWorld.x).toFixed(2),
    y: +(childWorld.y - parentWorld.y).toFixed(2),
  };
}

const Wpos = {};
for (const [id, p] of Object.entries(meta)) Wpos[id] = bonePos(p.world.x, p.world.y);
Wpos.quadril = hipSP;

const bones = [
  { name: 'root' },
  { name: 'quadril', parent: 'root', ...hipSP },
  { name: 'tronco', parent: 'quadril', x: 0, y: 0 },
  { name: 'cabeca', parent: 'tronco', ...localOf(Wpos.cabeca, hipSP) },
  { name: 'braco-frente-sup', parent: 'tronco', ...localOf(Wpos['braco-frente-sup'], hipSP) },
  { name: 'braco-frente-inf', parent: 'braco-frente-sup', ...localOf(Wpos['braco-frente-inf'], Wpos['braco-frente-sup']) },
  { name: 'coxa-atras', parent: 'quadril', ...localOf(Wpos['coxa-atras'], hipSP) },
  { name: 'canela-atras', parent: 'coxa-atras', ...localOf(Wpos['canela-atras'], Wpos['coxa-atras']) },
  { name: 'pe-atras', parent: 'canela-atras', ...localOf(Wpos['pe-atras'], Wpos['canela-atras']) },
  { name: 'coxa-frente', parent: 'quadril', ...localOf(Wpos['coxa-frente'], hipSP) },
  { name: 'canela-frente', parent: 'coxa-frente', ...localOf(Wpos['canela-frente'], Wpos['coxa-frente']) },
  { name: 'pe-frente', parent: 'canela-frente', ...localOf(Wpos['pe-frente'], Wpos['canela-frente']) },
];

const drawOrder = [
  'coxa-atras', 'canela-atras', 'pe-atras',
  'tronco',
  'coxa-frente', 'canela-frente', 'pe-frente',
  'braco-frente-sup', 'braco-frente-inf',
  'cabeca',
];
const slots = drawOrder.map((id) => ({ name: id, bone: id, attachment: id }));

const attachments = {};
for (const id of ids) {
  const p = meta[id];
  const attX = p.w / 2 - p.pivo[0];
  const attY = sy(p.h / 2 - p.pivo[1]);
  attachments[id] = { [id]: { x: +attX.toFixed(2), y: +attY.toFixed(2), width: p.w, height: p.h } };
}

function rotKeys(dur, keyframes) {
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

// animações mais contidas — cutout de foto lateral sofre com ângulo extremo
const animations = {
  parado: {
    bones: rotKeys(2.2, [
      { t: 0, tronco: 0, cabeca: 0, 'braco-frente-sup': 3, 'braco-frente-inf': -4 },
      { t: 0.5, tronco: -1.5, cabeca: 2, 'braco-frente-sup': 6, 'braco-frente-inf': -6 },
      { t: 1, tronco: 0, cabeca: 0, 'braco-frente-sup': 3, 'braco-frente-inf': -4 },
    ]),
  },
  andar: {
    bones: rotKeys(0.9, [
      { t: 0, 'coxa-frente': 22, 'canela-frente': -10, 'pe-frente': 6, 'coxa-atras': -18, 'canela-atras': 14, 'pe-atras': -4, 'braco-frente-sup': -16, 'braco-frente-inf': -12, tronco: 1, cabeca: -1 },
      { t: 0.25, 'coxa-frente': 4, 'canela-frente': -2, 'pe-frente': 2, 'coxa-atras': 2, 'canela-atras': 28, 'pe-atras': 8, 'braco-frente-sup': 0, 'braco-frente-inf': -8, tronco: 0, cabeca: 0 },
      { t: 0.5, 'coxa-frente': -18, 'canela-frente': 14, 'pe-frente': -4, 'coxa-atras': 22, 'canela-atras': -10, 'pe-atras': 6, 'braco-frente-sup': 16, 'braco-frente-inf': -10, tronco: 1, cabeca: -1 },
      { t: 0.75, 'coxa-frente': 2, 'canela-frente': 28, 'pe-frente': 8, 'coxa-atras': 4, 'canela-atras': -2, 'pe-atras': 2, 'braco-frente-sup': 0, 'braco-frente-inf': -8, tronco: 0, cabeca: 0 },
      { t: 1, 'coxa-frente': 22, 'canela-frente': -10, 'pe-frente': 6, 'coxa-atras': -18, 'canela-atras': 14, 'pe-atras': -4, 'braco-frente-sup': -16, 'braco-frente-inf': -12, tronco: 1, cabeca: -1 },
    ]),
  },
  correr: {
    bones: rotKeys(0.55, [
      { t: 0, tronco: -8, cabeca: 5, 'coxa-frente': 40, 'canela-frente': -28, 'pe-frente': 8, 'coxa-atras': -32, 'canela-atras': 50, 'pe-atras': -6, 'braco-frente-sup': -40, 'braco-frente-inf': -50 },
      { t: 0.25, tronco: -10, cabeca: 5, 'coxa-frente': 8, 'canela-frente': -4, 'pe-frente': 2, 'coxa-atras': 6, 'canela-atras': 62, 'pe-atras': 10, 'braco-frente-sup': -8, 'braco-frente-inf': -40 },
      { t: 0.5, tronco: -8, cabeca: 5, 'coxa-frente': -32, 'canela-frente': 50, 'pe-frente': -6, 'coxa-atras': 40, 'canela-atras': -28, 'pe-atras': 8, 'braco-frente-sup': 36, 'braco-frente-inf': -36 },
      { t: 0.75, tronco: -10, cabeca: 5, 'coxa-frente': 6, 'canela-frente': 62, 'pe-frente': 10, 'coxa-atras': 8, 'canela-atras': -4, 'pe-atras': 2, 'braco-frente-sup': 8, 'braco-frente-inf': -40 },
      { t: 1, tronco: -8, cabeca: 5, 'coxa-frente': 40, 'canela-frente': -28, 'pe-frente': 8, 'coxa-atras': -32, 'canela-atras': 50, 'pe-atras': -6, 'braco-frente-sup': -40, 'braco-frente-inf': -50 },
    ]),
  },
  comemorar: {
    bones: rotKeys(0.85, [
      { t: 0, tronco: 0, cabeca: 0, 'braco-frente-sup': 3, 'braco-frente-inf': -4 },
      { t: 0.22, tronco: 6, cabeca: 3, 'braco-frente-sup': 25, 'braco-frente-inf': -20, 'coxa-frente': -8, 'canela-frente': 14 },
      { t: 0.5, tronco: -6, cabeca: -10, 'braco-frente-sup': -150, 'braco-frente-inf': -8, 'coxa-frente': 6 },
      { t: 1, tronco: -4, cabeca: -8, 'braco-frente-sup': -145, 'braco-frente-inf': -6 },
    ]),
  },
};

const skel = {
  skeleton: {
    hash: `sagafut-lat-${SLUG}`,
    spine: '4.2.33',
    x: -cw / 2,
    y: 0,
    width: cw,
    height: ch,
    images: './',
  },
  bones,
  slots,
  skins: [{ name: 'default', attachments }],
  animations,
};
await writeFile(path.join(DIR, `${NAME}.json`), JSON.stringify(skel, null, 2));

const anims = Object.keys(animations);
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Spine lateral — ${SLUG}</title>
<link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.2.82/dist/spine-player.css">
<style>
  body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#12161a;color:#e8eef2}
  header{padding:16px 20px 6px} h1{margin:0 0 4px;font-size:18px}
  p{margin:0;opacity:.7;font-size:13px}
  #controles{display:flex;flex-wrap:wrap;gap:8px;padding:8px 20px}
  button{appearance:none;border:1px solid #3a4550;background:#243039;color:#e8eef2;border-radius:8px;padding:8px 12px;cursor:pointer;font:inherit}
  button.ativo{background:#3d6df0;border-color:#3d6df0}
  #player{width:min(560px,100vw);height:min(780px,86vh);margin:0 auto}
  .row{display:flex;gap:16px;padding:0 20px 20px;align-items:flex-start;flex-wrap:wrap}
  .ref{width:180px;border-radius:8px;background:#1c2228;padding:8px}
  .ref img{width:100%;height:auto;image-rendering:auto}
  .ref span{display:block;font-size:11px;opacity:.6;margin-top:6px}
</style>
</head>
<body>
<header>
  <h1>Spine — ${SLUG} (cortado da lateral)</h1>
  <p>Um desenho só, fatiado com overlap. Na pose 0 deve parecer a referência.</p>
</header>
<div id="controles">
  ${anims.map((a) => `<button data-anim="${a}" data-loop="${a === 'comemorar' ? '0' : '1'}">${a}</button>`).join('')}
</div>
<div class="row">
  <div id="player"></div>
  <div class="ref"><img src="_lateral.png" alt="ref"/><span>referência (_lateral.png)</span></div>
</div>
<script src="https://unpkg.com/@esotericsoftware/spine-player@4.2.82/dist/iife/spine-player.js"></script>
<script>
  let player=null, pronto=false;
  function play(anim,loop){
    document.querySelectorAll('#controles button').forEach(b=>b.classList.toggle('ativo',b.dataset.anim===anim));
    if(!pronto) return;
    try{player.setAnimation(anim,loop)}catch(e){console.error(e)}
  }
  player=new spine.SpinePlayer('player',{
    skeleton:'${NAME}.json',atlas:'${NAME}.atlas',animation:'parado',
    premultipliedAlpha:false,backgroundColor:'#1c2228',showControls:true,alpha:true,
    success:(p)=>{player=p;pronto=true;document.querySelector('[data-anim=parado]')?.classList.add('ativo')},
    error:(_p,r)=>document.body.insertAdjacentHTML('beforeend','<pre style="color:#f66;padding:20px">'+r+'</pre>')
  });
  document.querySelectorAll('#controles button').forEach(b=>b.addEventListener('click',()=>play(b.dataset.anim,b.dataset.loop==='1')));
</script>
</body>
</html>`;
await writeFile(path.join(DIR, 'preview.html'), html);
console.log('OK', path.join(DIR, 'preview.html'));
