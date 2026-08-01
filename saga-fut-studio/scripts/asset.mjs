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
import { CONTEUDO, ESTILO_PATH, basePersonagem, loadStylePrefix, REACTION_VOCAB } from './sprites/config.mjs';
import { CLASSES, CLASSES_VALIDAS, gridDaClasse, statusPersonagem, validarManifesto, caminhoModelSheet, folhaEsqEstaVirada, statusSet } from './sprites/contratos.mjs';
import { GESTOS, GESTOS_VALIDOS, gestoPara } from './sprites/gestos.mjs';
import { VISTAS, VISTAS_VALIDAS } from '../shared/set.mjs';
import { ESTILOS_TESTE, ESTILOS_TESTE_IDS, arquivoTeste } from './sprites/estilos.mjs';
import { folhaBoneco } from '../shared/boneco.mjs';
import { folhaRosto, EXPRESSOES_IDS } from '../shared/rosto.mjs';
import { MAX_GERACOES_PARALELAS } from '../shared/constantes.mjs';
import { TIPOS_RIG, dirRig, rigMeta, prefixoRig, poseImagem, baseImagem, modelSheet } from '../shared/personagem.mjs';
import { VIDEO_DIR } from '../server/config.mjs';
import { conferirManifesto } from '../server/video/derivar.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPR = path.join(__dirname, 'sprites');
const VID = path.join(__dirname, 'video');
const RIG = path.join(__dirname, 'rig');
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
  asset pose <slug> <emoção> [--desc="..."] [--movel] [--close]
                                                  pose de reação reutilizável (comemorar, bravo, ...)
                                                  --close grava no canvas 2x (beat de rosto grande)
  asset estilo <slug> --todos | --como=<estilo>   estudo de estilo: o MESMO personagem noutra
                                                  linguagem visual (amostra, não asset)
  asset estilo --lista | [<slug>] --folha         candidatos · folha comparativa numerada
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
  // A FOLHA VIRADA SAI POR ESPELHO, NÃO POR GERAÇÃO.
  //
  // O prompt pedia "RUNNING FAST to the LEFT, FACING LEFT" em maiúsculas e o gerador devolvia o
  // personagem correndo pra DIREITA do mesmo jeito: as referências (base, model sheet, folha
  // anterior) olham todas pra direita e mandam mais que a instrução. Só que o `_meta.json` gravava
  // `dir: "left"` porque foi isso que PEDIRAM — e o INV-4 confere o movimento contra essa
  // declaração, não contra a arte. Resultado: três folhas -esq idênticas às de direita, o gate
  // aprovando, e os três velozes voltando de costas no vídeo.
  //
  // Espelhar por código é determinístico, custa zero geração e não tem como sair errado. O número
  // fica invertido, o que passou a ser aceito em 01/08/2026.
  if (esq) {
    const { existsSync } = await import('node:fs');
    const { readdir, copyFile } = await import('node:fs/promises');
    const origem = path.join(CONTEUDO, dirRig(slug, cmd, false));
    if (!existsSync(path.join(origem, `${prefixoRig(cmd)}1.png`))) {
      console.error(`FAIL "${slug}" não tem a folha de ${cmd} pra direita, que é a fonte do espelho.`);
      console.error(`     -> node scripts/asset.mjs ${cmd} ${slug}`);
      process.exit(1);
    }
    const destino = path.join(CONTEUDO, dirRig(slug, cmd, true));
    await (await import('node:fs/promises')).mkdir(destino, { recursive: true });
    console.log(`\n>>> ${cmd} ${slug} (esquerda) — ESPELHO da folha de direita, sem geração`);
    let n = 0;
    for (const f of (await readdir(origem)).filter((x) => /^[a-z]\d+\.png$/.test(x)).sort()) {
      const num = f.match(/(\d+)/)[1];
      await run(path.join(SPR, 'flop-sprite.mjs'), [path.join(origem, f), path.join(destino, `${prefixoRig(cmd, true)}${num}.png`)]);
      n++;
    }
    for (const extra of ['_card.png', '_sheet.png']) {
      if (existsSync(path.join(origem, extra))) await copyFile(path.join(origem, extra), path.join(destino, extra));
    }
    // a cronometragem viaja com a folha; o espelho herda a da origem e declara a direção
    let meta = {};
    try { meta = JSON.parse(await readFile(path.join(CONTEUDO, rigMeta(slug, cmd, false)), 'utf8')); } catch { /* sem meta na origem */ }
    await writeFile(path.join(CONTEUDO, rigMeta(slug, cmd, true)),
      JSON.stringify({ ...meta, slug, tipo: cmd, esq: true, dir: 'left', origem: 'espelho' }, null, 2) + '\n');
    console.log(`OK ${cmd} ${slug} -> ${dirRig(slug, cmd, true)} (${n} quadros espelhados)`);
    process.exit(0);
  }
  console.log(`\n>>> ${cmd} ${slug}`);
  await run(path.join(SPR, `${gen}.mjs`), [slug, flag('kit', ''), String(flag('num', '')), dir, flag('nota', '')]);
  await run(path.join(SPR, `${sli}.mjs`), [slug]);
  console.log(`OK ${cmd} ${slug} -> ${dirRig(slug, cmd, false)}`);
  process.exit(0);
}

