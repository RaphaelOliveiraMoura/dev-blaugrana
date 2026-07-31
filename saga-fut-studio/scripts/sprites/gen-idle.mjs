// gen-idle.mjs <baseSlug> [kit] [numero] [dir=right|left] [nota] [refRel]
// Folha 2x2 de IDLE (respiração: ombros sobem/descem + uma piscada), fundo magenta.
// Irmã do gen-walk/gen-run. Prompt em config.mjs (promptIdle).
//
// POR QUE EXISTE: personagem parado era PNG ESTÁTICO na tela (o "cutout fantasma"). Esta é a
// biblioteca de melhor retorno do projeto: UM render por personagem passa a valer em TODO vídeo
// em que ele aparece, e o composer liga o ciclo sozinho quando encontra a sprite.
//
// dir='left' gera JÁ virado pra esquerda (personagem COM número, que não pode ser espelhado).
// Saída: saga-fut/rigs/idle/<baseSlug>/_sheet.png  (fatia com slice-idle.mjs)
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { caminhoModelSheet } from './contratos.mjs';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptIdle } from './config.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-idle.mjs', 'node scripts/asset.mjs idle <slug>');

const [, , SLUG, KIT = '', NUM = '', DIR = 'right', NOTA = '', REFREL] = process.argv;
if (!SLUG) { console.error('uso: node gen-idle.mjs <baseSlug> [kit] [num] [dir] [nota] [refRel]'); process.exit(1); }
// Mesma regra do gen-walk: `dir=left` só se justifica pra jogador COM número (espelhar inverteria
// o número). Sem número, gere `dir=right` e deixe o composer espelhar por código — aí cabeça e
// corpo viram JUNTOS, e nunca sai o idle olhando pro lado oposto do resto da cena.
if (DIR === 'left' && !NUM) {
  console.warn('\n[gen-idle] ⚠️  dir=left SEM número. Personagem sem número deve olhar pra esquerda por');
  console.warn('           flip de código (gere dir=right). CONFIRA a folha se insistir.\n');
}
const OUTREL = `personagens/${SLUG}/rigs/idle/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
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
_refs.push(ESTILO_PATH);
if (_temModel || _anterior) console.log(`   refs: base${_temModel ? ' + model sheet' : ''}${_anterior ? ' + folha anterior' : ''} + estilo`);
const prompt = await promptIdle(OUTREL, { kit: KIT, num: NUM, dir: DIR, nota: NOTA, modelSheet: _temModel, folhaAnterior: !!_anterior });
console.log('>>> idle', SLUG, DIR); const t0 = Date.now();
await generateImage({ cwd: CONTEUDO, prompt, referencias: _refs, outAbs, timeoutMs: 600000 });
console.log('OK idle', SLUG, Math.round((Date.now() - t0) / 1000) + 's');
