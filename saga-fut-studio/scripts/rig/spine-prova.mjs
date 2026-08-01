// spine-prova.mjs <slug> — converte o BONECO da casa pro formato Spine 4.2 e gera preview.
//
// NÃO exige o Spine Editor. Lê peças + pivôs + MOVIMENTOS, grava skeleton.json + atlas + HTML
// com o Spine Web Player oficial. Serve pra julgar se o formato Spine agrega algo além do
// cutout que o posar.mjs já faz.
//
// Uso: node scripts/rig/spine-prova.mjs raphinha-riso
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO } from '../sprites/config.mjs';
import { OSSOS, PONTOS_TRONCO, SOBREPOR, dirBoneco } from '../../shared/boneco.mjs';
import { carregarBoneco } from './posar.mjs';
import { MOVIMENTOS } from './movimentos.mjs';

const SLUG = process.argv[2] || 'raphinha-riso';
const OUT = path.join(CONTEUDO, dirBoneco(SLUG), '..', 'spine');
const PAD = 2;

// Spine: Y pra CIMA, rotação anti-horária. Boneco: Y pra BAIXO, rotação horária.
const sy = (y) => -y;
const srot = (g) => -g;

function encaixeLocal(bon, paiId, em) {
  const p = bon.pecas[paiId];
  if (em && PONTOS_TRONCO[em]) {
    const [fx, fy] = PONTOS_TRONCO[em];
    const b = p.bordas && (em.startsWith('ombro') ? p.bordas.ombro : em.startsWith('quadril') ? p.bordas.quadril : null);
    const x = b ? (b[0] + (b[1] - b[0]) * fx) * p.kx : fx * p.w;
    return [x - p.pivo[0], fy * p.h - p.pivo[1]];
  }
  return [p.ponta[0] - p.pivo[0], (p.ponta[1] - p.pivo[1]) * SOBREPOR];
}

