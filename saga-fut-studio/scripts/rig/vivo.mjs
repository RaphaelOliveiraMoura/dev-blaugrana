// vivo.mjs <slug> — ANIMAÇÃO LIMITADA no corpo INTEIRO. Sem peça, sem junta, sem emenda.
//
// É a versão que sobrou depois de o cutout por peças ser reprovado. O corpo é a sprite que já
// existe no acervo (um desenho só, exatamente como o artista fez), e a vida vem de três coisas:
//
//   TROCA DE ROSTO   a cabeça muda de desenho, em um frame, e segura.
//   DEFORMAÇÃO       a arte inteira comprime e balança (riso, respiração, tremor). Ver warp.mjs.
//   BEAT + HOLD      o corpo inclina/salta por poucos frames, e o resto do tempo fica IMÓVEL.
//
// O alinhamento do rosto não é chutado: mede-se o topo do crânio e a largura da cabeça na sprite
// (as mesmas medidas que o validador de sprite já usa) e a expressão entra exatamente ali.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { CONTEUDO, CANVAS_W, CANVAS_H } from '../sprites/config.mjs';
import { metaRosto, dirRosto } from '../../shared/rosto.mjs';
import { dirRig, prefixoRig } from '../../shared/personagem.mjs';
import { deformar, EFEITOS_IDS } from './warp.mjs';
import { encaixeDoRosto, corpoSemCabeca } from './encaixe.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error(`uso: node vivo.mjs <slug>   (efeitos: ${EFEITOS_IDS.join(', ')})`); process.exit(1); }
const FPS = 30, FUNDO = '#20252b';

// --- o corpo: a sprite inteira do acervo, sem cortar nada ---------------------------------------
const candidatos = [
  path.join(CONTEUDO, dirRig(SLUG, 'idle', false), `${prefixoRig('idle', false)}1.png`),
  path.join(CONTEUDO, `personagens/${SLUG}/poses/parado.png`),
];
const corpoAbs = candidatos.find((p) => existsSync(p));
if (!corpoAbs) { console.error(`FAIL "${SLUG}" não tem sprite de corpo (idle). -> node scripts/asset.mjs idle ${SLUG}`); process.exit(1); }

const rosto = JSON.parse(await readFile(path.join(CONTEUDO, metaRosto(SLUG)), 'utf8'));

// --- onde a cabeça está, MEDIDA nas duas imagens ------------------------------------------------
// A expressão precisa cobrir a cabeça desenhada, e o encaixe é medido, nunca chutado: casa a
// LARGURA da cabeça e o TOPO DO CRÂNIO, dois pontos que a expressão não muda.
const enc = await encaixeDoRosto(corpoAbs, path.join(CONTEUDO, rosto.expressoes.neutro.arquivo));
console.log(`   cabeça: ${enc.larguraCabecaCorpo}px no corpo, ${enc.larguraCabecaRosto}px na folha · escala ${enc.k.toFixed(2)}`);
const k = enc.k, rostoLeft = enc.left, rostoTop = enc.top;

// --- a cena: onde a maioria dos instantes é HOLD -------------------------------------------------
const CENA = [
  { hold: 30, exp: 'neutro', efeito: 'respirar' },
  { hold: 4, exp: 'piscando', efeito: 'respirar' },
  { hold: 24, exp: 'neutro', efeito: 'respirar' },
  { hold: 26, exp: 'sobrancelha', efeito: 'respirar', beat: { tipo: 'inclina', graus: -3 } },
  { hold: 4, exp: 'choque', efeito: 'gelatina', beat: { tipo: 'tranco', px: 16 } },
  { hold: 30, exp: 'choque', efeito: 'tremor' },
  { hold: 40, exp: 'bravo', efeito: 'bufando', beat: { tipo: 'squash', k: 0.93 } },
  { hold: 60, exp: 'rindo', efeito: 'riso' },
  { hold: 24, exp: 'sorriso', efeito: 'respirar' },
];

