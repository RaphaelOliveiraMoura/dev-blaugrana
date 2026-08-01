// gen-estilo.mjs <slug> <estilo> ["<cena>"] — ESTUDO DE ESTILO: o personagem que já existe,
// redesenhado em outra linguagem visual, na MESMA cena de prova.
//
// Não entra em vídeo e não entra na ficha do personagem: grava em `estilos/testes/`, que é área de
// avaliação. É de propósito — enquanto o estilo não foi escolhido, o resultado não é asset, é
// amostra. Asset de verdade continua nascendo por `asset personagem/model-sheet/folha`.
//
// A IDENTIDADE é a única coisa que NÃO muda entre os candidatos: a caricatura-base entra como
// referência de alta fidelidade e o prompt trava rosto, cabelo, cor do kit e NÚMERO. Sem isso o
// teste vira "qual desenho é mais bonito" em vez de "o meu elenco fica bom neste estilo".
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { CONTEUDO, basePersonagem } from './config.mjs';
import { exigirPorta } from './porta.mjs';
import { ESTILOS_TESTE, ESTILOS_TESTE_IDS, CENA_PROVA, arquivoTeste } from './estilos.mjs';

exigirPorta('gen-estilo.mjs', 'node scripts/asset.mjs estilo <slug> --como=<estilo>');

const [, , SLUG, ESTILO, CENA_ARG] = process.argv;
if (!SLUG || !ESTILO) { console.error('uso: node gen-estilo.mjs <slug> <estilo> ["<cena>"]'); process.exit(1); }
const est = ESTILOS_TESTE[ESTILO];
if (!est) { console.error(`estilo "${ESTILO}" não existe (${ESTILOS_TESTE_IDS.join(' | ')})`); process.exit(1); }

const baseAbs = basePersonagem(SLUG);
if (!existsSync(baseAbs)) { console.error(`FAIL "${SLUG}" não tem base.png — o estudo parte da caricatura que já existe.`); process.exit(1); }

const OUTREL = arquivoTeste(SLUG, ESTILO);
const outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

const cena = CENA_ARG || CENA_PROVA;
const prompt = `Use your built-in image generation tool (gpt-image-2) to create ONE image and save it as a PNG at exactly this relative path inside the current workspace: ${OUTREL}
You are given 1 input image, pass it to the image tool as INPUT IMAGE with HIGH input fidelity: it is THE SAME CHARACTER already drawn in another style.
Tall VERTICAL composition (3:4).

IMAGE PROMPT:
${est.prompt}

SUBJECT: ${cena}

IDENTITY LOCK — this must remain the same person as the input image, only the DRAWING STYLE changes:
same face shape and features, same skin tone, same hair shape and colour, same facial hair, same
body proportions, same kit colours and pattern, and the SAME SHIRT NUMBER clearly visible on the
chest. Do not restyle him into a different person and do not change his kit.

NO text, NO captions, NO labels, NO watermark, NO logos, NO team crests, NO borders or frames.`;

console.log(`>>> estilo ${SLUG} / ${ESTILO} (${est.rotulo})`);
const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [baseAbs], outAbs, timeoutMs: 600000 });
console.log(`OK estilo ${SLUG}/${ESTILO}`, Math.round((Date.now() - t0) / 1000) + 's ->', OUTREL);