// --------------------------------------------------------------------- cenario (a ficha do lugar)
// O cenário virou FICHA no acervo, como o personagem: um lugar com várias vistas. A vista derivada
// nasce do panorama (referência), pra não virar outro lugar sem ninguém pedir.
if (cmd === 'cenario') {
  const slug = args[1];
  if (!slug) { console.error('uso: asset cenario <slug> --desc="..." [--vista=panorama|angulo|perto] [--formato=3:2]'); process.exit(2); }
  // `--variacao=<nome>` = outro PEDAÇO do mesmo lugar (mesma vista lateral, MESMA linha de chão).
  // É o que quebra a monotonia do fundo sem sair do estilo 2D: cortar de um pro outro não muda o
  // tamanho de ninguém, porque o chão está na mesma altura.
  const variacao = flag('variacao');
  const vista = variacao ? `var-${variacao}` : flag('vista', 'panorama');
  if (!variacao && !VISTAS[vista]) { console.error(`FAIL vista "${vista}" não existe (use ${VISTAS_VALIDAS.join(' | ')} ou --variacao=<nome>)`); process.exit(1); }
  if (variacao && !/^[a-z0-9-]+$/.test(variacao)) { console.error('FAIL --variacao aceita só letras minúsculas, números e hífen'); process.exit(1); }
  const desc = flag('desc');
  if (!desc) {
    console.error('FAIL faltou --desc="<o lugar, sem gente>"');
    if (VISTAS[vista]) console.error(`     ${VISTAS[vista].guia}`);
    process.exit(1);
  }
  await run(path.join(SPR, 'gen-set.mjs'), [slug, vista, desc, flag('formato', '')]);
  const st = await statusSet(slug);
  console.log(`\nficha de "${slug}": ${st.tem.join(', ') || 'vazia'}`);
  for (const f of st.faltando) console.log(`  falta ${f.rotulo.padEnd(38)} -> ${f.comoFazer}`);
  process.exit(0);
}

// --------------------------------------------------------------------- rosto (animação limitada)
// UMA geração e o personagem tem reação pro resto da vida. É o caminho oposto ao do boneco: em vez
// de dar ao corpo qualquer pose, dá ao ROSTO qualquer estado e deixa o corpo quase parado — que é o
// que as referências do projeto fazem, e é mais legível e mais engraçado do que corpo se mexendo.
if (cmd === 'rosto') {
  const slug = args[1];
  if (!slug) { console.error('uso: asset rosto <slug> [--refazer]'); process.exit(2); }
  const temFolha = await access(path.join(CONTEUDO, folhaRosto(slug))).then(() => true).catch(() => false);
  if (temFolha && !args.includes('--refazer')) console.log('(folha de expressões já existe, pulando a geração; --refazer força)');
  else await run(path.join(SPR, 'gen-rosto.mjs'), [slug]);
  await run(path.join(RIG, 'fatiar-rosto.mjs'), [slug]);
  console.log(`\nexpressões disponíveis: ${EXPRESSOES_IDS.join(', ')}`);
  console.log(`prova: node scripts/rig/limitada.mjs ${slug}`);
  process.exit(0);
}

