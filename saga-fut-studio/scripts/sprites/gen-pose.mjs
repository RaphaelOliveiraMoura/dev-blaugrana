// gen-pose.mjs <baseSlug> <videoId> <nome> <desc>
// Gera UMA pose/ação em fundo magenta (ref = a caricatura-base do personagem).
// Saída: saga-fut/videos/<videoId>/sheets/<nome>.png. Prompt vem do contrato em config.mjs.
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, promptPose } from './config.mjs';
import { duasReferencias } from './referencia.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-pose.mjs', 'node scripts/asset.mjs folha <slug> <nome> --classe=secundaria --muda="..."');

const [, , BASESLUG, VIDEOID, NOME, DESC] = process.argv;
if (!BASESLUG || !VIDEOID || !NOME || !DESC) {
  console.error('uso: node gen-pose.mjs <baseSlug> <videoId> <nome> "<descrição>"'); process.exit(1);
}
const OUTREL = `videos/${VIDEOID}/sheets/${NOME}.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
// MESMO PAR DO RESTO DA CASA. A pose é o caso em que a referência do padrão nem sempre existe: o
// nome aqui é livre (um beat de um vídeo), então só há folha correspondente quando por acaso for um
// gesto do catálogo. Quando não há, a geração segue com a identidade sozinha, declarando isso.
const _existe = (rel) => existsSync(path.join(CONTEUDO, rel));
const { refs: _rel, poseDe, identidadeEh } = duasReferencias(NOME, BASESLUG, _existe);
const referencias = _rel.map((r) => path.join(CONTEUDO, r));
const prompt = await promptPose(OUTREL, DESC, { temPose: !!poseDe });
console.log('>>>', NOME, `· refs: ${poseDe ? `POSE de ${poseDe.slug}/${NOME} + ` : ''}${identidadeEh} de ${BASESLUG}`); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias, outAbs, timeoutMs: 600000 });
console.log('OK', NOME, Math.round((Date.now() - t0) / 1000) + 's');
