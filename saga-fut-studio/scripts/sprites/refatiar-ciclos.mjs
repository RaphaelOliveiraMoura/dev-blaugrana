// refatiar-ciclos.mjs [andar|correr|--todos] [--dry] — REFATIA os ciclos do acervo a partir das
// folhas que já estão no disco, com a normalização nova (âncora de tronco + escala única).
//
// POR QUE ISSO EXISTE: o defeito não estava na arte, estava no recorte, então o acervo inteiro
// pode ser consertado SEM GERAR NADA. Cada ciclo é medido antes e depois, e o relatório diz
// quanto de deriva saiu. Quem piorar aparece na lista em vez de sumir na média.
//
//   node scripts/sprites/refatiar-ciclos.mjs --todos --dry    # só mede, não escreve
//   node scripts/sprites/refatiar-ciclos.mjs correr           # refatia as folhas de corrida
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';
import { fatiarCiclo } from './fatiar-ciclo.mjs';
import { medirCiclo, CICLO_DERIVA_MAX } from './ciclo.mjs';
import { prefixoRig } from '../../shared/personagem.mjs';
import { dirRig } from '../../shared/personagem.mjs';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const TIPOS = args.includes('--todos') ? ['andar', 'correr'] : args.filter((a) => ['andar', 'correr'].includes(a));
if (!TIPOS.length) { console.error('uso: refatiar-ciclos.mjs [andar|correr|--todos] [--dry]'); process.exit(1); }

const PREF = { andar: 'w', correr: 'r' };
const pct = (v) => (v === null || v === undefined ? '  -  ' : (v * 100).toFixed(1).padStart(5) + '%');

const slugs = (await readdir(`${CONTEUDO}/personagens`, { withFileTypes: true }))
  .filter((d) => d.isDirectory()).map((d) => d.name).sort();

for (const tipo of TIPOS) {
  const linhas = [];
  for (const slug of slugs) {
    const base = `${CONTEUDO}/${dirRig(slug, tipo)}`;
    const temFolha = await readdir(base).then((f) => f.includes('_sheet.png')).catch(() => false);
    if (!temFolha) continue;
    const antes = await medirCiclo(base, prefixoRig(tipo)).then((m) => m.deriva?.pior ?? null).catch(() => null);
    let depois = antes;
    if (!DRY) {
      try {
        await fatiarCiclo({ slug, base, pref: PREF[tipo] });
        depois = await medirCiclo(base, prefixoRig(tipo)).then((m) => m.deriva?.pior ?? null).catch(() => null);
      } catch (e) {
        linhas.push({ slug, antes, depois: null, erro: e.message });
        continue;
      }
    }
    linhas.push({ slug, antes, depois });
  }

  console.log(`\n=== ${tipo.toUpperCase()} · ${linhas.length} ciclos${DRY ? ' (dry)' : ''}`);
  const piorou = [], reprovava = [];
  for (const l of linhas) {
    if (l.erro) { console.log(`  ERRO ${l.slug}: ${l.erro}`); continue; }
    if (l.antes !== null && l.antes > CICLO_DERIVA_MAX) reprovava.push(l);
    if (l.depois !== null && l.antes !== null && l.depois > l.antes + 0.005) piorou.push(l);
  }
  const media = (k) => {
    const v = linhas.map((l) => l[k]).filter((x) => x !== null && x !== undefined);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  console.log(`  deriva média: ${pct(media('antes'))} -> ${pct(media('depois'))}   (limite do gate: ${pct(CICLO_DERIVA_MAX)})`);
  console.log(`  passavam do limite antes: ${reprovava.length}` +
    (reprovava.length ? ` (${reprovava.map((l) => `${l.slug} ${pct(l.antes)}`).join(', ')})` : ''));
  const aindaRuim = linhas.filter((l) => l.depois !== null && l.depois > CICLO_DERIVA_MAX);
  console.log(`  ainda acima do limite depois: ${aindaRuim.length}` +
    (aindaRuim.length ? ` (${aindaRuim.map((l) => l.slug).join(', ')})` : ''));
  // PIORA NÃO PODE SUMIR NA MÉDIA: é o único sinal de que a troca fez mal a alguém
  if (piorou.length) {
    console.log(`  PIOROU em ${piorou.length}:`);
    for (const l of piorou) console.log(`    ${l.slug.padEnd(24)} ${pct(l.antes)} -> ${pct(l.depois)}`);
  }
}
