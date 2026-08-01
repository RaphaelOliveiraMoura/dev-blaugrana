// limitada.mjs <slug> — ANIMAÇÃO LIMITADA: o corpo quase parado, a expressão fazendo o trabalho.
//
// É a resposta ao que as referências mostram e o rig articulado não entregava: pouca animação, mas
// específica. Aqui só existem três recursos, e nenhum deles articula nada:
//
//   1. TROCA DE EXPRESSÃO   a cabeça muda de desenho, em UM frame, e segura.
//   2. BEAT CORPORAL        o corpo inteiro se inclina, encolhe ou salta por poucos frames.
//   3. HOLD                 o tempo parado entre uma coisa e outra, que é o que faz ler.
//
// O terceiro é o que a maioria erra. Animação limitada não é "animar menos": é animar em POUCOS
// instantes com o resto absolutamente imóvel, porque o contraste é o que dá o timing cômico.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CONTEUDO, CANVAS_W, CANVAS_H, FEET_Y } from '../sprites/config.mjs';
import { dirBoneco } from '../../shared/boneco.mjs';
import { metaRosto } from '../../shared/rosto.mjs';
import { carregarBoneco, resolver, svgDaPose } from './posar.mjs';
import { MOVIMENTOS, poseEm } from './movimentos.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('uso: node limitada.mjs <slug>'); process.exit(1); }
const FPS = 30, FUNDO = '#20252b';

const bon = await carregarBoneco(SLUG);
const rosto = JSON.parse(await readFile(path.join(CONTEUDO, metaRosto(SLUG)), 'utf8'));

// A CENA, escrita como uma partilha de tempo. Cada entrada é um instante: quantos frames segura,
// que expressão está no rosto e que beat o corpo faz. Repare em quanta coisa é `null`: é hold.
const CENA = [
  { hold: 26, exp: 'neutro' },
  { hold: 4, exp: 'piscando' },
  { hold: 20, exp: 'neutro' },
  { hold: 22, exp: 'sobrancelha', beat: { tipo: 'inclina', graus: -3 } },
  { hold: 34, exp: 'sobrancelha' },
  { hold: 3, exp: 'choque', beat: { tipo: 'tranco', px: 14 } },
  { hold: 26, exp: 'choque' },
  { hold: 5, exp: 'bravo', beat: { tipo: 'squash', k: 0.94 } },
  { hold: 30, exp: 'bravo' },
  { hold: 8, exp: 'falando' },
  { hold: 6, exp: 'rindo' },
  { hold: 8, exp: 'falando' },
  { hold: 40, exp: 'rindo', beat: { tipo: 'pulinho', px: 10 } },
];

// posição da cabeça no boneco, em repouso: a expressão entra exatamente onde a cabeça estava
const g = resolver(bon, {}, { x: 0, y: 0 });
const cab = bon.pecas.cabeca;
const escalaRosto = cab.h / rosto.h * 1.18;

const dirAbs = path.join(CONTEUDO, dirBoneco(SLUG));
const tmp = path.join(dirAbs, '_lim');
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

// o CORPO é o boneco em pose de repouso, SEM cabeça: ela vem da folha de expressões
const corpoSVG = svgDaPose(bon, {}, { fundo: null, sem: ['cabeca'] });
const corpoPNG = await sharp(Buffer.from(corpoSVG)).png().toBuffer();

let f = 0;
for (const passo of CENA) {
  for (let i = 0; i < passo.hold; i++, f++) {
    // O BEAT decai em poucos frames e some. Ele existe pra pontuar a troca de expressão, não pra
    // ficar acontecendo: beat que dura vira balanço e o personagem parece que está no mar.
    const u = passo.beat ? Math.max(0, 1 - i / 6) : 0;
    const b = passo.beat || {};
    const dy = b.tipo === 'pulinho' ? -Math.sin(u * Math.PI) * (b.px || 10)
      : b.tipo === 'tranco' ? u * (b.px || 12) : 0;
    const dx = b.tipo === 'tranco' ? -u * (b.px || 12) : 0;
    const rot = b.tipo === 'inclina' ? u * (b.graus || -3) : 0;
    const sy = b.tipo === 'squash' ? 1 - (1 - (b.k || 0.94)) * u : 1;

    const rostoAbs = path.join(CONTEUDO, rosto.expressoes[passo.exp].arquivo);
    const rw = Math.round(rosto.w * escalaRosto), rh = Math.round(rosto.h * escalaRosto);
    const rostoPNG = await sharp(rostoAbs).resize(rw, rh).png().toBuffer();

    // a cabeça senta no PESCOÇO, que é o ponto que não muda de expressão pra expressão
    const cx = CANVAS_W / 2 + g.cabeca.x + dx;
    const cy = FEET_Y - bon.alturaQuadril + g.cabeca.y + dy;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
      <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${FUNDO}"/>
      <g transform="translate(${CANVAS_W / 2 + dx},${FEET_Y + dy}) rotate(${rot}) scale(1,${sy}) translate(${-CANVAS_W / 2},${-FEET_Y})">
        <image href="data:image/png;base64,${corpoPNG.toString('base64')}" x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}"/>
        <image href="data:image/png;base64,${rostoPNG.toString('base64')}" x="${cx - rw / 2}" y="${cy - rh}" width="${rw}" height="${rh}"/>
      </g></svg>`;
    await writeFile(path.join(tmp, `f${String(f).padStart(4, '0')}.png`), await sharp(Buffer.from(svg)).png().toBuffer());
  }
}

const mp4Rel = `${dirBoneco(SLUG)}/_limitada.mp4`;
await new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(CONTEUDO, mp4Rel)], { stdio: 'ignore' });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu ' + c))));
});
await rm(tmp, { recursive: true, force: true });
console.log(`OK animação limitada (${f} frames, ${(f / FPS).toFixed(1)}s) -> ${mp4Rel}`);
