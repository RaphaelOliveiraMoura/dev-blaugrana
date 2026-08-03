// gen-run.mjs <baseSlug> [kitDesc] [numero] — folha 2x2 de CORRIDA (direção travada,
// inclinado pra frente, pernas E braços em passada), fundo magenta. Espelha gen-walk.
// Saída: saga-fut/personagens/<slug>/rigs/correr/_sheet.png. Prompt em config.mjs.
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, promptSheet } from './config.mjs';
import { duasReferencias, ajusteDeTipo } from './referencia.mjs';
import { exigirPorta } from './porta.mjs';
import { dirRig, rigMeta } from '../../shared/personagem.mjs';
import { writeFile } from 'node:fs/promises';

exigirPorta('gen-run.mjs', 'node scripts/asset.mjs correr <slug>');

const [, , SLUG, KIT = '', NUM = ''] = process.argv;
if (!SLUG) { console.error('uso: node gen-run.mjs <baseSlug> [kit] [numero]'); process.exit(1); }
// SEMPRE PRA DIREITA, como o gen-walk: correr pra esquerda é o motor espelhando. Ver personagem.mjs.
const DIR = 'right';
const OUTREL = `${dirRig(SLUG, 'correr')}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

// DUAS REFERÊNCIAS: a corrida do personagem-padrão + este personagem (ver referencia.mjs).
const _existe = (rel) => existsSync(path.join(CONTEUDO, rel));
const { refs: _rel, poseDe, identidadeEh, ajuste: _ajusteRef } = duasReferencias('correr', SLUG, _existe);
const _refs = _rel.map((r) => path.join(CONTEUDO, r));
const _temPose = !!poseDe;
const _ajuste = [_temPose ? ajusteDeTipo(poseDe.tipo, 'correr') : '', _ajusteRef].filter(Boolean).join(' ');
console.log(`   refs: ${_temPose ? `POSE de ${poseDe.slug}/${poseDe.tipo} + ` : ''}${identidadeEh} de ${SLUG}`);
const prompt = await promptSheet('run', OUTREL, { kit: KIT, num: NUM, temPose: _temPose, ajustePose: _ajuste });
console.log('>>> run', SLUG); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 900000 });
console.log('OK run', SLUG, Math.round((Date.now() - t0) / 1000) + 's');

// direção declarada junto da folha; hoje é sempre 'right' (ver personagem.mjs)
await writeFile(path.join(CONTEUDO, rigMeta(SLUG, 'correr')), JSON.stringify({ slug: SLUG, tipo: 'correr', dir: DIR }, null, 2) + '\n');
