// gen-react.mjs <slug> <emocao> <descrição> — pose de REAÇÃO reutilizável (fundo magenta),
// na biblioteca personagens/<slug>/poses/<emocao>.png. Mesmo contrato de pose (config.promptPose),
// mas o destino é a biblioteca (reusa entre vídeos, igual andar/correr). Prefira nomes do
// REACTION_VOCAB (comemorar, bravo, rindo, ...). Depois: slice-pose -> mesmo arquivo/kf do vídeo.
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptPose, REACTION_VOCAB } from './config.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-react.mjs', 'node scripts/asset.mjs folha <slug> <emocao> --classe=secundaria --muda="..."');

const [, , SLUG, EMO, DESC, FLAG] = process.argv;
if (!SLUG || !EMO || !DESC) {
  console.error('uso: node gen-react.mjs <slug> <emocao> "<descrição>" [movel]');
  console.error('vocabulário sugerido:', REACTION_VOCAB.join(', ')); process.exit(1);
}
if (!REACTION_VOCAB.includes(EMO)) console.warn(`aviso: "${EMO}" fora do vocabulário (${REACTION_VOCAB.join(', ')}) — ok, mas padronize se der.`);
const movel = FLAG === 'movel'; // embute o móvel (cadeira/cama) que o personagem senta/deita
const OUTREL = `personagens/${SLUG}/poses/${EMO}.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptPose(OUTREL, DESC, { movel });
console.log('>>> react', SLUG, EMO); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [basePersonagem(SLUG), ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK react', SLUG, EMO, Math.round((Date.now() - t0) / 1000) + 's');
