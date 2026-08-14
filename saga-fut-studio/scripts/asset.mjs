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
//   asset doutor                 o que está DECLARADO pela metade no acervo (buraco vira lista)
//   asset regras                 imprime o contrato vigente
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, writeFile, access, mkdir, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { CONTEUDO, ESTILO_PATH, basePersonagem, loadStylePrefix, REACTION_VOCAB } from './sprites/config.mjs';
import { CLASSES, CLASSES_VALIDAS, gridDaClasse, statusPersonagem, validarManifesto, caminhoModelSheet, statusSet } from './sprites/contratos.mjs';
import { GESTOS, GESTOS_VALIDOS, gestoPara } from './sprites/gestos.mjs';
import { PERSONAGEM_PADRAO } from './sprites/referencia.mjs';
import { VISTAS, VISTAS_VALIDAS } from '../shared/set.mjs';
import { MODELOS, MODELOS_VALIDOS, MODELO_PADRAO } from './sprites/modelo.mjs';
import { ESTILOS_TESTE, ESTILOS_TESTE_IDS, arquivoTeste } from './sprites/estilos.mjs';
import { MAX_GERACOES_PARALELAS, PORTA_API } from '../shared/constantes.mjs';
import { TIPOS_RIG, dirRig, rigMeta, prefixoRig, poseImagem, baseImagem, modelSheet, rigQuadro,
  dirVariacoes, variacaoImagem, variantesJson, baseAnterior, refImagem } from '../shared/personagem.mjs';
import sharp from 'sharp';
import { VIDEO_DIR, QUAD_DIR, PROJECT_FILE } from '../server/config.mjs';
import { conferirManifesto } from '../server/video/derivar.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPR = path.join(__dirname, 'sprites');
const VID = path.join(__dirname, 'video');
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n, d = null) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : d; };

// --modelo= VALE PRA TODO COMANDO, e viaja por variável de ambiente até o gerador.
//
// Antes só o `asset cenario` aceitava a flag, e os outros dez gen-* importavam o codex direto: na
// prática o seletor do studio não valia pra nada que passasse pelo asset. Agora o gen-* pergunta o
// modelo efetivo (override > seletor do studio > padrão, ver sprites/modelo.mjs) e a flag só põe o
// override no ambiente do subprocesso.
//
// Ambiente, e não arquivo, porque o override tem que ser ISOLADO: ele nasce e morre nesta execução,
// então testar um modelo aqui não muda o padrão global nem atrapalha um lote rodando em paralelo
// com outro modelo.
const modeloFlag = flag('modelo');
const envBase = { ...process.env, SAGAFUT_VIA_ASSET: '1', ...(modeloFlag ? { SAGAFUT_MODELO: modeloFlag } : {}) };

