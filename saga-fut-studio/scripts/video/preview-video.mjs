// preview-video.mjs <id> [n] — FOLHA DE CONTATO do vídeo, rápida, sem render completo.
// Renderiza N stills (default 10) igualmente espaçados usando o MOTOR DE VERDADE (Remotion
// renderStill), e junta num PNG único com rótulo de frame/tempo em cada quadro. Serve pra AVALIAR
// posicionamento/orientação/timing de uma vez e ajustar o roteiro sem renderizar 600 frames.
// Saída: videos/<id>/_preview.png
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { VIDEO_DIR, videoDir } from '../../server/config.mjs';
import { montarCena } from '../../server/video/montar-cena.mjs';
import { stage } from '../../server/video/render-video.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = path.resolve(__dirname, '../../remotion');
// @remotion/* só existem em remotion/node_modules — resolve de lá e importa por caminho absoluto
const reqR = createRequire(path.join(REMOTION_DIR, 'package.json'));
const { bundle } = await import(reqR.resolve('@remotion/bundler'));
const { selectComposition, renderStill } = await import(reqR.resolve('@remotion/renderer'));

const ID = process.argv[2];
const N = Math.max(2, Math.min(24, Number(process.argv[3]) || 10));
const SCENE = process.argv[4] != null ? Number(process.argv[4]) : null; // foco numa cena (0-based)
if (!ID) { console.error('uso: node preview-video.mjs <id> [n=10] [cena]'); process.exit(2); }

const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, ID + '.json'), 'utf-8'));
const { scene, totalFrames } = montarCena(video);
const fps = scene.fps || 30;

// limites [ini,fim) de cada shot (conta a sobreposição das transições, como o montarRoteiro)
const bounds = []; let cursor = 0;
(scene.shots || []).forEach((s, i) => {
  const ov = (i > 0 && s.transition && s.transition !== 'none') ? (s.tdur || 0) : 0;
  const start = Math.max(0, cursor - ov); const end = start + s.dur; bounds.push([start, end]); cursor = end;
});

let lo = 0, hi = totalFrames - 1, tag = 'vídeo inteiro';
if (SCENE != null && bounds[SCENE]) { lo = bounds[SCENE][0]; hi = Math.min(totalFrames - 1, bounds[SCENE][1] - 1); tag = `cena ${SCENE}`; }
console.log(`preview ${ID}: ${tag} (${lo}–${hi}), ${N} stills...`);
await stage(video);
await fs.writeFile(path.join(REMOTION_DIR, 'src', 'scene.json'), JSON.stringify(scene, null, 2));

const serveUrl = await bundle({ entryPoint: path.join(REMOTION_DIR, 'src', 'index.jsx') });
const composition = await selectComposition({ serveUrl, id: 'Cena' });

// frames igualmente espaçados dentro da janela (vídeo inteiro ou uma cena)
const frames = Array.from({ length: N }, (_, i) => Math.round(lo + (i * (hi - lo)) / (N - 1)));
const tmp = path.join(REMOTION_DIR, '_preview_tmp');
await fs.rm(tmp, { recursive: true, force: true }); await fs.mkdir(tmp, { recursive: true });

const stills = [];
for (const f of frames) {
  const out = path.join(tmp, `f${f}.png`);
  await renderStill({ composition, serveUrl, output: out, frame: f, imageFormat: 'png', scale: 0.5, chromiumOptions: { gl: 'swiftshader' } });
  stills.push({ f, out });
  process.stdout.write(`  frame ${f} (${(f / fps).toFixed(1)}s)\n`);
}

// monta a grade: thumbs + rótulo (frame / tempo) por quadro
const cols = N <= 6 ? 3 : (N <= 12 ? 4 : 5);
const rows = Math.ceil(N / cols);
const meta0 = await sharp(stills[0].out).metadata();
const tw = meta0.width, th = meta0.height, pad = 8, lab = 34;
const cw = tw + pad * 2, ch = th + pad * 2 + lab;
const canvasW = cols * cw, canvasH = rows * ch;

const comps = [];
for (let i = 0; i < stills.length; i++) {
  const { f, out } = stills[i];
  const r = Math.floor(i / cols), c = i % cols;
  const x = c * cw + pad, y = r * ch + pad;
  comps.push({ input: out, left: x, top: y });
  const t = (f / fps).toFixed(1);
  const svg = Buffer.from(`<svg width="${tw}" height="${lab}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="8" y="24" font-family="monospace" font-size="22" fill="#fff">#${i + 1}  f${f}  ${t}s</text></svg>`);
  comps.push({ input: svg, left: x, top: y + th + pad });
}
const outFile = path.join(videoDir(ID), '_preview.png');
await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } })
  .composite(comps).png().toFile(outFile);
await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});

console.log(`OK folha de contato: videos/${ID}/_preview.png  (${cols}x${rows}, frames ${frames.join(',')})`);
