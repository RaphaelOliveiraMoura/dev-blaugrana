// asset.mjs — A PORTA ÚNICA de criação de asset do SagaFut.
//
// POR QUE EXISTE: havia dez entradas soltas (gen-char, gen-pose, gen-walk, gen-run, gen-idle,
// gen-acao, gen-react, gen-cenario, gen-keyframe, build-video). Qualquer uma podia ser chamada
// por fora do contrato, e foi assim que entraram no acervo folha sem `muda` (saiu pulsando),
// sprite com número no peito e cenário com escudo do time errado. Regra que depende de alguém
// lembrar não é regra. Agora os gen-* só rodam com SAGAFUT_VIA_ASSET=1, que só este arquivo põe.
//
//   asset status <slug>          o personagem está apto a entrar num vídeo? o que falta?
//   asset model-sheet <slug>     turnaround de 4 vistas (pré-requisito de todo personagem)
//   asset folha <slug> <nome> --classe=primaria|secundaria|complexa
//   asset video <id>             build do vídeo inteiro (valida o manifesto ANTES de gerar)
//   asset idle|andar|correr <slug>  bibliotecas de movimento (o que o `status` manda rodar)
//   asset dir <slug> <rig> <l|r> declara pra que lado a folha de movimento olha
//   asset doutor                 o que está DECLARADO pela metade no acervo (buraco vira lista)
//   asset regras                 imprime o contrato vigente
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, access } from 'node:fs/promises';
import { CONTEUDO, ESTILO_PATH, basePersonagem, loadStylePrefix } from './sprites/config.mjs';
import { CLASSES, CLASSES_VALIDAS, gridDaClasse, statusPersonagem, validarManifesto, caminhoModelSheet } from './sprites/contratos.mjs';
import { TIPOS_RIG, dirRig, rigMeta, prefixoRig } from '../shared/personagem.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPR = path.join(__dirname, 'sprites');
const VID = path.join(__dirname, 'video');
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n, d = null) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };

