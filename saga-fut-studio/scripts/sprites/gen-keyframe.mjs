// gen-keyframe.mjs <videoId> <nome> <desc> <slug1[,slug2,...]> [formato]
// KEYFRAME COMPOSTO: personagens + cenário no MESMO render (staging correto de graça), full-frame
// COM fundo. Pros beats de INTERAÇÃO apertada (sentar numa cadeira, agarrar o topo do muro, um pegar
// o outro). Saída em videos/<id>/cenario/<nome>.png -> o roteiro usa como `cenario` (bg cheio do beat).
// refs = as caricaturas-base dos personagens (na ordem) + o estilo.
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptKeyframe } from './config.mjs';

const [, , VIDEOID, NOME, DESC, REFS, FORMATO = '3:4'] = process.argv;
if (!VIDEOID || !NOME || !DESC || !REFS) {
  console.error('uso: node gen-keyframe.mjs <videoId> <nome> "<desc>" <slug1[,slug2,...]> [formato]'); process.exit(1);
}
const slugs = REFS.split(',').map((s) => s.trim()).filter(Boolean);
const OUTREL = `videos/${VIDEOID}/cenario/${NOME}.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const referencias = [...slugs.map(basePersonagem), ESTILO_PATH];
const prompt = await promptKeyframe(OUTREL, DESC, { formato: FORMATO, refs: slugs.length });
console.log('>>> keyframe', NOME, 'refs:', slugs.join(',')); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias, outAbs, timeoutMs: 600000 });
console.log('OK keyframe', NOME, Math.round((Date.now() - t0) / 1000) + 's');
