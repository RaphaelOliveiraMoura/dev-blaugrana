// gen-acao.mjs <baseSlug> <nome> <descrição> <fase1|fase2|...> [travado] [muda] [dir] [classe]
// Folha de UM GESTO num render só, fundo magenta. O GRID VEM DA CLASSE (contratos.mjs):
//   secundaria = 2x2 (4 quadros)   primaria = 3x3 (9)   complexa = 4x4 (16)
// Irmã do gen-walk/gen-run, mas pra ação qualquer: acenar não, chacoalhar cofrinho, apontar.
//
// POR QUE EXISTE: gesto virava pose ÚNICA (fica parado na tela, reprovado) ou duas poses
// geradas SEPARADAS, que não casam entre si — o corpo muda junto e o "ciclo" treme em vez
// de animar. Num render só, TODOS os quadros dividem corpo/rosto/kit e só muda o que você pedir.
// Contrato do prompt em config.mjs (promptAcao). Fatia com slice-acao.mjs, na MESMA classe.
//
// Saída: saga-fut/personagens/<slug>/acoes/<nome>/_sheet.png
import { gerarImagem as generateImage } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, promptAcao } from './config.mjs';
import { duasReferencias } from './referencia.mjs';
import { access } from 'node:fs/promises';
import { gridDaClasse, caminhoModelSheet } from './contratos.mjs';
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-acao.mjs', 'node scripts/asset.mjs folha <slug> <nome> --classe=primaria --muda="..."');

const [, , SLUG, NOME, DESC, FASES = '', TRAVADO = '', MUDA = '', DIR = 'right', CLASSE = 'secundaria'] = process.argv;
if (!SLUG || !NOME || !DESC) {
  console.error('uso: node gen-acao.mjs <slug> <nome> "<descrição>" "<fases|separadas>" ["travado"] ["o que muda"] [dir] [classe]');
  process.exit(1);
}
// GRID PELA CLASSE (contratos.mjs): o número de fases exigido não é escolha, é o grid da classe.
const { grid, celulas } = gridDaClasse(CLASSE);
const fases = FASES.split('|').map((f) => f.trim()).filter(Boolean);
if (fases.length !== celulas) {
  console.error(`FAIL classe "${CLASSE}" = grid ${grid.join('x')} = ${celulas} células, mas vieram ${fases.length} fases.`);
  process.exit(1);
}
// O MODEL SHEET CONTINUA OBRIGATÓRIO, mas agora por ser A referência de identidade deste gesto (é
// ele que `duasReferencias` escolhe quando existe), não mais como a segunda de uma pilha de quatro.
const model = caminhoModelSheet(SLUG);
const temModel = await access(model).then(() => true).catch(() => false);
if (!temModel) { console.error(`FAIL "${SLUG}" não tem model sheet (personagens/${SLUG}/model.png) — gere com: node scripts/asset.mjs model-sheet ${SLUG}`); process.exit(1); }

const OUTREL = `personagens/${SLUG}/acoes/${NOME}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
// DUAS REFERÊNCIAS: a folha DESTE MESMO GESTO no personagem-padrão + este personagem. Mostrar uma
// encenação aprovada vale mais que descrevê-la em inglês (ver referencia.mjs).
//
// Saiu daqui a "folha anterior" do próprio personagem, que entrava como âncora de ESCALA. Ela
// resolvia um problema real (duas folhas do mesmo personagem saindo em tamanhos diferentes), mas
// era a terceira imagem DELE mesmo na pilha, e é justamente esse acúmulo que faz a identidade
// atropelar a pose que se quer copiar. A escala continua defendida onde ela é medida de verdade:
// no slicer, que normaliza toda folha pelo mesmo CHAR_H, e no gate de escala do ciclo.
const _existe = (rel) => existsSync(path.join(CONTEUDO, rel));

// MODO CORREÇÃO: a folha ATUAL vira a imagem 1, no lugar da referência de pose. É a mesma regra de
// duas imagens (pose + identidade), só que a "pose" aqui é a que se quer consertar. Sem isto,
// reprovar dois quadros de nove obrigava a gerar tudo do zero — e os sete quadros bons se perdiam.
const CORRIGIR = (process.argv.find((a) => a.startsWith('--corrigir=')) || '').slice(11);
const _folhaAtual = path.join(CONTEUDO, `personagens/${SLUG}/acoes/${NOME}/_sheet.png`);
if (CORRIGIR && !existsSync(_folhaAtual)) {
  console.error(`FAIL --corrigir precisa da folha anterior, e ${SLUG}/${NOME} ainda não tem uma.`);
  process.exit(1);
}
const { refs: _rel, poseDe, identidadeEh } = duasReferencias(NOME, SLUG, _existe);
const refs = CORRIGIR
  ? [_folhaAtual, path.join(CONTEUDO, _rel[_rel.length - 1])]
  : _rel.map((r) => path.join(CONTEUDO, r));
const _temPose = !!poseDe;
const prompt = await promptAcao(OUTREL, { desc: DESC, fases, travado: TRAVADO, muda: MUDA, dir: DIR, grid, temPose: _temPose, corrigir: CORRIGIR });
console.log(`>>> acao ${SLUG} ${NOME} (classe ${CLASSE}, grid ${grid.join('x')})`); const t0 = Date.now();
console.log(CORRIGIR
  ? `   refs: FOLHA ATUAL de ${SLUG}/${NOME} (a corrigir) + ${identidadeEh}`
  : `   refs: ${_temPose ? `POSE de ${poseDe.slug}/${NOME} + ` : ''}${identidadeEh} de ${SLUG}`);
await generateImage({ cwd: CONTEUDO, prompt, referencias: refs, outAbs, timeoutMs: 900000 });
console.log('OK acao', SLUG, NOME, Math.round((Date.now() - t0) / 1000) + 's');