const dirAbs = path.join(CONTEUDO, dirRosto(SLUG));
const tmp = path.join(dirAbs, '_frames');
await rm(tmp, { recursive: true, force: true });
await mkdir(tmp, { recursive: true });

// O CORPO VAI SEM CABEÇA. Colar a expressão por cima da sprite inteira deixa a cabeça original
// embaixo, e como a nova é desenhada um pouco diferente a antiga aparece por trás: o personagem
// fica com DUAS cabeças. Trocar de cabeça só funciona se a antiga deixar de existir.
const semCabeca = await corpoSemCabeca(corpoAbs);
const corpoPNG = semCabeca.png;
console.log(`   pescoço em y=${semCabeca.pescoco.y} (largura ${semCabeca.pescoco.largura}), corte em ${semCabeca.corte}`);
const rw = Math.round(rosto.w * k), rh = Math.round(rosto.h * k);
const cortaTopo = Math.max(0, -rostoTop);
const rostoTopUsado = Math.max(0, rostoTop);
const cacheRosto = {};
for (const id of Object.keys(rosto.expressoes)) {
  const cheio = await sharp(path.join(CONTEUDO, rosto.expressoes[id].arquivo)).resize(rw, rh).png().toBuffer();
  // a cabeça pode passar do topo do canvas: recorta o que sobra em vez de estourar o composite
  cacheRosto[id] = cortaTopo ? await sharp(cheio).extract({ left: 0, top: cortaTopo, width: rw, height: rh - cortaTopo }).png().toBuffer() : cheio;
}

let f = 0, tEfeito = 0;
for (const passo of CENA) {
  for (let i = 0; i < passo.hold; i++, f++, tEfeito++) {
    // 1) monta o personagem: corpo + expressão por cima, alinhados pelo crânio
    const montado = await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: corpoPNG }, { input: cacheRosto[passo.exp], left: rostoLeft, top: rostoTopUsado }])
      .png().toBuffer();

    // 2) DEFORMA o conjunto inteiro. Como é um desenho só, não há junta pra abrir.
    const periodo = passo.efeito === 'respirar' ? 90 : passo.efeito === 'riso' ? 40 : 30;
    const vivo = await deformar(montado, passo.efeito, (tEfeito % periodo) / periodo);

    // 3) BEAT: pontua a troca e some em ~6 frames. Beat que dura vira balanço.
    const u = passo.beat ? Math.max(0, 1 - i / 6) : 0;
    const b = passo.beat || {};
    const dy = b.tipo === 'tranco' ? u * (b.px || 12) : 0;
    const dx = b.tipo === 'tranco' ? -u * (b.px || 12) : 0;
    const rot = b.tipo === 'inclina' ? u * (b.graus || -3) : 0;
    const sy = b.tipo === 'squash' ? 1 - (1 - (b.k || 0.93)) * u : 1;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
      <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${FUNDO}"/>
      <g transform="translate(${CANVAS_W / 2 + dx},${CANVAS_H + dy}) rotate(${rot}) scale(1,${sy}) translate(${-CANVAS_W / 2},${-CANVAS_H})">
        <image href="data:image/png;base64,${vivo.toString('base64')}" x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}"/>
      </g></svg>`;
    await writeFile(path.join(tmp, `f${String(f).padStart(4, '0')}.png`), await sharp(Buffer.from(svg)).png().toBuffer());
  }
}

const mp4Rel = `${dirRosto(SLUG)}/_vivo.mp4`;
await new Promise((res, rej) => {
  const p = spawn('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(CONTEUDO, mp4Rel)], { stdio: 'ignore' });
  p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu ' + c))));
});
await rm(tmp, { recursive: true, force: true });
console.log(`OK vivo (${f} frames, ${(f / FPS).toFixed(1)}s) -> ${mp4Rel}`);
