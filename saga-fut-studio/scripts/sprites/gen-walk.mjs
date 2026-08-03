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
import { readdir } from 'node:fs/promises';
import { caminhoModelSheet } from './contratos.mjs';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptSheet } from './config.mjs';
import { exigirPorta } from './porta.mjs';
import { dirRig, rigMeta } from '../../shared/personagem.mjs';
import { writeFile } from 'node:fs/promises';

exigirPorta('gen-walk.mjs', 'node scripts/asset.mjs andar <slug>');

const [, , SLUG, KIT = '', NUM = '', NOTA = '', REFREL] = process.argv;
if (!SLUG) { console.error('uso: node gen-walk.mjs <baseSlug> [kit] [num] [nota] [refRel]'); process.exit(1); }
const DIR = 'right';
const OUTREL = `${dirRig(SLUG, 'andar')}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
const ref = REFREL ? path.join(CONTEUDO, REFREL) : basePersonagem(SLUG);
await mkdir(path.dirname(outAbs), { recursive: true });

// MESMAS REFERÊNCIAS DAS FOLHAS DE AÇÃO: model sheet (proporção e TEXTURA DO CABELO em qualquer
// ângulo) + uma folha já aprovada do personagem (escala e cores exatas). Sem isso este rig saía de
// outra mão que as folhas de gesto, e na tela o cabelo mudava de textura quando o personagem
// trocava de animação.
const _model = caminhoModelSheet(SLUG);
const _temModel = existsSync(_model);
const _dirs = await readdir(path.join(CONTEUDO, `personagens/${SLUG}/acoes`)).catch(() => []);
const _anterior = _dirs.map((d) => path.join(CONTEUDO, `personagens/${SLUG}/acoes/${d}/_sheet.png`)).find((p) => existsSync(p)) || null;
const _refs = [ref];
if (_temModel) _refs.push(_model);
if (_anterior) _refs.push(_anterior);
// FOLHA DE REFERÊNCIA DE POSE: a melhor andar do acervo entra como exemplo do que copiar. É o
// que resolveu "uma perna fica parada e a outra só dobra o joelho", que nenhuma régua pegava
// (ver referencia.mjs). Nunca é o próprio personagem: copiar a si mesmo não ensina nada.
const { referenciaDePose, ajusteDeTipo } = await import('./referencia.mjs');
const _refPose = referenciaDePose('andar', SLUG);
const _poseAbs = _refPose ? path.join(CONTEUDO, `personagens/${_refPose.slug}/rigs/${_refPose.tipo}/_sheet.png`) : null;
const _ajuste = _refPose ? ajusteDeTipo(_refPose.tipo, 'andar') : '';
const _temPose = _poseAbs && existsSync(_poseAbs);
if (_temPose) _refs.push(_poseAbs);
_refs.push(ESTILO_PATH);
console.log(`   refs: base${_temModel ? ' + model sheet' : ''}${_anterior ? ' + folha anterior' : ''}${_temPose ? ` + POSE de ${_refPose.slug}/${_refPose.tipo}` : ''} + estilo`);
const prompt = await promptSheet('walk', OUTREL, { kit: KIT, num: NUM, dir: DIR, nota: NOTA, modelSheet: _temModel, folhaAnterior: !!_anterior, poseRef: _temPose ? _refs.length - 1 : 0, ajustePose: _ajuste });
console.log('>>> walk', SLUG, DIR); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 600000 });
console.log('OK walk', SLUG, Math.round((Date.now() - t0) / 1000) + 's');

// A direção continua gravada, mas agora é sempre a mesma: toda folha olha pra direita, e é o motor
// que espelha. Fica no _meta porque o composer e o cartão leem daqui, não porque haja escolha.
await writeFile(path.join(CONTEUDO, rigMeta(SLUG, 'andar')), JSON.stringify({ slug: SLUG, tipo: 'andar', dir: DIR }, null, 2) + '\n');
