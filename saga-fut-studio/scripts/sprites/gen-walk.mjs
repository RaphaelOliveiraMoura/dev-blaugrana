// gen-walk.mjs <baseSlug> [kit] [numero] [nota] [refRel]
// Folha 2x2 de CAMINHADA (direção travada, só as pernas mudam), fundo magenta. Prompt em config.mjs.
// SEMPRE PRA DIREITA: a folha é uma só, e andar pra esquerda é o motor espelhando (scaleX -1). Havia
// aqui um `dir=left` que gerava uma folha própria virada, pra não inverter o número da camisa; em
// 02/08/2026 ficou decidido que número invertido não é problema, e com isso o modo esquerda saiu
// junto com tudo que existia pra sustentá-lo. Espelhar por código vira cabeça e pernas JUNTAS, que
// era justamente o que a folha gerada errava de vez em quando.
// nota = jeito de andar (ex.: "on tiptoe, sneaking, hunched"). refRel = ref alternativa (ex.: um
// sprite disfarçado) em vez da caricatura-base. Saída: saga-fut/personagens/<slug>/rigs/andar/_sheet.png
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, promptSheet } from './config.mjs';
import { duasReferencias, ajusteDeTipo } from './referencia.mjs';
import { exigirPorta } from './porta.mjs';
import { dirRig, rigMeta } from '../../shared/personagem.mjs';
import { writeFile } from 'node:fs/promises';

exigirPorta('gen-walk.mjs', 'node scripts/asset.mjs andar <slug>');

const [, , SLUG, KIT = '', NUM = '', NOTA = '', REFREL] = process.argv;
if (!SLUG) { console.error('uso: node gen-walk.mjs <baseSlug> [kit] [num] [nota] [refRel]'); process.exit(1); }
const DIR = 'right';
const OUTREL = `${dirRig(SLUG, 'andar')}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

// DUAS REFERÊNCIAS: a caminhada do personagem-padrão (o que resolveu "uma perna fica parada e a
// outra só dobra o joelho", que nenhuma régua pegava) + este personagem. A montagem mora em
// referencia.mjs, que é onde está escrito por que são duas e não cinco.
const _existe = (rel) => existsSync(path.join(CONTEUDO, rel));
const { refs: _rel, poseDe, identidadeEh, ajuste: _ajusteRef } = duasReferencias('andar', SLUG, _existe, { identidade: REFREL || null });
const _refs = _rel.map((r) => path.join(CONTEUDO, r));
const _temPose = !!poseDe;
const _ajuste = [_temPose ? ajusteDeTipo(poseDe.tipo, 'andar') : '', _ajusteRef].filter(Boolean).join(' ');
console.log(`   refs: ${_temPose ? `POSE de ${poseDe.slug}/${poseDe.tipo} + ` : ''}${identidadeEh} de ${SLUG}`);
const prompt = await promptSheet('walk', OUTREL, { kit: KIT, num: NUM, dir: DIR, nota: NOTA, temPose: _temPose, ajustePose: _ajuste });
console.log('>>> walk', SLUG, DIR); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 600000 });
console.log('OK walk', SLUG, Math.round((Date.now() - t0) / 1000) + 's');

// A direção continua gravada, mas agora é sempre a mesma: toda folha olha pra direita, e é o motor
// que espelha. Fica no _meta porque o composer e o cartão leem daqui, não porque haja escolha.
await writeFile(path.join(CONTEUDO, rigMeta(SLUG, 'andar')), JSON.stringify({ slug: SLUG, tipo: 'andar', dir: DIR }, null, 2) + '\n');