// os gen-* recusam execução direta; esta é a única função que abre a porta
const run = (script, cmdArgs) => new Promise((res, rej) => {
  const p = spawn('node', [script, ...cmdArgs], { stdio: 'inherit', env: { ...process.env, SAGAFUT_VIA_ASSET: '1' } });
  p.on('error', rej);
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${path.basename(script)} saiu ${c}`))));
});

const uso = () => {
  console.log(`uso:
  asset status <slug>                             o que falta pro personagem entrar num vídeo
  asset model-sheet <slug>                        gera o turnaround de 4 vistas
  asset folha <slug> <nome> --classe=<classe> --desc="..." --muda="..." [--travado="..."]
  asset video <id> [--dry] [--force]              build do vídeo (valida o manifesto antes de gerar)
  asset idle|andar|correr <slug> [--kit="..."] [--num=N] [--dir=left|right] [--nota="..."]
                                                  gera+fatia a biblioteca de movimento
  asset dir <slug> <andar|correr|idle|...-esq> <left|right>
                                                  declara pra que lado a folha de movimento olha
  asset doutor                                    o que está declarado pela metade (buraco vira lista)
  asset regras                                    imprime o contrato vigente

classes: ${CLASSES_VALIDAS.map((c) => `${c} (${CLASSES[c].grid.join('x')}, ${CLASSES[c].celulas} células)`).join(' · ')}`);
  process.exit(2);
};

// --------------------------------------------------------------------- regras
if (cmd === 'regras') {
  console.log('\nCLASSES DE ANIMAÇÃO (o grid sai da classe, não da escolha de quem escreve):\n');
  for (const [id, c] of Object.entries(CLASSES)) {
    console.log(`  ${id.padEnd(12)} grid ${c.grid.join('x')}  ${String(c.celulas).padStart(2)} células  corpo ~${c.corpoPx}px`);
    console.log(`  ${''.padEnd(12)} ${c.quando}\n`);
  }
  console.log('PRÉ-REQUISITO DE PERSONAGEM: base + model sheet + idle (andar é recomendado).');
  console.log('Vídeo com personagem não-apto NÃO renderiza (gate no check-video).\n');
  process.exit(0);
}

// --------------------------------------------------------------------- rigs (bibliotecas de movimento)
// POR QUE EXISTE: o `status` mandava rodar `asset idle <slug>` e esse comando NÃO EXISTIA. Ou seja,
// a mensagem era acionável no texto e beco sem saída na prática — e o `asset video` recusava gerar
// justamente por falta do idle que só ele geraria, um impasse. Instrução que aponta pra comando
// inexistente é pior que instrução nenhuma: custa a confiança em todas as outras.
const RIGS = { idle: ['gen-idle', 'slice-idle'], andar: ['gen-walk', 'slice-walk'], correr: ['gen-run', 'slice-run'] };
if (RIGS[cmd]) {
  const slug = args[1];
  if (!slug) { console.error(`uso: asset ${cmd} <slug> [--kit="..."] [--num=N] [--dir=left|right] [--nota="..."]`); process.exit(2); }
  const dir = flag('dir', 'right');
  if (!['left', 'right'].includes(dir)) { console.error(`--dir aceita left|right (recebi "${dir}")`); process.exit(2); }
  const esq = dir === 'left' && cmd !== 'idle';   // idle não tem pasta -esq: é o mesmo repouso
  const [gen, sli] = RIGS[cmd];
  console.log(`\n>>> ${cmd} ${slug}${esq ? ' (esquerda)' : ''}`);
  await run(path.join(SPR, `${gen}.mjs`), [slug, flag('kit', ''), String(flag('num', '')), dir, flag('nota', '')]);
  await run(path.join(SPR, `${sli}.mjs`), [slug, ...(esq ? ['--esq'] : [])]);
  console.log(`OK ${cmd} ${slug} -> ${dirRig(slug, cmd, esq)}`);
  process.exit(0);
}

// --------------------------------------------------------------------- doutor (cobertura)
// POR QUE EXISTE: um validador só reprova o que ele CONSEGUE conferir. Rig sem direção declarada,
// folha sem cronometragem, personagem sem model sheet — nada disso é erro de nada, é ausência, e
// ausência não aparece em relatório de FAIL. Este comando vira essas ausências numa lista com o
// conserto ao lado, que é a diferença entre "não sei o que falta" e uma fila de trabalho.
if (cmd === 'doutor') {
  const { readdir: rd } = await import('node:fs/promises');
  const { existsSync } = await import('node:fs');
  const BASE = path.join(CONTEUDO, 'personagens');
  const slugs = (await rd(BASE).catch(() => [])).filter((s) => !s.startsWith('.') && !s.endsWith('.png'));
  const rigsSemDir = [], folhasSemTempo = [], semModel = [];

  for (const slug of slugs) {
    for (const tipo of TIPOS_RIG) for (const esq of [false, true]) {
      const pasta = path.join(CONTEUDO, dirRig(slug, tipo, esq));
      if (!existsSync(pasta)) continue;
      if (!existsSync(path.join(pasta, '_meta.json'))) rigsSemDir.push(`${slug} ${tipo}${esq ? '-esq' : ''}`);
    }
    for (const g of await rd(path.join(BASE, slug, 'acoes')).catch(() => [])) {
      const f = path.join(BASE, slug, 'acoes', g, '_meta.json');
      if (!existsSync(f)) { folhasSemTempo.push(`${slug}/${g} (sem _meta: refatie)`); continue; }
      try { if (!JSON.parse(await readFile(f, 'utf8')).tempos) folhasSemTempo.push(`${slug}/${g}`); } catch { /* ilegível */ }
    }
    // só cobra model sheet de quem já tem rig (ou seja, de quem já entra em vídeo)
    const temRig = TIPOS_RIG.some((t) => existsSync(path.join(CONTEUDO, dirRig(slug, t))));
    if (temRig && !existsSync(path.join(CONTEUDO, caminhoModelSheet(slug).replace(CONTEUDO + '/', '')))) semModel.push(slug);
  }

  const bloco = (titulo, itens, porque, conserto) => {
    console.log(`\n${titulo}: ${itens.length}`);
    if (!itens.length) { console.log('  (nada)'); return; }
    console.log(`  ${porque}`);
    for (const i of itens.slice(0, 15)) console.log(`    · ${i}`);
    if (itens.length > 15) console.log(`    … e mais ${itens.length - 15}`);
    console.log(`  conserto: ${conserto}`);
  };

  console.log('\n== DOUTOR: o que está declarado pela metade ==');
  bloco('RIGS SEM DIREÇÃO DECLARADA', rigsSemDir,
    'sem isso o INV-4 fica CEGO neles (é o que deixou o Cucurella andar de costas)',
    'confira o _card.png do rig e rode: node scripts/asset.mjs dir <slug> <rig> <left|right>');
  bloco('FOLHAS DE GESTO SEM CRONOMETRAGEM', folhasSemTempo,
    'exposição uniforme = todo desenho o mesmo tempo, que é o flipbook mecânico',
    'declare tempos/chao/contato/loop em scripts/sprites/gestos.mjs e refatie (sem custo de geração)');
  bloco('PERSONAGENS COM RIG MAS SEM MODEL SHEET', semModel,
    'sem ela cada folha nova sai numa proporção diferente (o personagem muda de tamanho ao trocar de gesto)',
    'node scripts/asset.mjs model-sheet <slug>');

  const total = rigsSemDir.length + folhasSemTempo.length + semModel.length;
  console.log(`\n${total === 0 ? 'acervo íntegro: nada declarado pela metade.' : `${total} pendência(s) de declaração.`}\n`);
  process.exit(0);
}

// --------------------------------------------------------------------- dir (orientação da folha)
// A folha de caminhada não dizia pra que lado olhava, e essa era a ÚNICA informação que faltava pro
// sistema perceber que o Cucurella estava andando de costas. Novas folhas gravam sozinhas (o gerador
// já recebe `dir`); esta é a declaração das antigas, uma vez por folha.
if (cmd === 'dir') {
  const [, slug, rigArg, dir] = args;
  if (!slug || !rigArg || !['left', 'right'].includes(dir)) {
    console.error('uso: asset dir <slug> <andar|correr|idle|andar-esq|...> <left|right>');
    process.exit(2);
  }
  const esq = rigArg.endsWith('-esq');
  const tipo = esq ? rigArg.slice(0, -4) : rigArg;
  if (!TIPOS_RIG.includes(tipo)) { console.error(`rig "${tipo}" desconhecido (use ${TIPOS_RIG.join('/')}, com sufixo -esq pra variante)`); process.exit(2); }
  const pastaRel = dirRig(slug, tipo, esq);
  const q1 = path.join(CONTEUDO, pastaRel, `${prefixoRig(tipo, esq)}1.png`);
  if (!(await access(q1).then(() => true).catch(() => false))) { console.error(`FAIL ${pastaRel} não tem ${path.basename(q1)} — essa folha não existe.`); process.exit(1); }
  if (esq && dir !== 'left') console.warn(`aviso: a pasta -esq é a variante pra ESQUERDA, mas você declarou "${dir}".`);
  const metaAbs = path.join(CONTEUDO, rigMeta(slug, tipo, esq));
  let meta = {};
  try { meta = JSON.parse(await readFile(metaAbs, 'utf8')); } catch { /* primeira declaração */ }
  await writeFile(metaAbs, JSON.stringify({ ...meta, slug, tipo, esq, dir }, null, 2) + '\n');
  console.log(`OK ${pastaRel} olha pra ${dir.toUpperCase()}`);
  process.exit(0);
}

// --------------------------------------------------------------------- elenco (cobertura geral)
if (cmd === 'elenco') {
  const dir = path.join(CONTEUDO, 'personagens');
  // cada personagem virou uma PASTA (personagens/<slug>/), era um .png solto
  const ents = await readdir(dir, { withFileTypes: true });
  const slugs = ents.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const linhas = [];
  for (const slug of slugs) linhas.push(await statusPersonagem(slug));
  const aptos = linhas.filter((l) => l.apto);
  const soFalta = (id) => linhas.filter((l) => l.faltando.some((f) => f.id === id)).length;

  const filtro = flag('falta');                    // ex: --falta=model
  const mostra = filtro ? linhas.filter((l) => l.faltando.some((f) => f.id === filtro)) : linhas;
  console.log(`\nELENCO: ${slugs.length} personagens · ${aptos.length} aptos · ${slugs.length - aptos.length} incompletos\n`);
  console.log(`  ${'personagem'.padEnd(26)} base  model  idle  andar`);
  for (const l of mostra) {
    const m = (id) => (l.tem.includes(id) ? '  ok ' : '  -- ');
    console.log(`  ${l.slug.padEnd(26)}${m('base')}${m('model')}${m('idle')}${m('andar')}${l.apto ? '' : '   <- incompleto'}`);
  }
  console.log(`\n  falta model sheet: ${soFalta('model')} · falta idle: ${soFalta('idle')} · falta andar: ${soFalta('andar')}`);
  console.log(`  (o que falta vira comando com: asset status <slug>)\n`);
  process.exit(0);
}

// --------------------------------------------------------------------- status
if (cmd === 'status') {
  const slug = args[1]; if (!slug) uso();
  const st = await statusPersonagem(slug);
  console.log(`\n${slug}: ${st.apto ? 'APTO a entrar num vídeo' : 'NÃO APTO'}`);
  if (st.tem.length) console.log(`  tem: ${st.tem.join(', ')}`);
  for (const f of st.faltando) console.log(`  ${f.essencial ? 'FALTA  ' : 'sugere '} ${f.rotulo.padEnd(28)} -> ${f.comoFazer}`);
  console.log('');
  process.exit(st.apto ? 0 : 1);
}

// --------------------------------------------------------------------- model sheet
if (cmd === 'model-sheet') {
  const slug = args[1]; if (!slug) uso();
  await run(path.join(SPR, 'gen-model-sheet.mjs'), [slug, flag('desc', '')]);
  process.exit(0);
}

// --------------------------------------------------------------------- personagem (base a partir da foto)
if (cmd === 'personagem') {
  const slug = args[1], ref = flag('ref');
  if (!slug || !ref) { console.error('uso: asset personagem <slug> --ref=personagens/<slug>/ref.png [--desc="..."]'); process.exit(2); }
  await run(path.join(SPR, 'gen-char.mjs'), [ref, slug, flag('desc', '')]);
  console.log(`\npróximo passo obrigatório: node scripts/asset.mjs model-sheet ${slug}`);
  process.exit(0);
}

// --------------------------------------------------------------------- bibliotecas de movimento
for (const [nome, script, slicer] of [['idle', 'gen-idle.mjs', 'slice-idle.mjs'], ['andar', 'gen-walk.mjs', 'slice-walk.mjs'], ['correr', 'gen-run.mjs', 'slice-run.mjs']]) {
  if (cmd !== nome) continue;
  const slug = args[1]; if (!slug) uso();
  await run(path.join(SPR, script), [slug, flag('kit', ''), flag('num', ''), flag('dir', 'right'), flag('nota', '')]);
  await run(path.join(SPR, slicer), [slug]);
  process.exit(0);
}

// --------------------------------------------------------------------- folha (classe manda no grid)
if (cmd === 'folha') {
  const [, slug, nome] = args;
  const classe = flag('classe');
  if (!slug || !nome || !classe) uso();
  if (!CLASSES[classe]) { console.error(`FAIL classe "${classe}" não existe (use ${CLASSES_VALIDAS.join(' | ')})`); process.exit(1); }
  const muda = flag('muda');
  if (!muda) { console.error('FAIL faltou --muda="<a única parte que se move>" — sem isso a folha sai pulsando'); process.exit(1); }
  // GATE: personagem incompleto não gera folha nova. Gerar ação pra quem não tem model sheet é
  // pagar geração pra uma sprite que vai sair fora de proporção.
  const st = await statusPersonagem(slug);
  if (!st.apto) {
    console.error(`FAIL "${slug}" não está apto: falta ${st.faltando.filter((f) => f.essencial).map((f) => f.rotulo).join(', ')}`);
    for (const f of st.faltando.filter((x) => x.essencial)) console.error(`     -> ${f.comoFazer}`);
    process.exit(1);
  }
  const { grid, celulas } = gridDaClasse(classe);
  console.log(`folha "${nome}" de ${slug}: classe ${classe} -> grid ${grid.join('x')} (${celulas} células)`);
  await run(path.join(SPR, 'gen-acao.mjs'), [slug, nome, flag('desc', ''), flag('fases', ''), flag('travado', ''), muda, flag('dir', 'right'), classe]);
  process.exit(0);
}

// --------------------------------------------------------------------- video
if (cmd === 'video') {
  const id = args[1]; if (!id) uso();
  const manPath = path.join(CONTEUDO, `videos/${id}/sprites.json`);
  let man = null;
  try { man = JSON.parse(await readFile(manPath, 'utf8')); }
  catch { console.error(`FAIL não consegui ler ${manPath}`); process.exit(1); }

  // 1) SCHEMA antes de qualquer geração
  const erros = validarManifesto(man);
  if (erros.length) {
    console.error(`\nFAIL manifesto de "${id}" não passa no contrato (${erros.length} erro(s)) — nada foi gerado:\n`);
    for (const e of erros) console.error('  · ' + e);
    console.error('\n`asset regras` mostra o contrato vigente.\n');
    process.exit(1);
  }
  // 2) todo personagem citado precisa estar APTO
  const slugs = [...new Set([...(man.personagens || []).map((p) => p.slug), ...(man.acoes || []).map((a) => a.slug)])];
  const naoAptos = [];
  for (const s of slugs) { const st = await statusPersonagem(s); if (!st.apto) naoAptos.push(st); }
  if (naoAptos.length) {
    console.error(`\nFAIL ${naoAptos.length} personagem(ns) não apto(s) — nada foi gerado:\n`);
    for (const st of naoAptos) {
      console.error(`  ${st.slug}: falta ${st.faltando.filter((f) => f.essencial).map((f) => f.rotulo).join(', ')}`);
      for (const f of st.faltando.filter((x) => x.essencial)) console.error(`     -> ${f.comoFazer}`);
    }
    console.error('');
    process.exit(1);
  }
  // 3) o manifesto DESCREVE tudo que o roteiro usa? (e nada além disso)
  try {
    const video = JSON.parse(await readFile(path.join(VIDEO_DIR, `${id}.json`), 'utf8'));
    const { erros: eDeriv, avisos, compras } = conferirManifesto(video, man);
    if (compras.acoes.length || compras.libs.length) {
      console.log(`lista de compras derivada do ROTEIRO: ${compras.acoes.length} folha(s), ${compras.libs.length} personagem(ns) com movimento, ${compras.cenarios.length} cenário(s)`);
    }
    for (const a of avisos) console.log(`  aviso: ${a}`);
    if (eDeriv.length) {
      console.error(`\nFAIL o manifesto não cobre o roteiro (${eDeriv.length}) — nada foi gerado:\n`);
      for (const e of eDeriv) console.error('  · ' + e);
      console.error('');
      process.exit(1);
    }
  } catch (e) { console.log(`  (não consegui derivar do roteiro: ${e.message})`); }

  console.log(`OK contrato do manifesto e fichas dos ${slugs.length} personagens conferidos. Gerando...\n`);
  await run(path.join(VID, 'build-video.mjs'), args.slice(1));
  process.exit(0);
}

uso();
