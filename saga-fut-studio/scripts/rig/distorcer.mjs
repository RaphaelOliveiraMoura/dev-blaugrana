// distorcer.mjs <slug> [--efeito=riso] — VIDA NA SPRITE, SEM RECORTAR NADA.
//
// A sprite entra inteira, do jeito que está no acervo, e sai deformada. Nenhum corte, nenhuma peça,
// nenhuma cabeça substituída: é impossível abrir emenda porque não existe junta.
//
// POR QUE ESTE ARQUIVO EXISTE SEPARADO: a versão anterior misturava DUAS coisas independentes —
// deformar a arte e trocar a expressão. Só a segunda precisa mexer na cabeça, e foi ela que trouxe
// o recorte, o pescoço mal detectado e a cabeça dupla. Misturadas, o problema de uma contaminava a
// outra. Separadas, esta aqui não tem como falhar: é a arte original, lida torto.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CONTEUDO, CANVAS_W, CANVAS_H } from '../sprites/config.mjs';
import { dirRig, prefixoRig } from '../../shared/personagem.mjs';
import { deformar, EFEITOS, EFEITOS_IDS, EFEITOS_FORTES } from './warp.mjs';

const SLUG = process.argv[2];
const flag = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
if (!SLUG) { console.error(`uso: node distorcer.mjs <slug> [--efeito=riso]   (${EFEITOS_IDS.join(', ')})`); process.exit(1); }

const corpoAbs = [
  path.join(CONTEUDO, dirRig(SLUG, 'idle', false), `${prefixoRig('idle', false)}1.png`),
  path.join(CONTEUDO, `personagens/${SLUG}/poses/parado.png`),
].find((p) => existsSync(p));
if (!corpoAbs) { console.error(`FAIL "${SLUG}" não tem sprite parada.`); process.exit(1); }

const FPS = 30, FUNDO = '#20252b';
const sprite = await sharp(corpoAbs).png().toBuffer();

// A CENA: cada trecho é um efeito com o seu tempo. Entre eles, HOLD sem efeito nenhum — é o
// contraste entre parado e vivo que faz o timing ler, não a quantidade de movimento.
const CENA = [
  { efeito: 'respirar', dur: 60, periodo: 90 },
  { efeito: 'riso', dur: 75, periodo: 40 },
  { efeito: 'respirar', dur: 30, periodo: 90 },
  { efeito: 'gelatina', dur: 24, periodo: 24 },
  { efeito: 'tremor', dur: 36, periodo: 20 },
  { efeito: 'bufando', dur: 66, periodo: 46 },
  { efeito: 'respirar', dur: 40, periodo: 90 },
];
// `--todos` roda o catálogo inteiro em sequência, cada efeito com o tempo em que ele lê. Os fortes
// são ATUAÇÃO: entram, são vistos e saem, então ganham menos tempo que os de vida de fundo.
const TODOS = EFEITOS_IDS.map((id) => ({
  efeito: id,
  dur: EFEITOS_FORTES.includes(id) ? 45 : 60,
  periodo: { respirar: 90, riso: 40, 'riso-forte': 34, bufando: 46, medo: 26, raiva: 40, espanto: 30, derretendo: 45, chicote: 26, balanco: 40, gelatina: 24, tremor: 20 }[id] || 36,
}));
const SO = flag('efeito');
const cena = process.argv.includes('--todos') ? TODOS
  : SO ? [{ efeito: SO, dur: 90, periodo: 40 }] : CENA;
for (const c of cena) if (!EFEITOS[c.efeito]) { console.error(`efeito "${c.efeito}" não existe (${EFEITOS_IDS.join(', ')})`); process.exit(1); }

const tmp = path.join(CONTEUDO, `personagens/${SLUG}/_distorce`);
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

let f = 0;
for (const passo of cena) {
  for (let i = 0; i < passo.dur; i++, f++) {
    // ENTRA E SAI SUAVE: a intensidade sobe e desce nas pontas do trecho. Efeito que liga de uma
    // vez denuncia o truque — parece corte, não movimento.
    const rampa = Math.min(1, i / 8, (passo.dur - i) / 8);
    const t = (i % passo.periodo) / passo.periodo;
    const png = await deformar(sprite, passo.efeito, t, { intensidade: rampa });
    const frame = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 3, background: FUNDO } })
      .composite([{ input: png }]).png().toBuffer();
    await writeFile(path.join(tmp, `f${String(f).padStart(4, '0')}.png`), frame);
  }
}

const mp4Rel = `personagens/${SLUG}/_distorce.mp4`;
await new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(CONTEUDO, mp4Rel)], { stdio: 'ignore' });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu ' + c))));
});
await rm(tmp, { recursive: true, force: true });
console.log(`OK distorção (${f} frames, ${(f / FPS).toFixed(1)}s, sem recorte nenhum) -> ${mp4Rel}`);
