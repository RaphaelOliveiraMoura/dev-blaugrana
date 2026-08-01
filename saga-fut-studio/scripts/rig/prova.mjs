// prova.mjs <slug> [--mov=correr] — A PROVA DO BONECO: ele aguenta ser animado?
//
// Duas saídas, porque são duas perguntas diferentes:
//   _boneco-poses.png  as poses extremas lado a lado -> A EMENDA APARECE? É nas rotações grandes
//                      (braço acima da cabeça, joelho dobrado) que a junta abre, se for abrir.
//   _boneco-<mov>.mp4  o movimento rodando -> O TIMING FUNCIONA? Emenda parada engana; movimento não.
//
// Custa ZERO geração: é o mesmo princípio do animatic, provar antes de gastar. Se a arte da folha
// não servir, o conserto é uma geração, não um vídeo inteiro refeito.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CONTEUDO, CANVAS_W, CANVAS_H } from '../sprites/config.mjs';
import { dirBoneco } from '../../shared/boneco.mjs';
import { carregarBoneco, renderPose } from './posar.mjs';
import { MOVIMENTOS, MOVIMENTOS_IDS, poseEm } from './movimentos.mjs';

const SLUG = process.argv[2];
const flag = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
if (!SLUG) { console.error('uso: node prova.mjs <slug> [--mov=correr]'); process.exit(1); }

const bon = await carregarBoneco(SLUG);
const dirAbs = path.join(CONTEUDO, dirBoneco(SLUG));
const FUNDO = '#20252b';
// `--traco` desenha o contorno a partir da SILHUETA DO CORPO MONTADO, em vez de deixar cada peça
// exibir o seu. É o que faz o boneco parar de parecer colagem.
const TRACO = process.argv.includes('--traco') ? { px: 7, cor: '#141414' } : null;

// ---------------------------------------------------------------- 1) folha de poses extremas
// Uma pose de cada movimento, no instante em que ele está MAIS TORCIDO: é onde a junta abre.
const AMOSTRAS = [
  ['parado', 0.5], ['andar', 0.0], ['andar', 0.5], ['correr', 0.0],
  ['correr', 0.25], ['apontar', 1.0], ['assustar', 0.55], ['comemorar', 0.55],
];
const CEL_W = 300, CEL_H = Math.round((CANVAS_H / CANVAS_W) * CEL_W), ROT = 34, GAP = 8;
const COLS = 4, ROWS = Math.ceil(AMOSTRAS.length / COLS);
const comp = [];
for (let i = 0; i < AMOSTRAS.length; i++) {
  const [mv, t] = AMOSTRAS[i];
  const png = await renderPose(bon, poseEm(MOVIMENTOS[mv], t), { fundo: FUNDO, traco: TRACO });
  const cel = await sharp(png).resize(CEL_W, CEL_H).png().toBuffer();
  const c = i % COLS, r = Math.floor(i / COLS);
  const x = GAP + c * (CEL_W + GAP), y = GAP + r * (CEL_H + ROT + GAP);
  comp.push({ input: cel, left: x, top: y });
  comp.push({
    input: Buffer.from(`<svg width="${CEL_W}" height="${ROT}" xmlns="http://www.w3.org/2000/svg">`
      + `<rect width="${CEL_W}" height="${ROT}" fill="#101010"/>`
      + `<text x="8" y="23" font-family="Helvetica,Arial" font-size="17" font-weight="bold" fill="#ffcc33">${mv} @ ${t}</text></svg>`),
    left: x, top: y + CEL_H,
  });
}
const folhaRel = `${dirBoneco(SLUG)}/_boneco-poses.png`;
await sharp({ create: { width: GAP + COLS * (CEL_W + GAP), height: GAP + ROWS * (CEL_H + ROT + GAP), channels: 3, background: '#0d0d0d' } })
  .composite(comp).png().toFile(path.join(CONTEUDO, folhaRel));
console.log(`OK poses -> ${folhaRel}`);

// ---------------------------------------------------------------- 2) o movimento rodando
const MOV = flag('mov', 'correr');
if (!MOVIMENTOS[MOV]) { console.error(`movimento "${MOV}" não existe (${MOVIMENTOS_IDS.join(', ')})`); process.exit(1); }
const m = MOVIMENTOS[MOV];
const FPS = 30, CICLOS = m.loop ? 3 : 1;
const N = Math.round(m.dur * FPS * CICLOS);
const tmp = path.join(dirAbs, '_frames');
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

for (let f = 0; f < N; f++) {
  const t = (f / (m.dur * FPS)) % (m.loop ? 1 : 1e9);
  const pose = poseEm(m, m.loop ? t : Math.min(1, f / (m.dur * FPS)));
  // DESLOCAMENTO: quem avança sai do lugar. É o mesmo princípio da regra da casa (nada de pose
  // parada deslizando), só que agora a passada e o avanço saem do MESMO dado.
  const avanco = m.avanca ? ((f / N) * (CANVAS_W * 0.7) - CANVAS_W * 0.25) : 0;
  // VOO: nos instantes em que os dois pés deixam o chão, o corpo sobe. Sem isto a corrida parece
  // patinação, que é exatamente a queixa que originou a folha de exposição.
  const sobe = m.voo ? Math.abs(Math.sin((t % 1) * Math.PI * 2)) * (CANVAS_H * m.voo) : 0;
  const png = await renderPose(bon, pose, { x: CANVAS_W / 2 + avanco, y: 610 - sobe, fundo: FUNDO, traco: TRACO });
  await writeFile(path.join(tmp, `f${String(f).padStart(4, '0')}.png`), png);
}
const mp4Rel = `${dirBoneco(SLUG)}/_boneco-${MOV}.mp4`;
await new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(CONTEUDO, mp4Rel)], { stdio: 'ignore' });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu ' + c))));
});
await rm(tmp, { recursive: true, force: true });
console.log(`OK ${MOV} (${N} frames) -> ${mp4Rel}`);
console.log(`\n   ${MOVIMENTOS_IDS.length} movimentos disponíveis, TODOS sem gerar nada: ${MOVIMENTOS_IDS.join(', ')}`);
