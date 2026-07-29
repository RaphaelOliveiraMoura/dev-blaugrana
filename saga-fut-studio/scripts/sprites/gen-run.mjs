// gen-run.mjs <baseSlug> [kitDesc] [numero] — folha 2x2 de CORRIDA (direção travada,
// inclinado pra frente, pernas E braços em passada), fundo magenta. Espelha gen-walk.
// Saída: saga-fut/rigs/correr/<baseSlug>/_sheet.png. Prompt em config.mjs.
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptSheet } from './config.mjs';

const [, , SLUG, KIT = '', NUM = ''] = process.argv;
if (!SLUG) { console.error('uso: node gen-run.mjs <baseSlug> [kit] [numero]'); process.exit(1); }
const OUTREL = `rigs/correr/${SLUG}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptSheet('run', OUTREL, { kit: KIT, num: NUM });
console.log('>>> run', SLUG); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [basePersonagem(SLUG), ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK run', SLUG, Math.round((Date.now() - t0) / 1000) + 's');
