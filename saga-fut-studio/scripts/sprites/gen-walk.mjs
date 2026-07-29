// gen-walk.mjs <baseSlug> [kit] [numero] [dir=right|left] [nota] [refRel]
// Folha 2x2 de CAMINHADA (direção travada, só as pernas mudam), fundo magenta. Prompt em config.mjs.
// dir='left' gera JÁ virado pra esquerda (use pra personagem COM número, que não pode flipar).
// nota = jeito de andar (ex.: "on tiptoe, sneaking, hunched"). refRel = ref alternativa (ex.: um
// sprite disfarçado) em vez da caricatura-base. Saída: saga-fut/rigs/andar/<baseSlug>/_sheet.png
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptSheet } from './config.mjs';

const [, , SLUG, KIT = '', NUM = '', DIR = 'right', NOTA = '', REFREL] = process.argv;
if (!SLUG) { console.error('uso: node gen-walk.mjs <baseSlug> [kit] [num] [dir] [nota] [refRel]'); process.exit(1); }
// REGRA ANTI-ORIENTAÇÃO-QUEBRADA: o modelo às vezes desenha a folha `dir=left` com a CABEÇA virada
// pro lado oposto das PERNAS (olha pra trás), e nenhum flip conserta isso. Por isso, `dir=left` só se
// justifica pra JOGADOR COM NÚMERO (que não pode espelhar, senão o número inverte) e SEMPRE precisa de
// conferência visual da folha. Todo o resto: gere `dir=right` (perfil natural, coerente) e deixe o
// montar-cena espelhar por código (scaleX -1) — aí cabeça+pernas viram JUNTAS, impossível divergir.
if (DIR === 'left' && !NUM) {
  console.warn('\n[gen-walk] ⚠️  dir=left SEM número. Personagem sem número deve andar pra ESQUERDA por');
  console.warn('           flip de código (gere dir=right). dir=left costuma sair com a cabeça pro lado');
  console.warn('           errado das pernas. Se for jogador numerado, passe o número. CONFIRA a folha.\n');
}
const OUTREL = `rigs/andar/${SLUG}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
const ref = REFREL ? path.join(CONTEUDO, REFREL) : basePersonagem(SLUG);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptSheet('walk', OUTREL, { kit: KIT, num: NUM, dir: DIR, nota: NOTA });
console.log('>>> walk', SLUG, DIR); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: [ref, ESTILO_PATH], outAbs, timeoutMs: 600000 });
console.log('OK walk', SLUG, Math.round((Date.now() - t0) / 1000) + 's');