// --------------------------------------------------------------------- boneco (rig articulado)
// A folha de peças + o fatiador. Depois destes dois passos, GESTO É DADO: o personagem faz qualquer
// pose sem gerar nada. É o oposto do que vale hoje, em que cada gesto custa uma folha.
if (cmd === 'boneco') {
  const slug = args[1];
  if (!slug) { console.error('uso: asset boneco <slug> [--refazer]  ·  asset boneco <slug> --provar'); process.exit(2); }
  const folhaAbs = path.join(CONTEUDO, folhaBoneco(slug));
  const temFolha = await access(folhaAbs).then(() => true).catch(() => false);
  if (!args.includes('--provar')) {
    if (temFolha && !args.includes('--refazer')) console.log('(folha de peças já existe, pulando a geração; --refazer força)');
    else await run(path.join(SPR, 'gen-boneco.mjs'), [slug]);
    await run(path.join(RIG, 'fatiar-boneco.mjs'), [slug]);
  }
  await run(path.join(RIG, 'prova.mjs'), [slug]);
  process.exit(0);
}

// --------------------------------------------------------------------- estilo (estudo, não asset)
// POR QUE EXISTE: o estilo da casa (rabisco-riso) está embutido em TUDO — model sheet, folha de
// movimento, pose, cenário. Trocar de estilo custa o acervo inteiro, então a decisão tem que ser
// tomada olhando e ANTES. Este comando gera o mesmo personagem, na mesma cena de prova, em cada
// linguagem candidata, e monta a folha numerada pra escolher por comparação.
//
// O resultado NÃO é asset: mora em `estilos/testes/` e nenhum vídeo enxerga. Enquanto o estilo não
// foi escolhido, aquilo é amostra, e amostra que se parece com asset acaba entrando em vídeo.
if (cmd === 'estilo') {
  if (args.includes('--lista')) {
    console.log('\nCANDIDATOS DE ESTILO (o que muda na produção se for escolhido):\n');
    for (const [id, e] of Object.entries(ESTILOS_TESTE)) console.log(`  ${id.padEnd(16)} ${e.rotulo.padEnd(28)} ${e.nota}`);
    console.log('');
    process.exit(0);
  }
  if (args.includes('--folha')) { await run(path.join(SPR, 'folha-estilos.mjs'), args[1] && !args[1].startsWith('--') ? [args[1]] : []); process.exit(0); }

  const slug = args[1];
  if (!slug || slug.startsWith('--')) {
    console.error('uso: asset estilo <slug> --como=<estilo> | --todos [--cena="..."]');
    console.error('     asset estilo --lista            os candidatos e o que cada um custa');
    console.error('     asset estilo [<slug>] --folha   monta a folha comparativa numerada');
    process.exit(2);
  }
  const cena = flag('cena');
  let quais = args.includes('--todos') ? ESTILOS_TESTE_IDS : [flag('como')].filter(Boolean);
  if (!quais.length) { console.error(`FAIL passe --como=<${ESTILOS_TESTE_IDS.join('|')}> ou --todos`); process.exit(2); }
  for (const q of quais) if (!ESTILOS_TESTE[q]) { console.error(`FAIL estilo "${q}" não existe (asset estilo --lista)`); process.exit(1); }
  // NÃO REGERA O QUE JÁ EXISTE. Geração é o recurso caro do projeto, e `--todos` numa rodada em que
  // metade falhou por timeout é exatamente o caso comum: sem isto, retomar custa de novo o que já
  // deu certo. `--refazer` é o opt-out de quem quer mesmo a arte nova.
  if (args.includes('--todos') && !args.includes('--refazer')) {
    const antes = quais.length;
    const pendentes = [];
    for (const q of quais) if (!(await access(path.join(CONTEUDO, arquivoTeste(slug, q))).then(() => true).catch(() => false))) pendentes.push(q);
    quais = pendentes;
    if (antes !== quais.length) console.log(`(${antes - quais.length} já estavam prontos, pulando; --refazer força)`);
    if (!quais.length) { console.log('nada a gerar.'); await run(path.join(SPR, 'folha-estilos.mjs'), [slug]); process.exit(0); }
  }

  // FILA COM N TRABALHADORES, não lotes com barreira. A primeira versão dividia em lotes do
  // tamanho do teto e esperava o lote inteiro: um candidato que empacou (o anime-cel levou os 10
  // minutos do timeout) segurou os quatro seguintes parados atrás dele. Aqui cada trabalhador puxa
  // o próximo assim que termina o seu, então o lento atrasa só a si mesmo.
  const falhas = [];
  const fila = [...quais];
  let feitos = 0;
  const trabalhador = async () => {
    for (let q = fila.shift(); q; q = fila.shift()) {
      try { await run(path.join(SPR, 'gen-estilo.mjs'), [slug, q, cena || '']); }
      catch { falhas.push(q); }
      console.log(`   [${++feitos}/${quais.length}] ${q}${falhas.includes(q) ? ' FALHOU' : ''}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_GERACOES_PARALELAS, quais.length) }, trabalhador));
  if (falhas.length) console.warn(`\naviso: falharam ${falhas.join(', ')} — rode de novo só esses com --como=`);
  await run(path.join(SPR, 'folha-estilos.mjs'), [slug]);
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

  // FOLHA -esq QUE NÃO ESTÁ VIRADA: a declaração dizia "left" e a arte olhava pra direita. Não é
  // ausência, é declaração FALSA, que é pior — o INV-4 confere contra ela e aprova.
  const esqFalsa = [];
  for (const slug of slugs) {
    for (const tipo of TIPOS_RIG) {
      const r = await folhaEsqEstaVirada(slug, tipo).catch(() => null);
      if (r && !r.virada) esqFalsa.push(`${slug} ${tipo}-esq (parece a de direita: ${r.direta} vs espelho ${r.espelho})`);
    }
  }

  console.log('\n== DOUTOR: o que está declarado pela metade ==');
  bloco('FOLHAS -esq QUE NÃO ESTÃO VIRADAS', esqFalsa,
    'o _meta declara "left" mas a arte olha pra direita — o INV-4 confere a declaração e aprova, e o personagem anda de costas',
    'node scripts/asset.mjs <andar|correr> <slug> --dir=left (espelha por código, sem geração)');
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

// --------------------------------------------------------------------- pose (reação reutilizável)
// POR QUE EXISTE: `gen-react.mjs` já gravava a pose na biblioteca do personagem
// (`personagens/<slug>/poses/<emoção>.png`), mas só o `asset video` a chamava, derivando do roteiro.
// Quem precisa de UMA pose fora de vídeo (o card de gol precisa da comemoração do autor) não tinha
// porta: o gerador recusa execução direta e o hook barra a chamada por Bash. Mensagem que manda
// rodar comando inexistente é pior que mensagem nenhuma, então a porta passou a existir.
//
// A descrição tem padrão POR EMOÇÃO: sem isso `asset pose <slug> comemorar` não seria um comando
// de uma linha, e mensagem de erro que exige o operador escrever prompt em inglês não é acionável.
const DESC_PADRAO = {
  comemorar: 'celebrating a goal, both arms thrown up high, fists closed, mouth wide open shouting with joy, chest out, weight on the front foot',
  bravo: 'furious, eyebrows down, teeth clenched, both fists tight at the sides, leaning forward',
  triste: 'head down, shoulders dropped, arms hanging loose, defeated look',
  'maos-cabeca': 'both hands on top of the head, elbows out, eyes wide in disbelief',
  apontar: 'pointing straight ahead with one arm fully extended, the other arm at the side',
  pensativo: 'one hand on the chin, eyes looking up and to the side, thinking',
  apaixonado: 'hands clasped together at the chest, eyes shining, dreamy smile',
  assustado: 'recoiling backwards, both hands up in front of the chest, eyes wide, mouth open',
  rindo: 'laughing hard, head tilted back, one hand holding the belly',
  chocado: 'frozen in shock, jaw dropped, arms slightly open and stiff',
};
// O KIT VIAJA COM A POSE, não com quem escreve a descrição. A primeira pose gerada por esta porta
// (comemoração do Abdelkarim) voltou com a camisa listrada certa mas SEM o número 9 e SEM a estrela:
// o prompt manda manter rosto/cabelo/corpo idênticos e o kit ficava por conta da sorte. Como o
// número real é o que dá reconhecimento sem citar o nome, ele não pode depender de alguém lembrar
// de escrever isso no --desc.
// FALA EM "OUTFIT", NÃO EM "JERSEY": nem todo personagem do elenco veste uniforme de jogo. O
// ditador é um militar fardado (quepe, dragonas, martelo) com o número no peito, e um prompt que
// manda preservar "a camisa e os calções" convida o gerador a vestir ele de jogador — perdendo
// justamente o que faz o personagem ser ele. O número continua travado, porque é o que dá
// reconhecimento sem citar o nome.
const KIT_TRAVADO = ' Keep the OUTFIT IDENTICAL to the reference image, whatever it is (football kit,'
  + ' uniform, suit): same colours, same garments, same accessories and props, and the NUMBER or'
  + ' insignia on the chest plus the small plain golden star both clearly visible and not hidden by'
  + ' the arms; same legwear, same footwear.';
if (cmd === 'pose') {
  const [, slug, emocao] = args;
  if (!slug || !emocao) {
    console.error('uso: asset pose <slug> <emoção> [--desc="..."] [--movel]');
    console.error('vocabulário:', REACTION_VOCAB.join(', '));
    process.exit(2);
  }
  const temBase = await access(path.join(CONTEUDO, baseImagem(slug))).then(() => true).catch(() => false);
  if (!temBase) {
    console.error(`FAIL "${slug}" não tem base.png — a pose é gerada A PARTIR da caricatura-base.`);
    console.error('     -> cadastre o personagem no studio e gere a ficha antes.');
    process.exit(1);
  }
  // model sheet não trava (a pose usa base+estilo), mas sem ela a proporção varia entre poses
  const temModel = await access(path.join(CONTEUDO, modelSheet(slug))).then(() => true).catch(() => false);
  if (!temModel) console.warn(`aviso: "${slug}" não tem model sheet — a pose sai, mas a proporção pode variar. Conserto: asset model-sheet ${slug}`);
  const desc = flag('desc') || DESC_PADRAO[emocao];
  if (!desc) {
    console.error(`FAIL "${emocao}" não tem descrição padrão — passe --desc="<o que o corpo faz>".`);
    console.error('     com padrão:', Object.keys(DESC_PADRAO).join(', '));
    process.exit(1);
  }
  const poseRel = poseImagem(slug, emocao);
  const poseAbs = path.join(CONTEUDO, poseRel);
  console.log(`\n>>> pose ${slug} ${emocao}`);
  await run(path.join(SPR, 'gen-react.mjs'), [slug, emocao, desc + KIT_TRAVADO, ...(args.includes('--movel') ? ['movel'] : [])]);
  // o gen grava em magenta; o slice tira o fundo e ancora no pé, no MESMO arquivo (igual o build-video)
  // `--close` guarda no canvas 2x: é a pose que vai aparecer GRANDE (beat de reação em close), e a
  // fonte tem resolução pra isso — normalizar em 480x620 é que jogava fora metade dela.
  await run(path.join(SPR, 'slice-pose.mjs'), [poseAbs, poseAbs, ...(args.includes('--close') ? ['--retrato'] : [])]);
  console.log(`OK pose ${slug} ${emocao} -> ${poseRel}`);
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
  if (!slug || !nome) uso();
  // O CATÁLOGO ENTRA POR AQUI. `gestos.mjs` guarda descrição, fases, `muda` e cronometragem já
  // testadas, e a regra da casa é PREFERIR o catálogo — mas só o manifesto do build-video o
  // consultava: quem pedia uma folha por este comando tinha que redigir tudo de novo, à mão, e o
  // resultado voltava a depender de quem estava escrevendo naquele momento (foi assim que saiu a
  // folha com a cabeça variando 19%). Agora pedir um gesto do catálogo é só nomear o gesto; os
  // flags continuam existindo pra sobrescrever, que é a exceção.
  const doCatalogo = GESTOS[nome] || null;
  // a CLASSE também sai do catálogo: gesto com 9 fases é primária, com 4 é secundária. Pedir
  // primária pra um gesto que só tem 4 fases era um FAIL sem conserto na mensagem.
  const classe = flag('classe') || (doCatalogo ? (doCatalogo.fases16 ? 'complexa' : doCatalogo.fases9 ? 'primaria' : 'secundaria') : null);
  if (!classe) { console.error(`FAIL "${nome}" não está no catálogo (${GESTOS_VALIDOS.join(', ')}) — passe --classe e --desc/--fases/--muda à mão.`); process.exit(1); }
  if (!CLASSES[classe]) { console.error(`FAIL classe "${classe}" não existe (use ${CLASSES_VALIDAS.join(' | ')})`); process.exit(1); }
  let cat = null;
  if (doCatalogo) {
    try { cat = gestoPara(nome, classe); }
    catch (e) { console.error(`FAIL ${e.message}`); process.exit(1); }
  }
  const muda = flag('muda') || cat?.muda;
  if (!muda) { console.error('FAIL faltou --muda="<a única parte que se move>" — sem isso a folha sai pulsando'); process.exit(1); }
  const desc = flag('desc') || cat?.desc || '';
  const fases = flag('fases') || (cat ? cat.fases.join('|') : '');
  if (!fases) { console.error(`FAIL faltou --fases="fase1|fase2|..." (${gridDaClasse(classe).celulas} fases pra classe ${classe})`); process.exit(1); }
  // GATE: personagem incompleto não gera folha nova. Gerar ação pra quem não tem model sheet é
  // pagar geração pra uma sprite que vai sair fora de proporção.
  const st = await statusPersonagem(slug);
  if (!st.apto) {
    console.error(`FAIL "${slug}" não está apto: falta ${st.faltando.filter((f) => f.essencial).map((f) => f.rotulo).join(', ')}`);
    for (const f of st.faltando.filter((x) => x.essencial)) console.error(`     -> ${f.comoFazer}`);
    process.exit(1);
  }
  const { grid, celulas } = gridDaClasse(classe);
  console.log(`folha "${nome}" de ${slug}: classe ${classe} -> grid ${grid.join('x')} (${celulas} células)${cat ? ' · descrição, fases e cronometragem do CATÁLOGO' : ''}`);
  await run(path.join(SPR, 'gen-acao.mjs'), [slug, nome, desc, fases, flag('travado', ''), muda, flag('dir', 'right'), classe]);
  // fatiar faz parte de gerar: a folha sem fatiar não é sprite, e o passo esquecido some em silêncio
  await run(path.join(SPR, 'slice-acao.mjs'), [slug, nome, '', classe]);
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
  } catch (e) {
    // Só o vídeo AINDA não existir é motivo legítimo pra pular a conferência. Qualquer outro erro
    // aqui é o guarda parando de guardar em silêncio: este catch engoliu um ReferenceError de import
    // por tempo indeterminado, e nesse período "o manifesto cobre o roteiro?" nunca foi perguntado.
    if (e.code === 'ENOENT') console.log(`  (vídeo ${id}.json ainda não existe: manifesto não conferido contra o roteiro)`);
    else {
      console.error(`\nFAIL a conferência manifesto x roteiro QUEBROU (${e.message}) — nada foi gerado.`);
      console.error('  Isto não é o roteiro estar errado, é o validador em si. Conserte antes de gerar.\n');
      process.exit(1);
    }
  }

  console.log(`OK contrato do manifesto e fichas dos ${slugs.length} personagens conferidos. Gerando...\n`);
  await run(path.join(VID, 'build-video.mjs'), args.slice(1));
  process.exit(0);
}

uso();
