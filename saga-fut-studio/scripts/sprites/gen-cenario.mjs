// gen-cenario.mjs <videoId> <nome> <descrição> [formato] [--panoramico] [--camada=frente]
// Gera um CENÁRIO (fundo full-frame, SEM personagens, chão aberto embaixo) no contrato de
// config.mjs. Ref = só o estilo.
// Saída: saga-fut/videos/<videoId>/cenario/<nome>.png (o composer referencia como cenario-<nome>.png).
//
// --panoramico: cenário LARGO (formato 3:2), um MUNDO maior que o quadro pra a câmera navegar
//   dentro dele. Um render só rende 3 ou 4 enquadramentos diferentes, então sai mais barato E mais
//   consistente que gerar um cenário por cena (cada geração nova diverge de estilo).
// --camada=frente: SÓ os elementos de primeiro plano, em MAGENTA. Vai pra cenario/_raw/<nome>.png
//   e o key-camada.mjs converte em PNG transparente. É o que dá parallax de verdade no pan.
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, promptCenario } from './config.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-cenario.mjs', 'node scripts/asset.mjs video <id>  (o cenário vem do manifesto)');

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const pos = args.filter((a) => !a.startsWith('--'));
const [VIDEOID, NOME, DESC, FORMATO_ARG] = pos;
const PANORAMICO = flags.includes('--panoramico');
const CAMADA = (flags.find((f) => f.startsWith('--camada=')) || '').split('=')[1] || null;
if (!VIDEOID || !NOME || !DESC) {
  console.error('uso: node gen-cenario.mjs <videoId> <nome> "<descrição>" [formato] [--panoramico] [--camada=frente]');
  process.exit(1);
}
if (CAMADA && CAMADA !== 'frente') { console.error(`--camada só aceita "frente" (recebi "${CAMADA}")`); process.exit(1); }

// Panorâmico = 3:2, o mais largo que o gpt-image-2 entrega (1536x1024). Num vídeo 9:16 isso dá
// ~2,7 larguras de tela de mundo, espaço pra 3 ou 4 enquadramentos distintos.
const FORMATO = FORMATO_ARG || (PANORAMICO ? '3:2' : '3:4');
// camada de frente vai pro _raw (magenta cru); o key-camada escreve o PNG transparente final.
const OUTREL = CAMADA
  ? `videos/${VIDEOID}/cenario/_raw/${NOME}.png`
  : `videos/${VIDEOID}/cenario/${NOME}.png`;
const outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptCenario(OUTREL, DESC, { formato: FORMATO, panoramico: PANORAMICO, camada: CAMADA });
console.log('>>> cenario', NOME, FORMATO, PANORAMICO ? '(panorâmico)' : '', CAMADA ? `(camada ${CAMADA})` : '');
const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK cenario', NOME, Math.round((Date.now() - t0) / 1000) + 's');
if (CAMADA) console.log(`próximo passo: node key-camada.mjs ${VIDEOID} ${NOME}`);
