// gen-cenario.mjs <videoId> <nome> <descrição> [formato] — gera um CENÁRIO (fundo full-frame,
// SEM personagens, chão aberto embaixo) no contrato de config.mjs. Ref = só o estilo.
// Saída: saga-fut/videos/<videoId>/cenario/<nome>.png (o composer referencia como cenario-<nome>.png).
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, promptCenario } from './config.mjs';

const [, , VIDEOID, NOME, DESC, FORMATO = '3:4'] = process.argv;
if (!VIDEOID || !NOME || !DESC) {
  console.error('uso: node gen-cenario.mjs <videoId> <nome> "<descrição>" [formato]'); process.exit(1);
}
const OUTREL = `videos/${VIDEOID}/cenario/${NOME}.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptCenario(OUTREL, DESC, { formato: FORMATO });
console.log('>>> cenario', NOME); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK cenario', NOME, Math.round((Date.now() - t0) / 1000) + 's');
