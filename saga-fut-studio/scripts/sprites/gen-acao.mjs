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
import { generateImage } from '../../server/providers/codex-image.mjs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { CONTEUDO, ESTILO_PATH, basePersonagem, promptAcao } from './config.mjs';
import { access, readdir } from 'node:fs/promises';
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
// MODEL SHEET como 2ª referência: é o que segurou a proporção no bake-off (desvio 1.9% -> 0.8%).
const model = caminhoModelSheet(SLUG);
const temModel = await access(model).then(() => true).catch(() => false);
if (!temModel) { console.error(`FAIL "${SLUG}" não tem model sheet (personagens/${SLUG}/model.png) — gere com: node scripts/asset.mjs model-sheet ${SLUG}`); process.exit(1); }

// FOLHA ANTERIOR como referência de ESCALA: o model sheet acerta a proporção do personagem, mas
// não garante que duas folhas geradas em renders diferentes saiam no MESMO tamanho de desenho — e
// é isso que faz o personagem "mudar de tamanho" quando o gesto troca na tela. Passar uma folha já
// aprovada dele resolve (medido: a escala se manteve entre renders separados).
const folhasAntigas = await readdir(path.join(CONTEUDO, `personagens/${SLUG}/acoes`)).catch(() => []);
const anterior = folhasAntigas.filter((f) => f !== NOME)
  .map((f) => path.join(CONTEUDO, `personagens/${SLUG}/acoes/${f}/_sheet.png`))
  .find((p) => existsSync(p)) || null;
if (anterior) console.log(`   escala ancorada em: ${path.relative(CONTEUDO, anterior)}`);

const OUTREL = `personagens/${SLUG}/acoes/${NOME}/_sheet.png`, outAbs = path.join(CONTEUDO, OUTREL);
await mkdir(path.dirname(outAbs), { recursive: true });
const prompt = await promptAcao(OUTREL, { desc: DESC, fases, travado: TRAVADO, muda: MUDA, dir: DIR, grid, modelSheet: true, folhaAnterior: !!anterior });
console.log(`>>> acao ${SLUG} ${NOME} (classe ${CLASSE}, grid ${grid.join('x')})`); const t0 = Date.now();
const refs = anterior ? [basePersonagem(SLUG), model, anterior, ESTILO_PATH] : [basePersonagem(SLUG), model, ESTILO_PATH];
await generateImage({ cwd: CONTEUDO, prompt, referencias: refs, outAbs, timeoutMs: 900000 });
console.log('OK acao', SLUG, NOME, Math.round((Date.now() - t0) / 1000) + 's');
