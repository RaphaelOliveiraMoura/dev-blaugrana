// migrar-personagens.mjs [--dry] [--apagar-vazias] — move a arte de cada personagem pra pasta dele.
//
// De 8 pastas por tipo (personagens/, refs/, model/, rigs/idle|andar|correr|acoes|poses/) para
// UMA pasta por personagem (shared/personagem.mjs). Migração DEFINITIVA, sem camada de
// compatibilidade: quem ficar apontando pro caminho velho quebra alto, que é o combinado.
//
// Segurança: `--dry` mostra o plano sem tocar em nada; a execução CONTA os arquivos antes e depois
// e aborta se a conta não bater (nada é apagado antes da conferência). O `project.json` é migrado
// à parte, pela API do studio (migrar-dados.mjs), porque com o studio aberto editar o arquivo
// direto é sobrescrito no próximo save.
import fs from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO_DIR } from '../server/config.mjs';
import { dirPersonagem, baseImagem, refImagem, modelSheet, dirRig, dirAcao, dirPoses, TIPOS_RIG } from '../shared/personagem.mjs';

const DRY = process.argv.includes('--dry');
const abs = (p) => path.join(CONTEUDO_DIR, p);
const existe = (p) => fs.access(abs(p)).then(() => true).catch(() => false);
const ls = (p) => fs.readdir(abs(p)).catch(() => []);
const contaEm = async (p) => {
  let n = 0;
  for (const e of await fs.readdir(abs(p), { withFileTypes: true }).catch(() => [])) {
    n += e.isDirectory() ? await contaEm(path.join(p, e.name)) : 1;
  }
  return n;
};

// ---------------------------------------------------------------- plano
const movimentos = [];       // { de, para }
const slugs = new Set();

for (const f of await ls('personagens')) {
  if (f.endsWith('.png')) { const slug = f.replace(/\.png$/, ''); slugs.add(slug); movimentos.push({ de: `personagens/${f}`, para: baseImagem(slug) }); }
}
for (const f of await ls('personagens/refs')) {
  if (f.endsWith('.png')) { const slug = f.replace(/\.png$/, ''); slugs.add(slug); movimentos.push({ de: `personagens/refs/${f}`, para: refImagem(slug) }); }
}
for (const f of await ls('personagens/model')) {
  if (f.endsWith('.png')) { const slug = f.replace(/\.png$/, ''); slugs.add(slug); movimentos.push({ de: `personagens/model/${f}`, para: modelSheet(slug) }); }
}
for (const tipo of TIPOS_RIG) {
  for (const slug of await ls(`rigs/${tipo}`)) {
    const origem = `rigs/${tipo}/${slug}`;
    if (!(await ls(origem)).length) continue;
    slugs.add(slug);
    for (const f of await ls(origem)) movimentos.push({ de: `${origem}/${f}`, para: `${dirRig(slug, tipo)}/${f}` });
  }
}
for (const slug of await ls('rigs/acoes')) {
  for (const gesto of await ls(`rigs/acoes/${slug}`)) {
    slugs.add(slug);
    for (const f of await ls(`rigs/acoes/${slug}/${gesto}`)) movimentos.push({ de: `rigs/acoes/${slug}/${gesto}/${f}`, para: `${dirAcao(slug, gesto)}/${f}` });
  }
}
for (const slug of await ls('rigs/poses')) {
  for (const f of await ls(`rigs/poses/${slug}`)) { slugs.add(slug); movimentos.push({ de: `rigs/poses/${slug}/${f}`, para: `${dirPoses(slug)}/${f}` }); }
}

// ---------------------------------------------------------------- relatório
const antes = (await contaEm('personagens')) + (await contaEm('rigs'));
console.log(`\n== migrar personagens ==${DRY ? '  (dry-run, nada será movido)' : ''}`);
console.log(`  personagens encontrados: ${slugs.size}`);
console.log(`  arquivos a mover:        ${movimentos.length}`);
console.log(`  arquivos hoje em personagens/ + rigs/: ${antes}\n`);

const porSlug = {};
for (const m of movimentos) { const s = m.para.split('/')[1]; porSlug[s] = (porSlug[s] || 0) + 1; }
const top = Object.entries(porSlug).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log('  maiores:', top.map(([s, n]) => `${s} (${n})`).join(', '));
if (DRY) {
  console.log('\n  exemplos:');
  for (const m of movimentos.slice(0, 6)) console.log(`    ${m.de}\n      -> ${m.para}`);
  console.log(`\n  (${movimentos.length - 6} outros)\n`);
  process.exit(0);
}

// ---------------------------------------------------------------- execução
let movidos = 0, conflitos = 0;
for (const m of movimentos) {
  if (await existe(m.para)) { conflitos++; console.warn(`  JÁ EXISTE, pulando: ${m.para}`); continue; }
  await fs.mkdir(path.dirname(abs(m.para)), { recursive: true });
  await fs.rename(abs(m.de), abs(m.para));
  movidos++;
}
const depois = await contaEm('personagens');
console.log(`\n  movidos: ${movidos}${conflitos ? ` · conflitos pulados: ${conflitos}` : ''}`);
console.log(`  arquivos agora em personagens/: ${depois}`);

// CONFERÊNCIA antes de qualquer remoção: se sumiu arquivo, para tudo e deixa o disco como está.
const sobrando = await contaEm('rigs');
if (depois + sobrando !== antes) {
  console.error(`\nFAIL a conta não bate: ${antes} antes, ${depois + sobrando} depois. NADA foi apagado — confira o disco.`);
  process.exit(1);
}
console.log(`  conferência: ${antes} antes = ${depois} em personagens/ + ${sobrando} restante em rigs/  ✓`);

// só agora limpa as pastas vazias que sobraram
if (process.argv.includes('--apagar-vazias')) {
  for (const p of ['rigs/idle', 'rigs/andar', 'rigs/correr', 'rigs/acoes', 'rigs/poses', 'personagens/refs', 'personagens/model']) {
    await fs.rm(abs(p), { recursive: true, force: true }).catch(() => {});
  }
  const rigsVazio = (await contaEm('rigs')) === 0;
  if (rigsVazio) await fs.rm(abs('rigs'), { recursive: true, force: true }).catch(() => {});
  console.log('  pastas antigas removidas');
}
console.log('\n  PRÓXIMO: node scripts/migrar-dados.mjs  (atualiza o caminho da ficha no project.json)\n');
