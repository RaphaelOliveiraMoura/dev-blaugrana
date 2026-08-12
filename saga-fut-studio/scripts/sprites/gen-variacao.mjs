// gen-variacao.mjs <slug> <arquivoVariantesAbs> <indice0>
//
// UMA candidata de ficha, gravada no RASCUNHO do personagem (`_variacoes/`), nunca na base.
//
// É o mesmo pedido que o studio faz no botão "gerar ficha" (mesmo estilo, mesma foto de aparência,
// mesmo enquadramento de 85%), com UMA coisa trocada: o `promptFicha`. Por isso reusa
// `comporPrompt` em vez de montar prompt próprio — candidata que nasce de outro prompt não é
// comparável com a base que está no acervo, e a comparação é o ponto inteiro deste comando.
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { readDados } from '../../server/store.mjs';
import { comporPrompt, instrucaoCodex } from '../../server/prompts.mjs';
import { CONTEUDO_DIR } from '../../server/config.mjs';
import { variacaoImagem } from '../../shared/personagem.mjs';
import { gerarImagem } from './modelo.mjs';   // roteia pro modelo efetivo (studio ou --modelo=)
import { exigirPorta } from './porta.mjs';

exigirPorta('gen-variacao.mjs', 'node scripts/asset.mjs variacao <slug> --de=<arquivo.json>');

const [, , SLUG, ARQ, IDX] = process.argv;
if (!SLUG || !ARQ || IDX == null) { console.error('uso: node gen-variacao.mjs <slug> <arquivoVariantes> <indice0>'); process.exit(2); }

const i = Number(IDX);
const variantes = JSON.parse(await readFile(ARQ, 'utf8'));
const v = variantes[i];
if (!v) { console.error(`FAIL variante ${i} não existe em ${ARQ}`); process.exit(1); }

const d = await readDados();
const p = (d.personagens || []).find((x) => x.id === SLUG);
if (!p) { console.error(`FAIL personagem "${SLUG}" não está cadastrado no studio`); process.exit(1); }

// A troca é NO OBJETO EM MEMÓRIA e morre com o processo: o project.json não é tocado aqui. Quem
// escreve a escolha no cadastro é o `asset promover`, e só depois de alguém ter olhado.
p.promptFicha = v.promptFicha;
// `!== undefined` e não truthy: `"estiloExtra": ""` é uma variante legítima e importante — o
// estiloExtra do flick ("o rosto mais magro do elenco, bochechas fundas") era metade do problema,
// e sem poder ZERAR ele não dava pra testar a hipótese.
if (v.estiloExtra !== undefined) p.estiloExtra = v.estiloExtra;

const outRel = variacaoImagem(SLUG, i + 1, v.nome);
const outAbs = path.join(CONTEUDO_DIR, outRel);
await mkdir(path.dirname(outAbs), { recursive: true });

const pedido = await comporPrompt(d, { tipo: 'ficha', personagemId: SLUG });
console.log(`>>> ${i + 1}. ${v.nome}  refs: ${pedido.refs.map((r) => r.papel).join(' + ') || '(nenhuma)'}`);
const t0 = Date.now();
await gerarImagem({
  cwd: CONTEUDO_DIR,
  prompt: instrucaoCodex({ ...pedido, outRel }),   // outRel do rascunho, NÃO o p.imagem do acervo
  referencias: pedido.refs.map((r) => r.rel),
  outAbs,
  timeoutMs: 600000,
});
console.log(`OK  ${i + 1}. ${v.nome}  ${Math.round((Date.now() - t0) / 1000)}s -> ${outRel}`);