async function packAtlas(bon, outDir, name) {
  const ids = OSSOS.map((o) => o.id).filter((id) => bon.pecas[id]);
  const imgs = [];
  for (const id of ids) {
    // reescala a peça pra proporção canônica (igual posar.mjs) antes de empacotar
    const p = bon.pecas[id];
    const w = Math.max(1, Math.round(p.w));
    const h = Math.max(1, Math.round(p.h));
    const src = path.join(CONTEUDO, p.arquivo);
    const resized = await sharp(src).resize(w, h, { fit: 'fill' }).ensureAlpha().png().toBuffer();
    imgs.push({ id, w, h, buf: resized });
  }

  // empacota em linhas simples
  let maxW = 0, y = PAD, rowH = 0, x = PAD;
  const MAX_ROW = 1024;
  const places = [];
  for (const im of imgs) {
    if (x + im.w + PAD > MAX_ROW && x > PAD) {
      y += rowH + PAD;
      x = PAD;
      rowH = 0;
    }
    places.push({ ...im, x, y });
    x += im.w + PAD;
    rowH = Math.max(rowH, im.h);
    maxW = Math.max(maxW, x);
  }
  const pageW = Math.max(64, maxW);
  const pageH = Math.max(64, y + rowH + PAD);

  const composites = places.map((p) => ({ input: p.buf, left: p.x, top: p.y }));
  const pagePath = path.join(outDir, `${name}.png`);
  await sharp({
    create: { width: pageW, height: pageH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites).png().toFile(pagePath);

  // atlas libgdx (formato Spine)
  let atlas = `${name}.png\nsize:${pageW},${pageH}\nformat:RGBA8888\nfilter:Linear,Linear\nrepeat:none\n`;
  for (const p of places) {
    atlas += `${p.id}\n  rotate: false\n  xy: ${p.x}, ${p.y}\n  size: ${p.w}, ${p.h}\n  orig: ${p.w}, ${p.h}\n  offset: 0, 0\n  index: -1\n`;
  }
  await writeFile(path.join(outDir, `${name}.atlas`), atlas);
  return { places, pageW, pageH };
}

const EASE = [0.25, 0, 0.75, 1]; // bezier do Spine 4.2 (string "linear" estoura o player)

function keyRotate(chaves, dur, osso) {
  return chaves.map((ch, i) => {
    const k = {
      time: +(ch.t * dur).toFixed(4),
      value: +srot(ch[osso] ?? 0).toFixed(3),
    };
    if (i < chaves.length - 1) k.curve = EASE;
    return k;
  });
}

function buildSkeleton(bon) {
  // root no chão; tronco (quadril) sobe pela altura do pé→quadril, como no sombrero example
  const hipY = bon.alturaQuadril;
  const bones = [
    { name: 'root' },
    { name: 'tronco', parent: 'root', x: 0, y: +hipY.toFixed(3) },
  ];

  for (const o of OSSOS) {
    if (o.id === 'tronco') continue;
    if (!bon.pecas[o.id]) continue;
    const [lx, ly] = encaixeLocal(bon, o.pai, o.em);
    const len = Math.hypot(
      bon.pecas[o.id].ponta[0] - bon.pecas[o.id].pivo[0],
      bon.pecas[o.id].ponta[1] - bon.pecas[o.id].pivo[1],
    );
    bones.push({
      name: o.id,
      parent: o.pai === 'tronco' ? 'tronco' : o.pai,
      length: +len.toFixed(3),
      x: +lx.toFixed(3),
      y: +sy(ly).toFixed(3),
    });
  }

  const slots = [...OSSOS]
    .filter((o) => bon.pecas[o.id])
    .sort((a, b) => a.z - b.z)
    .map((o) => ({ name: o.id, bone: o.id, attachment: o.id }));

  const attachments = {};
  for (const o of OSSOS) {
    const p = bon.pecas[o.id];
    if (!p) continue;
    // attachment origin = centro da imagem; bone = pivô
    const ax = p.w / 2 - p.pivo[0];
    const ay = sy(p.h / 2 - p.pivo[1]);
    attachments[o.id] = {
      [o.id]: {
        x: +ax.toFixed(3),
        y: +ay.toFixed(3),
        width: Math.round(p.w),
        height: Math.round(p.h),
      },
    };
  }

  const animations = {};
  for (const [nome, mov] of Object.entries(MOVIMENTOS)) {
    const bonesAnim = {};
    const ossosAnimados = new Set();
    for (const ch of mov.chaves) {
      for (const k of Object.keys(ch)) if (k !== 't') ossosAnimados.add(k);
    }
    for (const osso of ossosAnimados) {
      if (!bon.pecas[osso] && osso !== 'tronco') continue;
      bonesAnim[osso] = { rotate: keyRotate(mov.chaves, mov.dur, osso) };
    }
    // sem translate: em Spine 4.2 a curva bezier de translate precisa de 8 valores (x+y);
    // com 4 o runtime devolve NaN e o player mostra "Animation bounds are invalid".
    animations[nome] = { bones: bonesAnim };
  }

  const tronco = bon.pecas.tronco;
  const h = hipY + (tronco?.h || 200) * 0.6;
  return {
    skeleton: {
      hash: `sagafut-${SLUG}`,
      spine: '4.2.33',
      x: -220,
      y: 0,
      width: 440,
      height: Math.round(h + 40),
      images: './',
    },
    bones,
    slots,
    skins: [{ name: 'default', attachments }],
    animations,
  };
}

function htmlPreview(name, anims) {
  const loopSet = new Set(
    Object.entries(MOVIMENTOS).filter(([, m]) => m.loop).map(([id]) => id),
  );
  const buttons = anims.map((a) =>
    `<button type="button" data-anim="${a}" data-loop="${loopSet.has(a) ? '1' : '0'}">${a}</button>`).join('\n    ');
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Spine prova — ${SLUG}</title>
  <link rel="stylesheet" href="https://unpkg.com/@esotericsoftware/spine-player@4.2.82/dist/spine-player.css">
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #1a1f24; color: #e8eef2; }
    header { padding: 16px 20px 8px; }
    h1 { margin: 0 0 4px; font-size: 18px; font-weight: 650; }
    p { margin: 0; opacity: .7; font-size: 13px; }
    #controles { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 20px 16px; }
    button {
      appearance: none; border: 1px solid #3a4550; background: #243039; color: #e8eef2;
      border-radius: 8px; padding: 8px 12px; cursor: pointer; font: inherit;
    }
    button:hover { background: #2e3b46; }
    button.ativo { background: #3d6df0; border-color: #3d6df0; }
    #player { width: min(520px, 100vw); height: min(720px, 85vh); margin: 0 auto; }
    .aviso { padding: 0 20px 20px; font-size: 12px; opacity: .55; max-width: 640px; }
  </style>
</head>
<body>
  <header>
    <h1>Spine 4.2 — ${SLUG}</h1>
    <p>Peças do boneco + movimentos da casa, convertidos pro formato Spine. Sem Spine Editor.</p>
  </header>
  <div id="controles">
    ${buttons}
  </div>
  <div id="player"></div>
  <p class="aviso">Mesma arte cutout do <code>boneco/</code>. O ganho do Spine de verdade (mesh, weights, IK) só aparece com o Editor. Isto valida o formato e o player.</p>
  <script src="https://unpkg.com/@esotericsoftware/spine-player@4.2.82/dist/iife/spine-player.js"></script>
  <script>
    let player = null;
    let pronto = false;
    const fila = [];
    function play(anim, loop) {
      document.querySelectorAll('#controles button').forEach((b) => {
        b.classList.toggle('ativo', b.dataset.anim === anim);
      });
      if (!pronto) { fila.push([anim, loop]); return; }
      try { player.setAnimation(anim, loop); }
      catch (e) { console.error(e); }
    }
    player = new spine.SpinePlayer('player', {
      skeleton: '${name}.json',
      atlas: '${name}.atlas',
      animation: '${anims.includes('andar') ? 'andar' : anims[0]}',
      premultipliedAlpha: false,
      backgroundColor: '#20252b',
      showControls: true,
      alpha: true,
      success: (p) => {
        player = p;
        pronto = true;
        document.querySelector('[data-anim="${anims.includes('andar') ? 'andar' : anims[0]}"]')?.classList.add('ativo');
        while (fila.length) { const [a, l] = fila.shift(); play(a, l); }
      },
      error: (_p, reason) => {
        document.body.insertAdjacentHTML('beforeend', '<pre style="color:#f66;padding:20px">'+reason+'</pre>');
      },
    });
    document.querySelectorAll('#controles button').forEach((b) => {
      b.addEventListener('click', () => play(b.dataset.anim, b.dataset.loop === '1'));
    });
  </script>
</body>
</html>
`;
}

await mkdir(OUT, { recursive: true });
console.log(`→ carregando boneco ${SLUG}`);
const bon = await carregarBoneco(SLUG);
const name = 'raphinha';

console.log('→ empacotando atlas');
await packAtlas(bon, OUT, name);

console.log('→ montando skeleton + animações');
const skel = buildSkeleton(bon);
const skelPath = path.join(OUT, `${name}.json`);
await writeFile(skelPath, JSON.stringify(skel, null, 2));

const anims = Object.keys(skel.animations);
const htmlPath = path.join(OUT, 'preview.html');
await writeFile(htmlPath, htmlPreview(name, anims));

console.log('OK');
console.log(`   ${path.relative(CONTEUDO, OUT)}/`);
console.log(`   animações: ${anims.join(', ')}`);
console.log(`   abra: ${htmlPath}`);
