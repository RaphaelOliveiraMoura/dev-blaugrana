// compor-camada.mjs <videoId> <origem> <saida> <larguraMundo> <alturaMundo> [--x=px] [--base=px] [--altura=px]
// Posiciona UM elemento recortado (já transparente) dentro de uma camada do tamanho do MUNDO.
//
// POR QUE EXISTE: um prop de cenário (portão, poste, placa, banco) sai do gerador enquadrado no
// próprio quadro dele, não no mundo. Colar isso direto como camada deixaria o prop esticado na
// largura inteira do panorama. Aqui ele é escalado pela ALTURA pedida e plantado num ponto exato
// (`x` = centro horizontal no mundo, `base` = onde o pé dele encosta no chão), com o resto
// transparente. Assim a mesma geração serve pra qualquer posição, e mexer no lugar não custa render.
import sharp from 'sharp';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const flag = (n, d) => { const f = args.find((a) => a.startsWith(`--${n}=`)); return f ? parseInt(f.split('=')[1], 10) : d; };
const [VIDEOID, ORIGEM, SAIDA, MW, MH] = pos;
if (!VIDEOID || !ORIGEM || !SAIDA || !MW || !MH) {
  console.error('uso: node compor-camada.mjs <videoId> <origem> <saida> <larguraMundo> <alturaMundo> [--x=] [--base=] [--altura=]');
  process.exit(1);
}
const W = parseInt(MW, 10), H = parseInt(MH, 10);
const cen = (n) => path.join(CONTEUDO, `videos/${VIDEOID}/cenario/${n}.png`);

// recorta a bbox do que é opaco (o prop pode vir com folga transparente em volta)
const { data, info } = await sharp(cen(ORIGEM)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
for (let p = 0; p < info.width * info.height; p++) {
  if (data[p * 4 + 3] > 25) { const x = p % info.width, y = (p / info.width) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
}
if (maxX < 0) { console.error('FAIL: origem está 100% transparente'); process.exit(1); }
const bw = maxX - minX + 1, bh = maxY - minY + 1;

const alturaAlvo = flag('altura', Math.round(H * 0.5));
const cx = flag('x', Math.round(W / 2));
const base = flag('base', Math.round(H * 0.86));
const esc = alturaAlvo / bh;
const nw = Math.max(1, Math.round(bw * esc)), nh = Math.max(1, Math.round(bh * esc));

const prop = await sharp(cen(ORIGEM)).extract({ left: minX, top: minY, width: bw, height: bh })
  .resize(nw, nh, { kernel: 'lanczos3' }).png().toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: prop, left: Math.round(cx - nw / 2), top: Math.round(base - nh) }])
  .png().toFile(cen(SAIDA));
console.log(`OK camada ${SAIDA}: ${W}x${H} · prop ${bw}x${bh} -> ${nw}x${nh}, centro x=${cx}, base y=${base}`);
