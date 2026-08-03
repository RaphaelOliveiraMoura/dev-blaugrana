// gen-run.mjs <baseSlug> [kitDesc] [numero] — folha 2x2 de CORRIDA (direção travada,
// inclinado pra frente, pernas E braços em passada), fundo magenta. Espelha gen-walk.
// Saída: saga-fut/personagens/<slug>/rigs/correr/_sheet.png. Prompt em config.mjs.
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

exigirPorta('gen-run.mjs', 'node scripts/asset.mjs correr <slug>');

const [, , SLUG, KIT = '', NUM = ''] = process.argv;
if (!SLUG) { console.error('uso: node gen-run.mjs <baseSlug> [kit] [numero]'); process.exit(1); }
// SEMPRE PRA DIREITA, como o gen-walk: correr pra esquerda é o motor espelhando. Ver personagem.mjs.
const DIR = 'right';
const OUTREL = `${dirRig(SLUG, 'correr')}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });

// MESMAS REFERÊNCIAS DAS FOLHAS DE AÇÃO: model sheet (proporção e TEXTURA DO CABELO em qualquer
// ângulo) + uma folha já aprovada do personagem (escala e cores exatas). Sem isso este rig saía de
// outra mão que as folhas de gesto, e na tela o cabelo mudava de textura quando o personagem
// trocava de animação.
const _model = caminhoModelSheet(SLUG);
const _temModel = existsSync(_model);
const _dirs = await readdir(path.join(CONTEUDO, `personagens/${SLUG}/acoes`)).catch(() => []);
const _anterior = _dirs.map((d) => path.join(CONTEUDO, `personagens/${SLUG}/acoes/${d}/_sheet.png`)).find((p) => existsSync(p)) || null;
const _refs = [basePersonagem(SLUG)];
if (_temModel) _refs.push(_model);
if (_anterior) _refs.push(_anterior);
// FOLHA DE REFERÊNCIA DE POSE: a melhor correr do acervo entra como exemplo do que copiar. É o
// que resolveu "uma perna fica parada e a outra só dobra o joelho", que nenhuma régua pegava
// (ver referencia.mjs). Nunca é o próprio personagem: copiar a si mesmo não ensina nada.
const { referenciaDePose, ajusteDeTipo } = await import('./referencia.mjs');
const _refPose = referenciaDePose('correr', SLUG);
const _poseAbs = _refPose ? path.join(CONTEUDO, `personagens/${_refPose.slug}/rigs/${_refPose.tipo}/_sheet.png`) : null;
const _ajuste = _refPose ? [ajusteDeTipo(_refPose.tipo, 'correr'), _refPose.ajuste].filter(Boolean).join(' ') : '';
const _temPose = _poseAbs && existsSync(_poseAbs);
if (_temPose) _refs.push(_poseAbs);
_refs.push(ESTILO_PATH);
console.log(`   refs: base${_temModel ? ' + model sheet' : ''}${_anterior ? ' + folha anterior' : ''}${_temPose ? ` + POSE de ${_refPose.slug}/${_refPose.tipo}` : ''} + estilo`);
const prompt = await promptSheet('run', OUTREL, { kit: KIT, num: NUM, modelSheet: _temModel, folhaAnterior: !!_anterior, poseRef: _temPose ? _refs.length - 1 : 0, ajustePose: _ajuste });
console.log('>>> run', SLUG); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 900000 });
console.log('OK run', SLUG, Math.round((Date.now() - t0) / 1000) + 's');

// direção declarada junto da folha; hoje é sempre 'right' (ver personagem.mjs)
await writeFile(path.join(CONTEUDO, rigMeta(SLUG, 'correr')), JSON.stringify({ slug: SLUG, tipo: 'correr', dir: DIR }, null, 2) + '\n');
