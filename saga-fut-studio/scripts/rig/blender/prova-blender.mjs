// prova-blender.mjs <slug> [--mov=correr] — o MESMO boneco, os MESMOS ângulos, rodando no Blender.
//
// POR QUE ESTE TESTE EXISTE: o nosso motor gira cada peça como um retângulo rígido. O Blender
// deforma a MALHA por peso de osso, que é o que Spine/Moho/Live2D fazem. Como as duas provas usam
// as mesmas peças e o mesmo movimento, a diferença na tela é só a deformação, e dá pra decidir se
// ela vale a mudança de pipeline (Blender instalado, render fora do Remotion).
//
// Nada aqui vira asset: sai em `boneco/_blender-<mov>.mp4`, ao lado da prova de casa.
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CONTEUDO, CANVAS_W, CANVAS_H, FEET_Y } from '../../sprites/config.mjs';
import { OSSOS, dirBoneco } from '../../../shared/boneco.mjs';
import { carregarBoneco, resolver } from '../posar.mjs';
import { MOVIMENTOS, MOVIMENTOS_IDS, poseEm } from '../movimentos.mjs';

const BLENDER = ['/Applications/Blender.app/Contents/MacOS/Blender', '/opt/homebrew/bin/blender', 'blender']
  .find((p) => p === 'blender' || existsSync(p));

const SLUG = process.argv[2];
const flag = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
if (!SLUG) { console.error('uso: node prova-blender.mjs <slug> [--mov=correr]'); process.exit(1); }
const MOV = flag('mov', 'correr');
if (!MOVIMENTOS[MOV]) { console.error(`movimento "${MOV}" não existe (${MOVIMENTOS_IDS.join(', ')})`); process.exit(1); }

const bon = await carregarBoneco(SLUG);
const m = MOVIMENTOS[MOV];
const FPS = 30;
const N = Math.round(m.dur * FPS * (m.loop ? 2 : 1));

// --- conversão de espaço -----------------------------------------------------------------------
// Nosso: origem no quadril, Y cresce PRA BAIXO (é SVG). Blender: Y cresce pra cima e a vertical é
// o eixo Z. A câmera ortográfica enquadra o canvas inteiro, então basta pôr o quadril na altura
// certa e o resto acompanha.
const yQuadril = CANVAS_H / 2 - (FEET_Y - bon.alturaQuadril);
const paraBlender = (px, py) => [px, yQuadril - py];

const rest = resolver(bon, {}, { x: 0, y: 0 });
const zDe = Object.fromEntries(OSSOS.map((o) => [o.id, o.z]));

const pecas = {};
for (const o of OSSOS) {
  const p = bon.pecas[o.id];
  if (!p) continue;
  const g = rest[o.id];
  const [x, y] = paraBlender(g.x + (p.w / 2 - p.pivo[0]), g.y + (p.h / 2 - p.pivo[1]));
  pecas[o.id] = { x, y, w: p.w, h: p.h, z: -zDe[o.id] * 0.4, pai: o.pai || null, junta_no_topo: p.ancora === 'topo' };
}

// PAI ANTES DO FILHO: `OSSOS` está na ordem de DESENHO (o braço de trás vem antes do tronco, porque
// é pintado atrás dele), e criar um osso cujo pai ainda não existe quebra o Blender. São duas
// ordens diferentes para duas coisas diferentes.
const porHierarquia = [];
const empilhar = (o) => {
  if (porHierarquia.includes(o)) return;
  if (o.pai) empilhar(OSSOS.find((x) => x.id === o.pai));
  porHierarquia.push(o);
};
OSSOS.forEach(empilhar);

const ossos = porHierarquia.map((o) => {
  const p = bon.pecas[o.id];
  const g = rest[o.id];
  const pontaLocal = o.id === 'tronco' ? [0, -p.h * 0.6] : [p.ponta[0] - p.pivo[0], p.ponta[1] - p.pivo[1]];
  return {
    id: o.id, pai: o.pai,
    head: paraBlender(g.x, g.y),
    tail: paraBlender(g.x + pontaLocal[0], g.y + pontaLocal[1]),
  };
});

const frames = [];
for (let f = 0; f < N; f++) {
  const t = m.loop ? (f / (m.dur * FPS)) % 1 : Math.min(1, f / (m.dur * FPS));
  frames.push(poseEm(m, t));
}

const dirAbs = path.join(CONTEUDO, dirBoneco(SLUG));
const tmp = path.join(dirAbs, '_blender');
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });
const movJson = path.join(tmp, 'mov.json');
await writeFile(movJson, JSON.stringify({ w: CANVAS_W, h: CANVAS_H, cortes: 10, pecas, ossos, frames }, null, 1));

if (!BLENDER) { console.error('FAIL Blender não encontrado (esperava /Applications/Blender.app ou no PATH)'); process.exit(1); }
console.log(`>>> blender ${SLUG} / ${MOV} (${N} frames, mesh deform)`);
await new Promise((res, rej) => {
  const p = spawn(BLENDER, ['--background', '--python', path.join(path.dirname(new URL(import.meta.url).pathname), 'rig.py'),
    '--', dirAbs, path.join(CONTEUDO, dirBoneco(SLUG), '_boneco.json'), movJson, path.join(tmp, 'frames')],
    { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error('blender saiu ' + c))));
});

const fr = (await readdir(path.join(tmp, 'frames'))).filter((f) => f.endsWith('.png')).sort();
if (!fr.length) { console.error('FAIL o Blender não gravou frame nenhum'); process.exit(1); }
const mp4Rel = `${dirBoneco(SLUG)}/_blender-${MOV}.mp4`;
await new Promise((res, rej) => {
  // fundo como SEGUNDA ENTRADA e overlay simples. A primeira versão usava scale2ref dentro de -vf,
  // que espera duas entradas no mesmo filtro e ficava esperando para sempre por uma que não existia.
  const p = spawn('ffmpeg', ['-y',
    '-f', 'lavfi', '-i', `color=c=0x20252b:s=${CANVAS_W}x${CANVAS_H}:r=${FPS}`,
    '-framerate', String(FPS), '-i', path.join(tmp, 'frames', 'f%04d.png'),
    '-filter_complex', '[0][1]overlay=shortest=1',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(CONTEUDO, mp4Rel)], { stdio: 'ignore' });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu ' + c))));
});
console.log(`OK blender ${MOV} (${fr.length} frames) -> ${mp4Rel}`);
