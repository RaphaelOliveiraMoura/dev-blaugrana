// gen-run.mjs <baseSlug> [kitDesc] [numero] — folha 2x2 de CORRIDA (direção travada,
// inclinado pra frente, pernas E braços em passada), fundo magenta. Espelha gen-walk.
// Saída: saga-fut/personagens/<slug>/rigs/correr/_sheet.png. Prompt em config.mjs.
import { generateImage } from '../../server/providers/codex-image.mjs';
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

const [, , SLUG, KIT = '', NUM = '', DIR = 'right'] = process.argv;
if (!SLUG) { console.error('uso: node gen-run.mjs <baseSlug> [kit] [numero] [dir]'); process.exit(1); }
// `dir` era IGNORADO aqui (a assinatura parava em [numero]), então pedir corrida pra esquerda saía
// pra direita em silêncio. Mesma regra do gen-walk: esquerda só se justifica pra numerado.
if (DIR === 'left' && !NUM) {
  console.warn('\n[gen-run] ⚠️  dir=left SEM número: personagem sem número corre pra esquerda por FLIP');
  console.warn('          de código (gere dir=right). CONFIRA a folha se seguir mesmo assim.\n');
}
const ESQ = DIR === 'left';
const OUTREL = `${dirRig(SLUG, 'correr', ESQ)}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
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
_refs.push(ESTILO_PATH);
if (_temModel || _anterior) console.log(`   refs: base${_temModel ? ' + model sheet' : ''}${_anterior ? ' + folha anterior' : ''} + estilo`);
const prompt = await promptSheet('run', OUTREL, { kit: KIT, num: NUM, modelSheet: _temModel, folhaAnterior: !!_anterior });
console.log('>>> run', SLUG); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 900000 });
console.log('OK run', SLUG, Math.round((Date.now() - t0) / 1000) + 's');

// direção declarada junto da folha (ver INV-4 em server/video/invariantes.mjs)
await writeFile(path.join(CONTEUDO, rigMeta(SLUG, 'correr', ESQ)), JSON.stringify({ slug: SLUG, tipo: 'correr', esq: ESQ, dir: DIR }, null, 2) + '\n');