// os gen-* recusam execução direta; esta é a única função que abre a porta
const run = (script, cmdArgs) => new Promise((res, rej) => {
  const p = spawn('node', [script, ...cmdArgs], { stdio: 'inherit', env: envBase });
  p.on('error', rej);
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${path.basename(script)} saiu ${c}`))));
});

// --------------------------------------------------------------------- vocabulário do lote
// PASSOS: cada item do kit de um personagem. `tem` é o arquivo que prova que já foi feito (é a
// retomada: existe no disco = pula sem custo), `asset` é o subcomando DESTE arquivo que o produz.
//
// O lote não reimplementa nenhuma geração: ele chama `asset <passo> <slug>` como subprocesso. Se
// duplicasse a lógica, a porta única passaria a ter duas portas, e a segunda envelheceria calada.
//
// `depende` é a parte que não dá pra deixar por conta de quem lembra: a proporção de TODA folha sai
// do model sheet. Passo cuja dependência não está no disco NA HORA não roda: geração fora de ordem
// é geração paga pra sair errada.
// `ciclo` liga o gate de passada (ciclo.mjs) neste passo. Passo com `ciclo` NÃO é considerado pronto
// só porque o arquivo existe: se a folha que está no disco tem dois desenhos iguais, ela entra na
// fila pra ser REFEITA. É o que separa "tem sprite de andar" de "tem sprite de andar que anda".
const PASSOS = {
  model:        { rotulo: 'model sheet', tem: (s) => modelSheet(s),                   asset: (s) => ['model-sheet', s], depende: [] },
  idle:         { rotulo: 'idle',        tem: (s) => rigQuadro(s, 'idle', 1),         asset: (s) => ['idle', s],        depende: ['model'] },
  andar:        { rotulo: 'andar',       tem: (s) => rigQuadro(s, 'andar', 1),        asset: (s) => ['andar', s],       depende: ['model'], ciclo: 'andar' },
  correr:       { rotulo: 'correr',      tem: (s) => rigQuadro(s, 'correr', 1),       asset: (s) => ['correr', s],      depende: ['model'], ciclo: 'correr' },
};
// A ORDEM DENTRO DO KIT É A ORDEM DE EXECUÇÃO. Não é preferência: é a cadeia acima.
const KITS = {
  apto:      { passos: ['model', 'idle'], oque: 'o gate de aptidão: sem estes dois o personagem não entra em vídeo nenhum' },
  movimento: { passos: ['andar', 'correr'], oque: 'locomoção (uma folha por rig, sempre pra direita)' },
  vivo:      { passos: ['model', 'idle', 'andar', 'correr'], oque: 'o kit inteiro que o motor consome hoje' },
};

if (modeloFlag && !MODELOS[modeloFlag]) {
  console.error(`FAIL modelo "${modeloFlag}" não existe (use ${MODELOS_VALIDOS.join(' | ')})`);
  process.exit(2);
}

const uso = () => {
  console.log(`uso:
  asset status <slug>                             o que falta pro personagem entrar num vídeo
  asset personagem <slug> --ref=<foto> [--desc="..."] [--nome="..."]
                                                  ficha NOVA a partir de uma foto de rosto: guarda a
                                                  foto como referência de semelhança, cadastra e gera a base
  asset model-sheet <slug>                        gera o turnaround de 4 vistas
  asset folha <slug> <nome> --classe=<classe> --desc="..." --muda="..." [--travado="..."]
  asset video <id> [--dry] [--force]              build do vídeo (valida o manifesto antes de gerar)
  asset idle|andar|correr <slug> [--kit="..."] [--num=N] [--nota="..."]
                                                  gera+fatia a biblioteca de movimento (sempre pra direita)
  asset pose <slug> <emoção> [--desc="..."] [--movel] [--close]
                                                  pose de reação reutilizável (comemorar, bravo, ...)
                                                  --close grava no canvas 2x (beat de rosto grande)
  asset estilo <slug> --todos | --como=<estilo>   estudo de estilo: o MESMO personagem noutra
                                                  linguagem visual (amostra, não asset)
  asset estilo --lista | [<slug>] --folha         candidatos · folha comparativa numerada
  asset variacao <slug> --de=<arquivo.json> [--limpar]
                                                  refazer a ficha: N candidatas no rascunho + folha
                                                  numerada (acumula rodadas; a base só sai no promover)
  asset promover <slug> <n>                       a escolhida vira base.png E promptFicha
  asset lote <kit> [--faixa=abc] [--so=a,b] [--passo=correr] [--dry] [--refazer]
                                                  o kit inteiro no elenco todo, na ordem certa
  asset doutor                                    o que está declarado pela metade (buraco vira lista)
  asset regras                                    imprime o contrato vigente

  --modelo=<id> vale em QUALQUER comando acima e só nesta execução (não mexe no padrão do studio)

kits de lote: ${Object.entries(KITS).map(([id, k]) => `${id} (${k.passos.join(', ')})`).join(' · ')}

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
//
// UMA FOLHA POR RIG, SEMPRE PRA DIREITA. Existiu aqui um `--dir=left` que produzia uma folha
// própria virada (`rigs/andar-esq`), primeiro gerada e depois espelhada por código, porque espelhar
// um jogador COM número inverteria o número da camisa. Em 02/08/2026 ficou decidido que número
// invertido não é problema, e a variante inteira saiu: andar pra esquerda é o motor aplicando
// scaleX -1 na hora de montar a cena. O caminho mais simples é o que não precisa de guarda nenhuma.
const RIGS = { idle: ['gen-idle', 'slice-idle'], andar: ['gen-walk', 'slice-walk'], correr: ['gen-run', 'slice-run'] };
if (RIGS[cmd]) {
  const slug = args[1];
  if (!slug) { console.error(`uso: asset ${cmd} <slug> [--kit="..."] [--num=N] [--nota="..."] [--ref=<rel>]`); process.exit(2); }
  if (flag('dir')) { console.error('--dir não existe mais: a folha é sempre pra direita e o motor espelha (ver shared/personagem.mjs)'); process.exit(2); }
  const [gen, sli] = RIGS[cmd];
  console.log(`\n>>> ${cmd} ${slug}`);
  // Placeholders `-`: spawn droppa string vazia e o --ref= escorrega de slot.
  const argOu = (v) => (v == null || v === '' ? '-' : v);
  await run(path.join(SPR, `${gen}.mjs`), [
    slug,
    argOu(flag('kit', '')),
    argOu(String(flag('num', ''))),
    argOu(flag('nota', '')),
    argOu(flag('ref', '')),
  ]);
  await run(path.join(SPR, `${sli}.mjs`), [slug]);
  console.log(`OK ${cmd} ${slug} -> ${dirRig(slug, cmd)}`);
  process.exit(0);
}

// A ORIENTAÇÃO DA FOLHA NOVA É MEDIDA NA HORA, não declarada depois. Roda de graça (só lê pixels)
// e grava `olhaPara` no _meta, que é de onde o motor tira o espelho e o INV-4 tira a comparação.
// Sem isto, a peça nasceria sem o dado e voltaria a valer a convenção não verificada — que é
// exatamente como 12 peças do acervo ficaram viradas sem ninguém saber.
async function medirOrientacao(slug) {
  await run(path.join(SPR, 'medir-orientacao.mjs'), [slug]).catch((e) => console.warn(`aviso: não medi a orientação de ${slug}: ${e.message}`));
}

// A ESCALA DA POSE NOVA TAMBÉM É MEDIDA NA HORA. Toda peça é encaixada no canvas pela SILHUETA, e
// braço erguido (com taça, com bola de ouro) entra na silhueta: o corpo encolhe pra caber, e o
// personagem aparece 30% menor no meio do próprio vídeo. Aqui o fator vai pro `_meta.json` e o
// motor desfaz na hora de desenhar — o mesmo que as folhas de ação já faziam.
//
// Roda depois do slice, porque é a imagem JÁ normalizada que o motor vai usar.
async function medirEscalaPose(slug) {
  await run(path.join(SPR, 'medir-escala-pose.mjs'), [slug]).catch((e) => console.warn(`aviso: não medi a escala das poses de ${slug}: ${e.message}`));
}

// E DEPOIS: O CONJUNTO FECHA? Corrigir peça por peça não garante que o personagem seja UM SÓ — foi
// assim que a caminhada dele saiu 18% maior que a pose na mesma cena, cada uma "certa" pela sua
// régua. Isto compara o tamanho EFETIVO de todas as peças e reclama na hora, não no vídeo pronto.
async function conferirCoerencia(slug) {
  await run(path.join(SPR, 'coerencia-escala.mjs'), [slug]).catch(() => {});
}

// --------------------------------------------------------------------- cenario (a ficha do lugar)
// O cenário virou FICHA no acervo, como o personagem: um lugar com várias vistas. A vista derivada
// nasce do panorama (referência), pra não virar outro lugar sem ninguém pedir.
if (cmd === 'cenario') {
  const slug = args[1];
  if (!slug) { console.error(`uso: asset cenario <slug> --desc="..." [--vista=${VISTAS_VALIDAS.join('|')}] [--variacao=<nome>] [--formato=3:2] [--modelo=${MODELOS_VALIDOS.join('|')}]`); process.exit(2); }
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
  // `--modelo=` existe pra PROVAR um gerador novo sem tocar em nenhum gen-*: o prompt é o mesmo,
  // só a ferramenta que desenha muda. Sem a flag vale o padrão da casa (Codex).
  const modelo = flag('modelo', MODELO_PADRAO);
  if (!MODELOS[modelo]) { console.error(`FAIL modelo "${modelo}" não existe (use ${MODELOS_VALIDOS.join(' | ')})`); process.exit(1); }
  await run(path.join(SPR, 'gen-set.mjs'), [slug, vista, desc, flag('formato', ''), modelo]);
  const st = await statusSet(slug);
  console.log(`\nficha de "${slug}": ${st.tem.join(', ') || 'vazia'}`);
  for (const f of st.faltando) console.log(`  falta ${f.rotulo.padEnd(38)} -> ${f.comoFazer}`);
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
  const rigsSemMeta = [], folhasSemTempo = [], semModel = [], semAperto = [];
  // as duas abaixo são AUSÊNCIA DE PONTEIRO, não arte errada: nada falha, nada avisa, e o buraco
  // só aparece quando alguém olha a tela (a ficha sem `imagem` some da listagem do studio) ou
  // meses depois, quando uma geração nova sai com a cara de outra pessoa (sem ref.png).
  const semPonteiro = [], semFoto = [];
  const cadastro = await fetch(`${process.env.STUDIO_API || `http://localhost:${PORTA_API}`}/api/dados`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);

  for (const slug of slugs) {
    for (const tipo of TIPOS_RIG) {
      const pasta = path.join(CONTEUDO, dirRig(slug, tipo));
      if (!existsSync(pasta)) continue;
      if (!existsSync(path.join(pasta, '_meta.json'))) rigsSemMeta.push(`${slug} ${tipo}`);
    }
    for (const g of await rd(path.join(BASE, slug, 'acoes')).catch(() => [])) {
      const f = path.join(BASE, slug, 'acoes', g, '_meta.json');
      if (!existsSync(f)) { folhasSemTempo.push(`${slug}/${g} (sem _meta: refatie)`); continue; }
      try {
        const m = JSON.parse(await readFile(f, 'utf8'));
        if (!m.tempos) folhasSemTempo.push(`${slug}/${g}`);
        // APERTO NÃO DECLARADO = folha fatiada antes de a medição existir. Ela pode estar
        // encolhendo o personagem na tela e ninguém saberia: o motor só compensa o que a folha
        // declara. Refatiar é grátis (relê a _sheet que já está no disco), mas as folhas mais
        // antigas reprovam no gate de enquadramento de hoje — e aí o conserto é regerar.
        if (m.aperto == null) semAperto.push(`${slug}/${g}`);
      } catch { /* ilegível */ }
    }
    // PONTEIRO DA IMAGEM: a base está no disco e o cadastro aponta pra lugar nenhum
    if (cadastro && existsSync(path.join(CONTEUDO, baseImagem(slug)))) {
      const p = (cadastro.personagens || []).find((x) => x.id === slug);
      if (p && !String(p.imagem || '').trim()) semPonteiro.push(slug);
    }
    // FOTO DE SEMELHANÇA: sem ela toda geração de ficha deste personagem sai só do texto, e
    // descrever cara por texto é o modo de falhar campeão daqui (ver oblak-riso)
    if (cadastro && (cadastro.personagens || []).some((x) => x.id === slug)
      && !existsSync(path.join(CONTEUDO, refImagem(slug)))) semFoto.push(slug);
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

  bloco('Folhas sem `aperto` declarado', semAperto,
    'gesto amplo encolhe o personagem pra caber na largura do canvas; sem o número declarado o motor não desfaz',
    'node scripts/sprites/slice-acao.mjs <slug> <gesto> "" <classe>  (se reprovar no enquadramento, a folha é legada: regere)');

  // CICLO DE LOCOMOÇÃO REPROVADO: a folha existe e a passada não anda (dois desenhos iguais, ou a
  // perna de apoio que nunca troca). Não é ausência, é arte errada que passou — ver ciclo.mjs.
  const { validarCiclo } = await import('./sprites/ciclo.mjs');
  const ciclosRuins = [];
  for (const slug of slugs) for (const tipo of ['andar', 'correr']) {
    if (!existsSync(path.join(CONTEUDO, rigQuadro(slug, tipo, 1)))) continue;
    const r = await validarCiclo(slug, tipo).catch(() => null);
    if (r && r.nivel === 'fail') ciclosRuins.push(`${slug}/${tipo}: ${r.msg}`);
  }

  console.log('\n== DOUTOR: o que está declarado pela metade ==');
  bloco('CICLOS DE LOCOMOÇÃO REPROVADOS', ciclosRuins,
    'a folha existe mas a passada não anda — na tela isso lê como o personagem deslizando ou balançando',
    'node scripts/asset.mjs <andar|correr> <slug>  ·  em lote: asset lote movimento --faixa=abc');
  bloco('RIGS SEM _meta.json', rigsSemMeta,
    'o _meta carrega a cronometragem que o composer usa pra derivar velocidade e arco',
    'refatie o rig: node scripts/asset.mjs <idle|andar|correr> <slug>');
  bloco('FOLHAS DE GESTO SEM CRONOMETRAGEM', folhasSemTempo,
    'exposição uniforme = todo desenho o mesmo tempo, que é o flipbook mecânico',
    'declare tempos/chao/contato/loop em scripts/sprites/gestos.mjs e refatie (sem custo de geração)');
  bloco('FICHAS SEM PONTEIRO DE IMAGEM', semPonteiro,
    'a base.png está no disco mas o campo `imagem` do cadastro está vazio: a ficha some da listagem do studio sem erro nenhum',
    'abra a ficha no studio e salve, ou rode: node scripts/asset.mjs personagem <slug> --ref=<foto>');
  bloco('PERSONAGENS SEM FOTO DE SEMELHANÇA', semFoto,
    'sem personagens/<slug>/ref.png toda geração de ficha sai só do texto, e o traço deixa de parecer com a pessoa',
    'largue a foto de rosto em personagens/<slug>/ref.png (ou passe --ref= no asset personagem)');
  bloco('PERSONAGENS COM RIG MAS SEM MODEL SHEET', semModel,
    'sem ela cada folha nova sai numa proporção diferente (o personagem muda de tamanho ao trocar de gesto)',
    'node scripts/asset.mjs model-sheet <slug>');

  // PROTAGONISTA ANÔNIMO NO CARROSSEL: os painéis contam a história inteira dizendo "ELE", e o
  // nome mora só na legenda do POST. Quem não abre o "mais" (e o TikTok corta) termina o carrossel
  // sem saber de quem se trata. A §4 do SERIE-O-DIA-EM-QUE.md manda NOMEAR desde 05/08/2026 e
  // proíbe perífrase de suspense; isto aqui é a régua da regra que já existia no papel.
  //
  // POR QUE MORA NO DOUTOR E NÃO NO PUT: medido em 12/08/2026, a regra achava 9 episódios e 4 eram
  // FALSO POSITIVO (protagonista coletivo, menor de idade que a casa não nomeia por regra, legenda
  // desenhada na arte que o texto do JSON não vê). 44% de falso positivo num gate que BARRA vira
  // opt-out automático, e opt-out automático é a mesma coisa que gate desligado. Fila de trabalho
  // com 4 linhas pra ignorar é honesta; 400 que impede de salvar não é.
  const anonimos = [];
  if (cadastro) {
    const QDIR = path.join(CONTEUDO, 'data', 'quadrinhos');
    // POV e mascotes da casa não são pessoa real: exigir o nome deles na legenda é absurdo.
    const FICTICIO = /^(torcedor-cule|torcedor-cule-menino|vozinha-riso|duende-sorte|principe-riso|seguranca-riso|xeque-riso|marcao-retranca-riso|pai-viking|cabeludo-jorel|goleiro-frances-riso|mbappe-ditador-riso|mbappe-tartaruga-riso|cucurella-gato-riso)$/;
    const RUIDO = /^(riso|menino|bebe|bebê|cartoon|epico|épico|brasil|atletico|atlético|dortmund)$/i;
    const fichaDe = Object.fromEntries((cadastro.personagens || []).map((p) => [p.id, p]));
    const nomesDe = (f) => (f?.nome || f?.id || '').replace(/[-()]/g, ' ').split(/\s+/)
      .map((w) => w.trim()).filter((w) => w.length >= 4 && !RUIDO.test(w));

    for (const arq of (await rd(QDIR).catch(() => []))) {
      if (!arq.endsWith('.json')) continue;
      let q; try { q = JSON.parse(await readFile(path.join(QDIR, arq), 'utf8')); } catch { continue }
      if (!/O Dia Em Que|Isso Aconteceu Mesmo|Antes de Ser/i.test(q.selo || '')) continue;
      // legenda DESENHADA na arte: o texto não está no JSON, então não há o que medir aqui
      if (q.legendaPorCodigo !== true) continue;
      // opt-out declarado, pro caso legítimo (menor de idade, protagonista coletivo)
      if (String(q.protagonistaSemNome || '').trim()) continue;
      const paineis = q.paineis || [];
      if (paineis.length < 2) continue;
      const elenco = (q.elenco || []).map((id) => fichaDe[id]).filter((f) => f && !FICTICIO.test(f.id));
      if (!elenco.length) continue;
      // a CAPA pode guardar o nome (é o gancho, §3 da série); do painel 2 em diante, não
      const miolo = paineis.slice(1).map((p) => (p.legendas || []).join(' ')).join(' ');
      if (elenco.some((f) => nomesDe(f).some((n) => new RegExp(n, 'i').test(miolo)))) continue;
      anonimos.push(`${q.id} (${elenco.map((f) => f.nome || f.id).join(', ')})`);
    }
  }
  bloco('CARROSSEL QUE NUNCA NOMEIA O PROTAGONISTA', anonimos,
    'os painéis contam a história dizendo "ELE" e o nome fica só na legenda do post, que muita gente não abre e que o TikTok corta',
    'reescreva a legenda do painel 2 nomeando (e dizendo quem a pessoa É), depois remonte: POST /api/montar-imagem {carrossel:true}. Zero geração, o texto é vetorial. Caso legítimo (menor de idade, protagonista coletivo): declare o motivo em `protagonistaSemNome`');

  const total = rigsSemMeta.length + folhasSemTempo.length + semModel.length + semPonteiro.length + semFoto.length + anonimos.length;
  console.log(`\n${total === 0 ? 'acervo íntegro: nada declarado pela metade.' : `${total} pendência(s) de declaração.`}\n`);
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
  await medirOrientacao(slug);
  await medirEscalaPose(slug);
  await conferirCoerencia(slug);
  console.log(`OK pose ${slug} ${emocao} -> ${poseRel}`);
  process.exit(0);
}

// --------------------------------------------------------------------- lote (o kit no elenco todo)
// POR QUE EXISTE: o acervo tinha 96 personagens e 14 aptos, e o conserto era `asset <passo> <slug>`
// um por um, 146 vezes. Quem faz isso num `for` de shell perde as três coisas que importam:
//
//  1. A ORDEM. O model sheet é referência de todas as folhas seguintes e o idle é referência do
//     rosto. Num `for` a ordem depende de quem escreveu a linha; aqui ela é o kit, e passo com
//     dependência ausente NÃO RODA.
//  2. A RETOMADA. Numa rodada de 146, um punhado estoura o timeout. Sem "pula o que já existe",
//     retomar custa de novo tudo que deu certo. Geração é o recurso caro do projeto.
//  3. O PARALELISMO CERTO. Entre personagens é paralelo, DENTRO de um personagem é sequencial.
//     Um `for` chapado serializa tudo (4x mais lento) e um `&` chapado dispara o idle antes do
//     model sheet do mesmo sujeito.
if (cmd === 'lote') {
  const kitId = args[1];
  const kit = KITS[kitId];
  if (!kit) {
    console.error(`uso: asset lote <${Object.keys(KITS).join('|')}> [--faixa=abc] [--so=slug,slug] [--dry] [--refazer]`);
    for (const [id, k] of Object.entries(KITS)) console.error(`  ${id.padEnd(10)} ${k.passos.join(' -> ')}\n  ${''.padEnd(10)} ${k.oque}`);
    process.exit(2);
  }
  const { existsSync } = await import('node:fs');
  const ASSET = path.join(__dirname, 'asset.mjs');

  // FAIXA = QUANTO O PERSONAGEM É USADO, não quem lembrou dele. O uso sai dos dados (quantos
  // quadrinhos e vídeos citam o slug), então a fila se reordena sozinha quando o acervo muda.
  const proj = JSON.parse(await readFile(PROJECT_FILE, 'utf8'));
  const elenco = proj.personagens || [];
  const uso = Object.fromEntries(elenco.map((c) => [c.id, 0]));
  for (const dir of [QUAD_DIR, VIDEO_DIR]) {
    for (const f of await readdir(dir).catch(() => [])) {
      if (!f.endsWith('.json')) continue;
      const t = await readFile(path.join(dir, f), 'utf8');
      for (const c of elenco) if (t.includes(`"${c.id}"`) || t.includes(`personagens/${c.id}/`)) uso[c.id]++;
    }
  }
  const faixaDe = (n) => (n >= 4 ? 'a' : n >= 2 ? 'b' : 'c');

  const so = flag('so');
  const faixas = (flag('faixa', 'ab') || '').toLowerCase();
  const estilo = flag('estilo', 'rabisco-riso');
  let alvos = elenco;
  if (so) {
    // `--so` NOMEIA, e nomear vence o cadastro: 20 pastas do acervo não estão no project.json (e é
    // justamente onde estavam metade dos ciclos reprovados). Filtrar a lista cadastrada fazia o
    // comando aceitar o slug, não reclamar de nada e simplesmente não rodar aquele personagem.
    const pedidos = so.split(',').map((x) => x.trim()).filter(Boolean);
    const conhecidos = new Set(elenco.map((c) => c.id));
    alvos = [
      ...elenco.filter((c) => pedidos.includes(c.id)),
      ...pedidos.filter((s) => !conhecidos.has(s) && existsSync(path.join(CONTEUDO, 'personagens', s)))
        .map((s) => ({ id: s })),
    ];
    const inexistentes = pedidos.filter((s) => !conhecidos.has(s) && !existsSync(path.join(CONTEUDO, 'personagens', s)));
    if (inexistentes.length) { console.error(`FAIL não existe pasta pra: ${inexistentes.join(', ')}`); process.exit(1); }
  }
  else {
    // ESTILO FILTRA POR PADRÃO. As folhas saem todas com o prefixo de estilo da casa; rodar o lote
    // num personagem de outra saga (epico-3d, jorel-2d) paga geração pra devolver ele fora do
    // próprio estilo. `--estilo=todos` é o opt-out de quem sabe o que está fazendo.
    if (estilo !== 'todos') alvos = alvos.filter((c) => c.estiloId === estilo);
    alvos = alvos.filter((c) => faixas.includes(faixaDe(uso[c.id])));
  }
  alvos = alvos.map((c) => ({ slug: c.id, uso: uso[c.id] || 0 })).sort((a, b) => b.uso - a.uso);
  if (!alvos.length) { console.error(`nenhum personagem casa com o filtro (faixa=${faixas} estilo=${estilo}${so ? ` so=${so}` : ''}).`); process.exit(1); }

  // A FILA. Um item por personagem, com só os passos que faltam. `--refazer` ignora o disco.
  //
  // "FALTA" INCLUI O QUE ESTÁ LÁ E ESTÁ ERRADO. Um lote que só olha se o arquivo existe carimba como
  // pronto a folha de andar em que os quatro quadros são o mesmo desenho, e esse defeito não some
  // sozinho: some quando alguém regera. Por isso os passos com `ciclo` são MEDIDOS aqui, e o que
  // reprova entra na fila marcado como refação.
  const refazer = args.includes('--refazer');

  // `--passo=correr` RESTRINGE O KIT a um passo. Existe pro caso "a corrida de meia dúzia deles
  // ficou estranha": sem isso, refazer só a corrida em N personagens é `lote movimento --refazer`,
  // que leva a caminhada junto (arte boa jogada fora e o dobro de geração), ou um `for` de shell,
  // que perde a ordem, a retomada e o paralelismo do lote.
  const passoFiltro = (args.find((a) => a.startsWith('--passo=')) || '').replace('--passo=', '')
    .split(',').filter(Boolean);
  const desconhecido = passoFiltro.find((p) => !kit.passos.includes(p));
  if (desconhecido) {
    console.error(`FAIL o passo "${desconhecido}" não está no kit "${kitId}" (tem: ${kit.passos.join(', ')})`);
    process.exit(2);
  }
  const { validarCiclo } = await import('./sprites/ciclo.mjs');

  // LIXO DE RODADA INTERROMPIDA. O gerador faz `mkdir` da pasta do rig ANTES de gravar o primeiro
  // quadro, então um lote morto no meio (ctrl-c, timeout, máquina dormindo) deixa pastas de rig
  // vazias pelo acervo. Elas não atrapalham a fila, que olha o w1.png, mas fazem o vigia acusar
  // "rig sem _meta.json" pra um rig que não existe — ou seja, ruído que parece defeito. Como matar
  // o lote no meio é o caso NORMAL e não a exceção, ele limpa o próprio rastro ao começar.
  const { rm } = await import('node:fs/promises');
  let limpas = 0;
  for (const alvo of alvos) {
    for (const tipo of TIPOS_RIG) {
      const pasta = path.join(CONTEUDO, dirRig(alvo.slug, tipo));
      if (!existsSync(pasta)) continue;
      if ((await readdir(pasta).catch(() => ['?'])).length === 0) { await rm(pasta, { recursive: true }); limpas++; }
    }
  }
  if (limpas) console.log(`(${limpas} pasta(s) de rig vazia(s) de uma rodada interrompida, removidas)`);
  const semBase = [];
  const fila = [];
  let aGerar = 0;
  for (const alvo of alvos) {
    if (!existsSync(path.join(CONTEUDO, baseImagem(alvo.slug)))) { semBase.push(alvo.slug); continue; }
    const passos = [], refeitos = new Set();
    for (const p of kit.passos.filter((x) => !passoFiltro.length || passoFiltro.includes(x))) {
      const P = PASSOS[p];
      const noDisco = existsSync(path.join(CONTEUDO, P.tem(alvo.slug)));
      let motivo = null;
      if (refazer || !noDisco) motivo = noDisco ? 'refazer' : 'novo';
      else if (P.ciclo) {
        const r = await validarCiclo(alvo.slug, P.ciclo).catch(() => null);
        if (r && r.nivel === 'fail') motivo = 'ciclo';
      }
      if (!motivo) continue;
      if (motivo === 'ciclo' || motivo === 'refazer') refeitos.add(p);
      passos.push({ id: p, motivo });
    }
    if (!passos.length) continue;
    fila.push({ ...alvo, passos });
    aGerar += passos.filter((p) => !PASSOS[p.id].gratis).length;
  }
  const porCiclo = fila.flatMap((it) => it.passos).filter((p) => p.motivo === 'ciclo');
  const prontos = alvos.length - fila.length - semBase.length;

  console.log(`\nLOTE "${kitId}": ${kit.passos.join(' -> ')}`);
  console.log(`  ${kit.oque}`);
  console.log(`\nelenco: ${alvos.length} (faixa=${faixas} estilo=${estilo})${prontos ? ` · ${prontos} já completos, pulando` : ''}`);
  if (semBase.length) console.log(`  SEM base.png, fora do lote: ${semBase.join(', ')}  (-> asset personagem <slug> --ref=...)`);

  // O QUE O LOTE NÃO ENXERGA, DITO EM VOZ ALTA. A faixa e o estilo saem do project.json, então
  // pasta de personagem que existe no disco e não está cadastrada é INVISÍVEL pra esta fila. Sete
  // dos doze ciclos reprovados do acervo estavam exatamente aí: some da fila sem uma linha sequer,
  // e some parecendo que o lote cobriu tudo. Cobertura parcial que não se declara lê como completa.
  if (!so) {
    const noDisco = (await readdir(path.join(CONTEUDO, 'personagens'), { withFileTypes: true }))
      .filter((e) => e.isDirectory()).map((e) => e.name);
    const cadastrados = new Set(elenco.map((c) => c.id));
    const orfaos = noDisco.filter((s) => !cadastrados.has(s));
    if (orfaos.length) {
      const comCicloRuim = [];
      for (const s of orfaos) for (const t of ['andar', 'correr']) {
        if (!existsSync(path.join(CONTEUDO, rigQuadro(s, t, 1)))) continue;
        const r = await validarCiclo(s, t).catch(() => null);
        if (r && r.nivel === 'fail') comCicloRuim.push(`${s}/${t}`);
      }
      console.log(`  ${orfaos.length} pasta(s) no disco FORA do cadastro, logo fora desta fila: ${orfaos.slice(0, 8).join(', ')}${orfaos.length > 8 ? ` (+${orfaos.length - 8})` : ''}`);
      if (comCicloRuim.length) console.log(`    destas, com o ciclo REPROVADO: ${comCicloRuim.join(', ')}  (-> cadastre no studio, ou node scripts/asset.mjs <andar|correr> <slug>)`);
    }
  }
  for (const it of fila) console.log(`  ${it.slug.padEnd(24)} uso ${String(it.uso).padStart(2)}  ${it.passos.map((p) => `${p.id}${PASSOS[p.id].gratis ? '*' : ''}${p.motivo === 'ciclo' ? '(ciclo)' : ''}`).join(' ')}`);
  const minutos = Math.round((aGerar / Math.min(MAX_GERACOES_PARALELAS, Math.max(fila.length, 1))) * 3);
  console.log(`\n${aGerar} gerações em ${fila.length} personagens · ~${minutos}min a 3min/folha com ${MAX_GERACOES_PARALELAS} paralelos`);
  if (porCiclo.length) console.log(`  ${porCiclo.length} marcado(s) (ciclo): a folha existe mas REPROVOU no gate de passada, vai ser refeita`);
  if (args.includes('--dry')) { console.log('\n(--dry: nada foi gerado)\n'); process.exit(0); }
  if (!aGerar) { console.log('\nnada a gerar.\n'); process.exit(0); }

  // Saída CAPTURADA e prefixada pelo slug: com 4 trabalhadores escrevendo juntos, stdio herdado
  // vira uma sopa em que não dá pra saber de quem é o FAIL.
  const rodar = (cmdArgs) => new Promise((res, rej) => {
    // o lote chama o próprio asset como subprocesso: a flag de modelo tem que atravessar junto,
    // senão `asset lote --modelo=grok` geraria tudo no modelo padrão sem avisar
    const p = spawn('node', [ASSET, ...cmdArgs, ...(modeloFlag ? [`--modelo=${modeloFlag}`] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    const cap = (b) => { saida += b.toString(); };
    p.stdout.on('data', cap); p.stderr.on('data', cap);
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res(saida) : rej(Object.assign(new Error(`saiu ${c}`), { saida }))));
  });

  const falhas = [];
  const pulados = [];
  const pendentes = [...fila];
  let feitos = 0;
  const t0 = Date.now();
  const trabalhador = async () => {
    for (let it = pendentes.shift(); it; it = pendentes.shift()) {
      for (const { id: p, motivo } of it.passos) {
        const P = PASSOS[p];
        // a dependência é conferida NO DISCO, agora: cobre tanto o passo que acabou de falhar
        // quanto o buraco que já existia antes do lote começar.
        const faltando = P.depende.filter((d) => !existsSync(path.join(CONTEUDO, PASSOS[d].tem(it.slug))));
        if (faltando.length) {
          pulados.push({ slug: it.slug, passo: p, porque: `depende de ${faltando.join(', ')}` });
          console.log(`   [${++feitos}/${aGerar}] ${it.slug} ${p} PULADO (depende de ${faltando.join(', ')})`);
          continue;
        }
        // UMA SEGUNDA CHANCE, só pra quem tem gate de ciclo. O gerador acerta a passada uma vez sim
        // outra não, e reprovar de primeira devolveria ao humano um trabalho que a máquina resolve
        // sozinha metade das vezes. Duas e para: a terceira já é problema de arte, não de sorte.
        const tentativas = P.ciclo ? 2 : 1;
        let erro = null;
        for (let t = 1; t <= tentativas; t++) {
          try { await rodar(P.asset(it.slug)); erro = null; break; }
          catch (e) {
            erro = e;
            if (t < tentativas) console.log(`   ... ${it.slug} ${p} reprovou, tentando de novo (${t + 1}/${tentativas})`);
          }
        }
        if (!P.gratis) feitos++;
        if (erro) {
          falhas.push({ slug: it.slug, passo: p, saida: (erro.saida || erro.message || '').trim().split('\n').slice(-4).join(' | ') });
          console.log(`   [${feitos}/${aGerar}] ${it.slug} ${p} FALHOU`);
        } else {
          console.log(`   [${feitos}/${aGerar}] ${it.slug} ${p} ok${motivo === 'ciclo' ? ' (ciclo refeito)' : ''}`);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_GERACOES_PARALELAS, fila.length) }, trabalhador));

  console.log(`\n== LOTE "${kitId}" terminou em ${Math.round((Date.now() - t0) / 60000)}min ==`);
  const ok = aGerar - falhas.length - pulados.length;
  console.log(`  ${ok} feitos · ${falhas.length} falharam · ${pulados.length} pulados por dependência`);
  for (const f of falhas) console.log(`  FALHOU ${f.slug} ${f.passo}: ${f.saida}`);
  for (const p of pulados) console.log(`  PULOU  ${p.slug} ${p.passo}: ${p.porque}`);
  // FALHA VIRA COMANDO, não parágrafo. Rodar de novo é de graça pro que já deu certo.
  const rerodar = [...new Set([...falhas, ...pulados].map((x) => x.slug))];
  if (rerodar.length) console.log(`\n  rerodar só esses:\n  node scripts/asset.mjs lote ${kitId} --so=${rerodar.join(',')}`);
  console.log('');
  process.exit(falhas.length ? 1 : 0);
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
// --------------------------------------------------------------------- personagem (nasce de foto)
//
// A FOTO VAI PRO LUGAR CANÔNICO (`personagens/<slug>/ref.png`) ANTES de gerar qualquer coisa, e é
// isso que faz a semelhança valer pra SEMPRE: o `comporPrompt` procura esse arquivo sozinho e
// anexa como referência de aparência em TODA geração de ficha daquele personagem (variação, model
// sheet refeito, pose nova). Guardar a foto em outro canto entrega uma base parecida e deixa todo
// o resto do acervo dele sair de um desconhecido. 51 personagens já têm esse ref.png.
//
// O CADASTRO NASCE COM `imagem` PREENCHIDA. Ficha cadastrada com o campo vazio some da listagem do
// studio sem erro nenhum: a arte está no disco, o ponteiro é que não existe (aconteceu com o
// oblak-riso). É derivável do slug, então não tem por que ser digitável.
if (cmd === 'personagem') {
  const slug = args[1], ref = flag('ref');
  if (!slug || !ref) {
    console.error('uso: asset personagem <slug> --ref=<foto> [--desc="..."] [--nome="..."]');
    console.error('     a foto é de ROSTO, de FRENTE: descrever a cara por texto erra o traço (ver oblak-riso)');
    process.exit(2);
  }
  const fotoAbs = path.resolve(ref);
  if (!existsSync(fotoAbs)) { console.error(`FAIL não achei a foto: ${fotoAbs}`); process.exit(1); }

  const refRel = refImagem(slug), refAbs = path.join(CONTEUDO, refRel);
  await mkdir(path.dirname(refAbs), { recursive: true });
  if (path.resolve(refAbs) !== fotoAbs) {
    await sharp(fotoAbs).png().toFile(refAbs);
    console.log(`foto de semelhança -> ${refRel}  (usada em toda geração de ficha deste personagem)`);
  }

  // cadastro: cria se não existir, e SEMPRE garante o ponteiro da imagem
  const API = process.env.STUDIO_API || `http://localhost:${PORTA_API}`;
  const d = await fetch(`${API}/api/dados`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!d) { console.error(`\nFAIL não consegui ler ${API}/api/dados — o studio está rodando? (npm run dev)`); process.exit(1); }
  let p = (d.personagens || []).find((x) => x.id === slug);
  if (!p) {
    p = { id: slug, nome: flag('nome', slug.replace(/-riso$/, '').replace(/-/g, ' ')), arquetipo: '',
      regras: '', imagem: '', promptFicha: flag('desc', ''), estiloId: 'rabisco-riso', estiloExtra: '' };
    d.personagens.push(p);
    console.log(`cadastro criado: ${slug}`);
  }
  p.imagem = baseImagem(slug);
  const put = await fetch(`${API}/api/dados`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  if (!put.ok) { console.error(`FAIL o PUT /api/dados falhou (${put.status}): ${await put.text()}`); process.exit(1); }

  await run(path.join(SPR, 'gen-char.mjs'), [refRel, slug, flag('desc', '')]);
  console.log(`\npróximo passo obrigatório: node scripts/asset.mjs model-sheet ${slug}`);
  console.log(`se a cara não convenceu: node scripts/asset.mjs variacao ${slug} --de=<variantes.json>`);
  console.log(`   (as candidatas já nascem com a foto acima como referência de semelhança)`);
  process.exit(0);
}

// --------------------------------------------------------------------- variacao (refazer a ficha, escolhendo)
// POR QUE EXISTE: "o personagem ficou estranho" é o pedido mais comum do acervo, e até aqui a única
// resposta era regerar a base POR CIMA. Isso torra a versão anterior (que às vezes era a melhor),
// gera uma candidata por vez (comparar vira memória) e mistura duas perguntas diferentes: "o texto
// da ficha descreve o homem certo?" e "o modelo obedeceu ao texto?".
//
// Aqui as candidatas nascem NO RASCUNHO (`personagens/<slug>/_variacoes/`), várias de uma vez, cada
// uma com o SEU `promptFicha` — porque o modo de falhar campeão deste projeto é a ficha descrevendo
// outra pessoa e o gerador só obedecendo (flick, ferran, cucurella, gordon). Variar adjetivo é o
// experimento; a folha numerada é o resultado; `asset promover` é o commit.
//
// O arquivo de variantes é um JSON: [{ nome, promptFicha, nota?, estiloExtra? }]
//
// RODADA NOVA NÃO APAGA A ANTERIOR: as candidatas se ACUMULAM no rascunho e a folha mostra todas.
// "Não gostei de nenhuma" é a resposta normal da primeira rodada, e a segunda quase sempre quer
// mudar de modelo ou de eixo — se numerasse do 1 de novo, a rodada 2 escreveria por cima da 1 com
// nomes trocados, e a comparação que justifica a ferramenta morria na segunda tentativa.
// `--limpar` é o recomeço explícito, pra quando o álbum já não ajuda a decidir.
if (cmd === 'variacao') {
  const slug = args[1], de = flag('de');
  if (!slug || !de) { console.error('uso: asset variacao <slug> --de=<arquivo.json>  [--limpar] [--refazer]\n       o JSON é [{ "nome": "curto-grisalho", "promptFicha": "...", "nota": "o que muda" }]'); process.exit(2); }
  if (!existsSync(basePersonagem(slug))) console.warn(`aviso: ${slug} ainda não tem base.png — a folha sai sem a célula "ATUAL".`);
  const arqAbs = path.resolve(de);
  const novas = JSON.parse(await readFile(arqAbs, 'utf8').catch(() => { console.error(`FAIL não consegui ler ${de}`); process.exit(1); }));
  if (!Array.isArray(novas) || !novas.length) { console.error('FAIL o arquivo precisa ser um array com pelo menos uma variante'); process.exit(1); }
  for (const [i, v] of novas.entries()) {
    if (!v?.nome || !/^[a-z0-9-]+$/.test(v.nome)) { console.error(`FAIL variante ${i + 1}: "nome" é obrigatório e aceita só letras minúsculas, números e hífen (vira nome de arquivo)`); process.exit(1); }
    if (!String(v.promptFicha || '').trim()) { console.error(`FAIL variante ${i + 1} (${v.nome}): "promptFicha" é obrigatório — variação sem texto próprio é a mesma ficha rodada de novo`); process.exit(1); }
  }
  const dirAbs = path.join(CONTEUDO, dirVariacoes(slug));
  if (args.includes('--limpar')) { await rm(dirAbs, { recursive: true, force: true }); console.log(`(rascunho limpo: ${dirVariacoes(slug)})`); }
  await mkdir(dirAbs, { recursive: true });

  // O JSON viaja PRA DENTRO do rascunho: é ele que o `promover` lê pra escrever o texto vencedor no
  // cadastro. Candidata cujo texto se perdeu não dá pra promover, só pra olhar. O modelo fica
  // gravado junto porque é metade da explicação de por que uma candidata saiu melhor que a outra.
  const jsonRel = variantesJson(slug), jsonAbs = path.join(CONTEUDO, jsonRel);
  const antes = JSON.parse(await readFile(jsonAbs, 'utf8').catch(() => 'null')) || [];
  const variantes = [...antes, ...novas.map((v) => ({ ...v, modelo: modeloFlag || MODELO_PADRAO }))];
  await writeFile(jsonAbs, JSON.stringify(variantes, null, 2));
  if (antes.length) console.log(`(${antes.length} candidata(s) de rodadas anteriores continuam na folha; --limpar recomeça)`);

  // NÃO REGERA O QUE JÁ EXISTE (mesma regra do `asset estilo`): retomar uma rodada em que uma
  // estourou o timeout não repaga as outras duas.
  const fila = novas.map((v, k) => ({ v, i: antes.length + k })).filter(({ v, i }) =>
    args.includes('--refazer') || !existsSync(path.join(CONTEUDO, variacaoImagem(slug, i + 1, v.nome))));
  if (fila.length < novas.length) console.log(`(${novas.length - fila.length} já estavam prontas, pulando; --refazer força)`);

  const falhas = [];
  const trabalhador = async () => {
    for (let item = fila.shift(); item; item = fila.shift()) {
      try { await run(path.join(SPR, 'gen-variacao.mjs'), [slug, path.join(CONTEUDO, jsonRel), String(item.i)]); }
      catch { falhas.push(`${item.i + 1}. ${item.v.nome}`); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_GERACOES_PARALELAS, Math.max(fila.length, 1)) }, trabalhador));
  if (falhas.length) console.warn(`\naviso: falharam ${falhas.join(', ')} — rode de novo (as prontas são puladas)`);
  // rodada inteira no chão (cota estourada, provedor fora) não é caso de montar folha e ainda por
  // cima estourar no topo do erro que interessa
  if (falhas.length === fila.length && fila.length) { console.error('\nFAIL nenhuma candidata foi gerada — o erro do provedor está acima.'); process.exit(1); }
  await run(path.join(SPR, 'folha-variacoes.mjs'), [slug]);
  process.exit(0);
}

// --------------------------------------------------------------------- promover (a escolhida vira acervo)
// A arte E o texto trocam JUNTOS. Promover só o PNG deixaria o `promptFicha` antigo no cadastro, e a
// próxima regeração (model sheet novo, ficha refeita meses depois) voltaria calada ao personagem
// velho — o pior tipo de defeito deste projeto, o que não avisa.
//
// Pela API do studio, nunca pelo disco: com o studio aberto, editar `data/` direto é sobrescrito no
// próximo save (mesma razão do renomear-personagem.mjs).
if (cmd === 'promover') {
  const slug = args[1], n = Number(args[2]);
  if (!slug || !Number.isInteger(n) || n < 1) { console.error('uso: asset promover <slug> <n>   (o número da folha de variações)'); process.exit(2); }
  const dirAbs = path.join(CONTEUDO, dirVariacoes(slug));
  const arq = (await readdir(dirAbs).catch(() => [])).find((f) => f.startsWith(`${n}-`) && f.endsWith('.png'));
  if (!arq) { console.error(`FAIL não achei a variação ${n} em ${dirVariacoes(slug)} — rode \`asset variacao ${slug} --de=...\` antes`); process.exit(1); }
  const variantes = JSON.parse(await readFile(path.join(CONTEUDO, variantesJson(slug)), 'utf8').catch(() => 'null')) || [];
  const v = variantes[n - 1];
  if (!v?.promptFicha) { console.error(`FAIL o texto da variação ${n} não está em ${variantesJson(slug)} — sem ele a arte entra e a ficha fica descrevendo o personagem antigo`); process.exit(1); }

  const API = process.env.STUDIO_API || `http://localhost:${PORTA_API}`;
  const d = await fetch(`${API}/api/dados`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!d) { console.error(`\nFAIL não consegui ler ${API}/api/dados — o studio está rodando? (npm run dev)`); process.exit(1); }
  const p = (d.personagens || []).find((x) => x.id === slug);
  if (!p) { console.error(`FAIL personagem "${slug}" não está cadastrado no studio`); process.exit(1); }

  // a base que sai fica guardada: promover é escolha, e escolha se desfaz
  if (existsSync(basePersonagem(slug))) await copyFile(basePersonagem(slug), path.join(CONTEUDO, baseAnterior(slug)));
  await copyFile(path.join(dirAbs, arq), basePersonagem(slug));

  p.promptFicha = v.promptFicha;
  if (v.estiloExtra !== undefined) p.estiloExtra = v.estiloExtra;   // "" zera de propósito (ver gen-variacao)
  const put = await fetch(`${API}/api/dados`,{ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
  if (!put.ok) { console.error(`FAIL o PUT /api/dados falhou (${put.status}): ${await put.text()}\n     A ARTE JÁ FOI COPIADA — o texto da ficha ficou o antigo. Cole o promptFicha na mão no studio.`); process.exit(1); }

  console.log(`\nOK ${slug} ← variação ${n} (${v.nome})`);
  console.log(`   base.png trocada (a anterior está em ${baseAnterior(slug)})`);
  console.log(`   promptFicha atualizado no cadastro`);
  // TUDO QUE NASCEU DA BASE ANTIGA ficou velho. Não é erro de nada (por isso não é gate), é
  // ausência de atualização — e ausência não aparece em relatório de FAIL, então aparece aqui.
  const derivados = [
    ['model sheet', modelSheet(slug), `node scripts/asset.mjs model-sheet ${slug}`],
    ['idle', rigQuadro(slug, 'idle', 1), `node scripts/asset.mjs idle ${slug}`],
    ['andar', rigQuadro(slug, 'andar', 1), `node scripts/asset.mjs andar ${slug}`],
    ['correr', rigQuadro(slug, 'correr', 1), `node scripts/asset.mjs correr ${slug}`],
  ].filter(([, rel]) => existsSync(path.join(CONTEUDO, rel)));
  if (derivados.length) {
    console.log(`\n   ATENÇÃO: ${derivados.length} asset(s) ainda mostram o rosto ANTIGO (nasceram da base velha):`);
    for (const [rot, , cmdRefaz] of derivados) console.log(`     ${rot.padEnd(12)} ${cmdRefaz}`);
    console.log(`   na ordem acima (o model sheet dá a proporção de todo o resto).`);
  }
  console.log('');
  process.exit(0);
}

// --------------------------------------------------------------------- bibliotecas de movimento
for (const [nome, script, slicer] of [['idle', 'gen-idle.mjs', 'slice-idle.mjs'], ['andar', 'gen-walk.mjs', 'slice-walk.mjs'], ['correr', 'gen-run.mjs', 'slice-run.mjs']]) {
  if (cmd !== nome) continue;
  const slug = args[1]; if (!slug) uso();
  // argv dos gen-*: slug, kit, num, nota, refRel. Placeholders `-` (não '') porque o spawn
  // do Node DROPPA string vazia e o --ref= escorrega pro slot do kit. --ref= força a
  // identidade (ex.: base.png em vez do model sheet).
  const argOu = (v) => (v == null || v === '' ? '-' : v);
  await run(path.join(SPR, script), [
    slug,
    argOu(flag('kit', '')),
    argOu(flag('num', '')),
    argOu(flag('nota', '')),
    argOu(flag('ref', '')),
  ]);
  await run(path.join(SPR, slicer), [slug]);
  await medirOrientacao(slug);
  // O IDLE É A RÉGUA DAS POSES: regerar ele muda a referência de todas elas de uma vez, e um
  // `aperto` medido contra um idle que não existe mais é pior que nenhum. Remede na hora.
  if (nome === 'idle') await medirEscalaPose(slug);
  await conferirCoerencia(slug);
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
  // GATE: A ANIMAÇÃO NASCE NO PERSONAGEM-PADRÃO, SEMPRE.
  //
  // A regra é: todo gesto novo é feito primeiro no `torcedor-cule`, aprovado a olho, e só então
  // replicado em quem precisar. Não é burocracia, é o que sustenta o resto do sistema:
  //
  //   · a REFERÊNCIA DE POSE só existe se o padrão tiver a folha. Gerar `espalmar` direto no
  //     goleiro é gerar sem exemplo nenhum, que é exatamente a situação em que o modelo inventa —
  //     e foi medido: com referência a amplitude de passada foi de 40% pra 52%.
  //   · o padrão vira o acervo COMPLETO de encenação da casa. Qualquer personagem futuro se
  //     replica dele em vez de nascer do zero.
  //   · o custo de errar cai: aprovar o gesto UMA vez no padrão evita descobrir o defeito depois
  //     de gerar a mesma folha em cinco personagens.
  //
  // O opt-out é explícito (`--sem-padrao`) porque o caso legítimo existe e é raro: um gesto que só
  // faz sentido pra um personagem (o goleiro que espalma, o ditador que bate o martelo). Aviso
  // ninguém lê; erro com saída declarada obriga quem quer mesmo a dizer que quer.
  if (slug !== PERSONAGEM_PADRAO && !args.includes('--sem-padrao')) {
    const noPadrao = path.join(CONTEUDO, `personagens/${PERSONAGEM_PADRAO}/acoes/${nome}/_sheet.png`);
    if (!existsSync(noPadrao)) {
      console.error(`FAIL o personagem-padrão ainda não tem a folha "${nome}".`);
      console.error(`     A regra da casa é: a animação nasce no padrão, é aprovada olhando, e só então se replica.`);
      console.error(`     Sem isso, esta geração sai SEM referência de pose — que é quando o modelo inventa.`);
      console.error(`\n     faça primeiro:  node scripts/asset.mjs folha ${PERSONAGEM_PADRAO} ${nome}`);
      console.error(`     depois:         node scripts/asset.mjs folha ${slug} ${nome}`);
      console.error(`\n     se o gesto SÓ faz sentido neste personagem: --sem-padrao`);
      process.exit(1);
    }
  }

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
  // a trava do CATÁLOGO vale por padrão; a flag existe pra acrescentar caso a caso, não pra ser a
  // única fonte (ver gestoPara: o campo existia e não era lido por ninguém)
  const travado = flag('travado') || cat?.travado || '';
  // --corrigir="..." REFAZ a partir da folha atual em vez de gerar do zero (ver promptAcao)
  const corrigir = flag('corrigir', '');
  if (corrigir) console.log(`   modo CORREÇÃO: a folha atual entra como referência e só muda o que foi listado`);
  await run(path.join(SPR, 'gen-acao.mjs'), [slug, nome, desc, fases, travado, muda, flag('dir', 'right'), classe,
    ...(corrigir ? [`--corrigir=${corrigir}`] : [])]);
  // fatiar faz parte de gerar: a folha sem fatiar não é sprite, e o passo esquecido some em silêncio
  await run(path.join(SPR, 'slice-acao.mjs'), [slug, nome, '', classe]);
  await medirOrientacao(slug);
  // a folha de AÇÃO é onde o `aperto` mais erra (a régua dela é a largura da cabeça, que se
  // confunde com prop erguido), então é aqui que a conferência de conjunto mais paga
  await conferirCoerencia(slug);
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
