// gen-pose.mjs <baseSlug> <videoId> <nome> <desc>
// Gera UMA pose/ação em fundo magenta (ref = a caricatura-base do personagem).
// Saída: saga-fut/videos/<videoId>/sheets/<nome>.png. Prompt vem do contrato em config.mjs.
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptPose } from './config.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-pose.mjs', 'node scripts/asset.mjs folha <slug> <nome> --classe=secundaria --muda="..."');

const [, , BASESLUG, VIDEOID, NOME, DESC] = process.argv;
if (!BASESLUG || !VIDEOID || !NOME || !DESC) {
  console.error('uso: node gen-pose.mjs <baseSlug> <videoId> <nome> "<descrição>"'); process.exit(1);
}
const OUTREL = `videos/${VIDEOID}/sheets/${NOME}.png`, outAbs = path.join(CONTEUDO, OUTREL);
const BASE = basePersonagem(BASESLUG);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptPose(OUTREL, DESC);
console.log('>>>', NOME); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [BASE, ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK', NOME, Math.round((Date.now() - t0) / 1000) + 's');
