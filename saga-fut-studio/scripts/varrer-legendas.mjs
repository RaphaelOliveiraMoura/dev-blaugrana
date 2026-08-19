// TODA CAIXA DE LEGENDA QUE ACABA NO LUGAR ERRADO.
//
// POR QUE EXISTE: cada item de `painel.legendas` é uma CAIXA com moldura própria, e o leitor a
// lê como uma unidade terminada. Quem escreve o roteiro vê um array de strings e quebra por
// TAMANHO — e aí a frase sai partida entre duas caixas ("EM 1921, UMA CHARGE DO JORNAL ÍTALO-
// BRASILEIRO IL PASQUINO COLONIALE" / "JÁ TRATAVA O CLUBE COMO PEIXE."). Nenhum gate pegava:
// o texto está certo, a ortografia está certa, a arte está certa.
//
// DUAS RÉGUAS, e elas medem defeitos diferentes:
//
//   CORTE   uma caixa, uma FRASE (shared/legenda-corte.mjs). É o defeito que o Raphael leu no
//           o-dia-baleia — duas vezes: a primeira régua aceitava corte na vírgula, e ele releu
//           o mesmo painel e disse que a vírgula não muda o que se vê.
//   PAREDE  quantas linhas a caixa ocupa (server/lib/legenda-tamanho.mjs). É a CAUSA: 74 dos
//           159 painéis com frase partida não cabiam numa caixa nem depois de juntados. Quem
//           quebrou em duas não queria dois tempos de leitura, queria fazer caber.
//
//   CAPA    apontamento, nunca erro. Na capa a manchete PODE ocupar dois blocos (decisão do
//           Raphael, 18/08/2026: "apenas se não ficar confuso ou sem sentido as frases"), e o
//           gate barra só o caso inequívoco (conjunção abrindo o segundo bloco). Quando o
//           segundo bloco abre com preposição ou particípio, ele às vezes é remate de manchete
//           ("SEM TOCAR NA BOLA UMA VEZ") e às vezes é adjunto pendurado ("DENTRO DO MARACANÃ
//           LOTADO"): a diferença é do olho, então sai listado aqui.
//
// As duas primeiras são barradas no PUT. Barrar só o corte empurraria o problema pra caixa
// gigante.
//
//   node scripts/varrer-legendas.mjs              # o acervo inteiro
//   node scripts/varrer-legendas.mjs --nao-pub    # só o que ainda não foi publicado
//   node scripts/varrer-legendas.mjs <id> ...     # quadrinhos escolhidos
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cortesRuins } from '../shared/legenda-corte.mjs';
import { legendaPorCodigo } from '../shared/quadrinho-config.mjs';
import { linhasPorCaixa, MAX_LINHAS } from '../server/lib/legenda.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const QUAD = path.resolve(AQUI, '../../saga-fut/data/quadrinhos');

const args = process.argv.slice(2);
const soNaoPub = args.includes('--nao-pub');
const ids = args.filter((a) => !a.startsWith('--'));

const arquivos = (await readdir(QUAD)).filter((f) => f.endsWith('.json'))
  .filter((f) => !ids.length || ids.includes(f.slice(0, -5)));

// segundo bloco de capa que PENDE do primeiro: preposição, particípio ou gerúndio na abertura
const PENDURADO = /^(SEM|COM|PARA|POR|DENTRO|FORA|ANTES|DEPOIS|SOBRE|SOB|ENTRE|CONTRA|ATÉ|DESDE|APÓS|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]+(ADO|IDA|IDO|ADA|ANDO|ENDO|INDO))\b/;
// a TARJA de lugar e data não pende de nada: é um selo, e a fórmula mais usada da série
const TARJA = /\b(18|19|20)\d\d\b|\d{2}\.\d{2}\.\d{4}|\bANOS \d|\bTEMPORADA\b/;

let paineis = 0, cortes = 0, paredes = 0, capas = 0;
const semLegenda = [];

for (const arq of arquivos.sort()) {
  const quad = JSON.parse(await readFile(path.join(QUAD, arq), 'utf-8'));
  if (soNaoPub && quad.publicado) continue;
  // mesma porta de entrada dos gates: sem `legendaPorCodigo` o campo não vira caixa no export
  if (!legendaPorCodigo(quad)) continue;
  const lista = quad.paineis || [];
  const numeros = lista.map((p) => Number(p?.numero) || 0).filter((n) => n > 0);
  const primeiro = numeros.length ? Math.min(...numeros) : 1;
  const linhas = [];

  for (const p of lista) {
    const textos = (p.legendas || []).map((t) => String(t || '').trim()).filter(Boolean);
    if (!textos.length) continue;
    paineis++;

    for (const r of cortesRuins(textos, { capa: Number(p.numero) === primeiro })) {
      cortes++;
      linhas.push(`  CORTE  painel ${p.numero}: ${r.motivo}`);
      linhas.push(`         [${r.a}]`);
      linhas.push(`         [${r.b}]`);
    }

    if (Number(p.numero) === primeiro && textos.length > 1 && !/[.!?…]$/.test(textos[0]) && PENDURADO.test(textos[1]) && !TARJA.test(textos[1])) {
      capas++;
      linhas.push(`  CAPA   o segundo bloco abre pendurado no primeiro — confira olhando se ele se lê sozinho`);
      linhas.push(`         [${textos[0]}] [${textos[1]}]`);
    }

    // a MEDIDA REAL na fonte, não contagem de caracteres: é o mesmo desenho que vai pro slide
    for (const c of linhasPorCaixa({ textos })) {
      if (c.linhas <= MAX_LINHAS) continue;
      paredes++;
      linhas.push(`  PAREDE painel ${p.numero}: ${c.linhas} linhas no corpo mínimo (${c.fontSize}px), teto ${MAX_LINHAS}`);
      linhas.push(`         [${c.texto}]`);
    }
  }

  if (linhas.length) console.log(`\n${quad.id}${quad.publicado ? ' (PUBLICADO)' : ''}\n${linhas.join('\n')}`);
  else if (!lista.some((p) => (p.legendas || []).filter(Boolean).length)) semLegenda.push(quad.id);
}

console.log(`\n${arquivos.length} quadrinhos, ${paineis} painéis com legenda, ${semLegenda.length} sem legenda nenhuma`);
console.log(`CORTE ruim: ${cortes}   PAREDE (mais de ${MAX_LINHAS} linhas): ${paredes}   CAPA a conferir: ${capas}`);
if (cortes || paredes) console.log('\nO conserto é editorial: junte as caixas da mesma frase; se aí não couber, corte PALAVRA.');
process.exit(cortes || paredes ? 1 : 0);
