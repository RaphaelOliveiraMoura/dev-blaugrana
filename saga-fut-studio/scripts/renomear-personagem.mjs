// renomear-personagem.mjs [--dry] [--so=<slug>] [<de> <para>] — troca o SLUG de um personagem
// em TODO o acervo de uma vez: a pasta no disco, o `slug` gravado dentro de cada `_meta.json`,
// os dados (project.json, sagas, quadrinhos, vídeos), os manifestos de vídeo, o log e as pastas
// de gates, a documentação e o código.
//
// POR QUE ISTO EXISTE E NÃO UM `sed`, em cinco problemas que o `sed` erra:
//
// 1. ORDEM. `lamini` é prefixo de `lamini-riso` e de `irmao-lamini-riso`. Aplicada na ordem
//    errada, a tabela troca o pedaço de dentro do slug maior e o resultado sai corrompido. Aqui
//    ela é SEMPRE aplicada do slug mais longo pro mais curto. E o limite de palavra tem que
//    incluir o hífen: `\b` não serve, porque em `lamini-riso` o hífen é caractere não-palavra,
//    então `\blamini\b` casa DENTRO do slug maior. O `_`, ao contrário, é limite SIM: a pasta de
//    gate se chama `2026-08-03T02-05-12_lamini-riso_andar`.
//
// 2. SLUG QUE TAMBÉM É OUTRA COISA. `aranha` é o personagem, é a palavra portuguesa E é o id da
//    saga "A Aranha e a Catedral" (`data/sagas/aranha.json`, `episodios/aranha/`). Texto não
//    distingue namespace: um `sed` renomearia a saga junto e o studio passaria a ver duas.
//    Por isso o slug sem hífen entra como `soEstrutural` e some do texto livre; ele só troca como
//    REFERÊNCIA, e a troca nos dados é uma caminhada no objeto (ver motivo 4), não no texto.
//    Slug inventado (`lamini`, `halland`) troca em qualquer lugar, porque fora do projeto a
//    palavra não existe. O custo da escolha é declarado no fim, na lista REVISAR: o que ficou de
//    fora aparece nomeado, não some.
//
// 3. TEXTO ANTES DE PASTA. O `_meta.json` que precisa ser reescrito mora DENTRO da pasta que vai
//    ser renomeada. Movendo primeiro, o caminho anotado morre na mão. Então reescreve tudo por
//    dentro, e só depois move.
//
// 4. OS DADOS NÃO SÃO TEXTO, SÃO REFERÊNCIA. Em `data/` o mesmo `"aranha"` é o id do personagem
//    num lugar e o id da SAGA no outro. Então ali a troca anda no objeto sabendo onde está, e o id
//    das coleções irmãs (sagas, quadrinhos, vídeos, estilos) é devolvido intacto no fim. Vai tudo
//    pela API, nunca pelo disco: com o studio aberto, editar o arquivo direto é sobrescrito no
//    próximo save (mesma razão do migrar-dados.mjs). Por isso `data/project.json`, `data/sagas/`,
//    `data/quadrinhos/` e `data/videos/` ficam FORA da varredura de disco.
//
// 5. CONFERÊNCIA. No fim ele varre o acervo atrás do slug ANTIGO e falha se sobrou ocorrência.
//    Renomear pasta é a causa das duas únicas vezes em que um validador deste projeto parou de
//    validar em silêncio (a régua de escala virou no-op por meses, a respiração ficou desligada em
//    todos os vídeos), então a saída obrigatória daqui é rodar o vigia.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { CONTEUDO_DIR } from '../server/config.mjs';

const execFileP = promisify(execFile);
const RAIZ = path.resolve(CONTEUDO_DIR, '..');
const ESTE = fileURLToPath(import.meta.url); // a tabela abaixo cita os slugs velhos de propósito
const DRY = process.argv.includes('--dry');
const API = process.env.STUDIO_API || 'http://localhost:4600';

// ---------------------------------------------------------------- a tabela
//
// Convenção: `<nome-conhecido-sem-acento>[-variante][-estilo]`. O sufixo de estilo (`-riso` para
// `rabisco-riso`) fica porque o MESMO jogador existe em estilos diferentes, e a variante fica
// porque ele também existe em idades diferentes: só o sobrenome colidiria cinco vezes no Yamal.
const PARES = [
  // Erling Haaland. "halland" era grafia inventada pra não escrever o nome.
  ['halland-menino', 'haaland-menino'],
  ['halland-riso', 'haaland-riso'],
  ['halland', 'haaland'],

  // Lamine Yamal. Cinco fichas do mesmo jogador; o slug vira o sobrenome.
  ['irmao-lamini-riso', 'irmao-yamal-riso'], // o irmão é MENOR NÃO PÚBLICO: só a família é nomeada
  ['lamini-cartoon', 'yamal-cartoon'],
  ['lamini-menino', 'yamal-menino'],
  ['lamini-riso', 'yamal-riso'],
  ['lamini-bebe', 'yamal-bebe'],
  ['lamini', 'yamal'],

  // Kylian Mbappé.
  ['bappe-tartaruga-riso', 'mbappe-tartaruga-riso'],
  ['bappe-ditador-riso', 'mbappe-ditador-riso'],
  ['bappe-riso', 'mbappe-riso'],

  // Julián Álvarez. "aranha" é o apelido dele (La Araña) E a palavra aranha.
  ['aranha-menino', 'alvarez-menino'],
  ['aranha-riso', 'alvarez-riso'],
  ['aranha', 'alvarez', { soEstrutural: true }],

  // Pedri.
  ['pedrin-menino', 'pedri-menino'],
  ['pedrin-riso', 'pedri-riso'],

  // Lionel Messi.
  ['rei-menino', 'messi-menino'],
  ['rei-riso', 'messi-riso'],

  // Marc Cucurella. A grafia tinha um L a menos, e a variante passa pro meio.
  ['gato-cucurela-riso', 'cucurella-gato-riso'],
  ['cucurela-riso', 'cucurella-riso'],

  // Os que só tinham o nome truncado ou trocado pela função em cena.
  ['oyarza-riso', 'oyarzabal-riso'],                          // Mikel Oyarzabal
  ['ingles-riso', 'gordon-riso'],                             // Anthony Gordon
  ['presidente-riso-disfarcado', 'laporta-disfarcado-riso'],  // Joan Laporta
  ['presidente-riso', 'laporta-riso'],
  ['cholo-riso', 'simeone-riso'],                             // Diego Simeone

  // ---- lote 2: ambíguos + órfãs do elenco de seleção / variantes de clube ----
  // Ferran do Barça. A órfã `ferran-riso` (Espanha) já virou `ferran-espanha-riso`
  // numa passada anterior: o nome fica livre sem risco de cadeia.
  ['tubarao-riso', 'ferran-riso'],

  // Frenkie de Jong, Vinicius Jr, Cholo do epico-3d.
  ['frenki-riso', 'de-jong-riso'],
  ['vini-riso', 'vinicius-riso'],
  ['carcereiro', 'simeone-epico', { soEstrutural: true }],

  // Elenco órfão (arte no disco, sem ficha). `gavi`/`juiz`/`arg`/`esp` são curtos demais
  // pra texto livre, então só mexem como referência.
  ['julian-atletico', 'alvarez-atletico-riso'],
  ['raphinha-brasil', 'raphinha-brasil-riso'],
  ['adeyemi-dortmund', 'adeyemi-dortmund-riso'],
  ['pedrin', 'pedri-espanha-riso'],
  ['gavi', 'gavi-espanha-riso', { soEstrutural: true }],
  ['juiz', 'juiz-riso', { soEstrutural: true }],
  ['arg', 'jogador-argentina-riso', { soEstrutural: true }],
  ['esp', 'jogador-espanha-riso', { soEstrutural: true }],
];

// ---------------------------------------------------------------- varredura
const PULAR_DIR = new Set(['node_modules', '.git', '_backups', 'dist', 'build', 'tmp', '.cursor']);
const EXTS = new Set(['.json', '.jsonl', '.md', '.mjs', '.js', '.jsx', '.css', '.txt', '.html']);
// escritos pela API do studio: varrer no disco seria sobrescrito no próximo save
const SO_PELA_API = ['saga-fut/data/project.json', 'saga-fut/data/sagas', 'saga-fut/data/quadrinhos', 'saga-fut/data/videos']
  .map((p) => path.join(RAIZ, p));

const filtrado = process.argv.find((a) => a.startsWith('--so='))?.slice(5);
const avulso = process.argv.filter((a) => !a.startsWith('-')).slice(2);
const tabela = (avulso.length === 2 ? [[avulso[0], avulso[1]]] : PARES)
  .filter(([de]) => !filtrado || de === filtrado)
  .sort((a, b) => b[0].length - a[0].length); // ver motivo 1 no cabeçalho

if (!tabela.length) { console.error('FAIL nenhum par a aplicar (confira o --so=)'); process.exit(1); }

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Token de slug: [A-Za-z0-9-]. O `_` NÃO entra, pra casar dentro do nome da pasta de gate.
const reLivre = (s, g = 'g') => new RegExp(`(?<![A-Za-z0-9-])${esc(s)}(?![A-Za-z0-9-])`, g);
const soRef = ([, , op = {}]) => !!op.soEstrutural;
// Estrutural: o slug encostado em aspas, barra ou ponto. É valor de JSON, segmento de caminho ou
// nome de arquivo, nunca palavra no meio de uma frase.
const reEstrut = (s, g = 'g') => new RegExp(`(?<=["'/])${esc(s)}(?=["'/.])`, g);

// TEXTO, em três níveis. O par livre troca em qualquer lugar. O par `soEstrutural` troca só em
// arquivo de DADOS (.json/.jsonl), onde `"slug": "arg"` é referência inequívoca, e some da prosa,
// onde `arg` pode ser qualquer coisa. O que ele deixou passar sai na lista REVISAR no fim.
const EXTS_DADOS = new Set(['.json', '.jsonl']);
const regraEm = (par, ext) => (!soRef(par) ? reLivre : EXTS_DADOS.has(ext) ? reEstrut : null);
const trocarTexto = (txt, ext) => tabela.reduce((s, par) => {
  const re = regraEm(par, ext);
  return re ? s.replace(re(par[0]), par[1]) : s;
}, txt);
// NOME de arquivo ou pasta: o token já é referência por definição. O par `soEstrutural` vale
// em personagens/ e gates/ (lá o nome É o slug), mas NÃO em episodios/ (lá `aranha` é a saga).
const DIR_PERS = path.join(CONTEUDO_DIR, 'personagens') + path.sep;
const DIR_GATES = path.join(CONTEUDO_DIR, 'gates') + path.sep;
const trocarNome = (n, p) => tabela
  .filter((par) => !soRef(par) || p.startsWith(DIR_PERS) || p.startsWith(DIR_GATES))
  .reduce((s, [de, para]) => s.replace(reLivre(de), para), n);

// DADOS: aqui o slug é referência, não palavra. Troca só o valor que É o slug, ou o segmento de
// caminho que aponta pra pasta dele.
const MAPA = new Map(tabela.map(([de, para]) => [de, para]));
const rePath = (s) => new RegExp(`(?<=^|/)${esc(s)}(?=/|\\.|$)`, 'g');
const trocarRef = (s) => MAPA.get(s) ?? tabela.reduce((v, [de, para]) => v.replace(rePath(de), para), s);
// `sagaId`, `estiloId` e afins apontam pra OUTRO namespace: nunca são personagem.
const CHAVES_DE_OUTRO = new Set(['sagaId', 'estiloId', 'quadrinhoId', 'videoId', 'epId']);
const COLECOES_IRMAS = ['sagas', 'quadrinhos', 'videos', 'estilos'];
function andarDados(v, protegido = false) {
  if (typeof v === 'string') return protegido ? v : trocarRef(v);
  if (Array.isArray(v)) return v.map((x) => andarDados(x, protegido));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, andarDados(x, protegido || CHAVES_DE_OUTRO.has(k))]));
  }
  return v;
}
function trocarDados(dados) {
  const novo = andarDados(dados);
  // o `id` de saga/quadrinho/vídeo/estilo é de outro namespace e volta como estava
  for (const col of COLECOES_IRMAS) (novo[col] || []).forEach((item, i) => { item.id = dados[col][i].id; });
  return novo;
}

async function* andar(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (PULAR_DIR.has(e.name)) continue;
      yield { p, dir: true };
      yield* andar(p);
    } else yield { p, dir: false };
  }
}
const foraDoAlcance = (p) => p === ESTE || SO_PELA_API.some((s) => p === s || p.startsWith(s + path.sep));
const rel = (p) => path.relative(RAIZ, p);

// ---------------------------------------------------------------- plano
console.log(`\n== renomear personagem ==${DRY ? '  (dry-run, nada será tocado)' : ''}`);
console.log(`  pares: ${tabela.length}\n`);
for (const [de, para, op = {}] of tabela) console.log(`  ${de.padEnd(28)} -> ${para}${op.soEstrutural ? '   (só estrutural)' : ''}`);

const caminhos = [];   // arquivos/pastas cujo NOME carrega um slug antigo
const textos = [];     // arquivos cujo CONTEÚDO carrega um slug antigo
for await (const { p, dir } of andar(RAIZ)) {
  if (foraDoAlcance(p)) continue;
  const base = path.basename(p);
  const novoBase = trocarNome(base, p);
  if (novoBase !== base) caminhos.push({ p, dir, novo: path.join(path.dirname(p), novoBase) });
  if (dir || !EXTS.has(path.extname(p))) continue;
  const txt = await fs.readFile(p, 'utf-8').catch(() => null);
  if (txt == null) continue;
  const novo = trocarTexto(txt, path.extname(p));
  if (novo !== txt) textos.push({ p, txt: novo });
}
// mais fundo primeiro: renomear a pasta pai antes invalidaria o caminho dos filhos
caminhos.sort((a, b) => b.p.split(path.sep).length - a.p.split(path.sep).length);

console.log(`\n  pastas/arquivos a renomear: ${caminhos.length}`);
for (const c of caminhos.slice(0, 12)) console.log(`    ${rel(c.p)}\n      -> ${rel(c.novo)}`);
if (caminhos.length > 12) console.log(`    (+${caminhos.length - 12} outros)`);
console.log(`\n  arquivos a reescrever por dentro: ${textos.length}`);
for (const t of textos.slice(0, 12)) console.log(`    ${rel(t.p)}`);
if (textos.length > 12) console.log(`    (+${textos.length - 12} outros)`);

// COLISÃO: o destino já existir significa que ou o rename já rodou, ou existe uma pasta órfã com
// o nome que queremos. Nos dois casos o certo é parar, porque sobrescrever perderia arte.
const colisoes = [];
for (const c of caminhos) if (await fs.access(c.novo).then(() => true).catch(() => false)) colisoes.push(c);
if (colisoes.length) {
  console.error(`\nFAIL ${colisoes.length} destino(s) JÁ EXISTEM, nada foi tocado:`);
  for (const c of colisoes) console.error(`    ${rel(c.novo)}   (viria de ${rel(c.p)})`);
  process.exit(1);
}

// ---------------------------------------------------------------- dados (API)
const r = await fetch(`${API}/api/dados`).catch(() => null);
if (!r?.ok) { console.error(`\nFAIL não consegui ler ${API}/api/dados — o studio está rodando?`); process.exit(1); }
const dados = await r.json();
const antesDados = JSON.stringify(dados, null, 2);
const depoisDados = JSON.stringify(trocarDados(dados), null, 2);
const linhas = antesDados.split('\n'), linhasNovas = depoisDados.split('\n');
const linhasDados = linhas.filter((l, i) => l !== linhasNovas[i]).length;
console.log(`\n  dados pela API: ${linhasDados} linha(s) a reescrever`);
const amostra = linhas.map((l, i) => [l, linhasNovas[i]]).filter(([a, b]) => a !== b).slice(0, 6);
for (const [a, b] of amostra) console.log(`    ${a.trim()}   ->   ${String(b).trim()}`);

if (DRY) { console.log('\n  (dry-run: nada foi movido, reescrito nem salvo)\n'); process.exit(0); }

// ---------------------------------------------------------------- execução
// Conteúdo primeiro, caminho depois: ver motivo 3 no cabeçalho.
let reescritos = 0;
for (const t of textos) { await fs.writeFile(t.p, t.txt); reescritos++; }
let movidos = 0;
for (const c of caminhos) {
  // `git mv` mantém o histórico e já deixa a mudança no índice; pasta ainda não versionada não é
  // erro, só cai no rename normal.
  try { await execFileP('git', ['mv', c.p, c.novo], { cwd: RAIZ }); }
  catch { await fs.rename(c.p, c.novo); }
  movidos++;
}
let salvou = true;
if (antesDados !== depoisDados) {
  const put = await fetch(`${API}/api/dados`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: depoisDados,
  });
  salvou = put.ok;
  if (!salvou) console.error(`  FAIL ao salvar os dados: HTTP ${put.status} ${await put.text().catch(() => '')}`);
}
console.log(`\n  reescritos: ${reescritos} · renomeados: ${movidos} · dados: ${salvou ? 'ok' : 'FALHOU'}`);

// ---------------------------------------------------------------- conferência
// Sobra de slug antigo é o modo de falhar silencioso desta operação: o arquivo continua lá,
// ninguém reclama, e o defeito aparece meses depois como "esse personagem não anima".
//
// FAIL usa a MESMA regra que a troca usou, senão o gate cobraria o que ele mesmo não prometeu
// mexer. O que a regra estrutural deixou pra trás vira REVISAR, nomeado, porque cobertura parcial
// que não se declara lê como completa.
const sobras = [], revisar = [];
for await (const { p, dir } of andar(RAIZ)) {
  if (foraDoAlcance(p)) continue;
  if (trocarNome(path.basename(p), p) !== path.basename(p)) sobras.push(`${rel(p)}   (no nome)`);
  if (dir || !EXTS.has(path.extname(p))) continue;
  const txt = await fs.readFile(p, 'utf-8').catch(() => null);
  if (txt == null) continue;
  for (const par of tabela) {
    const re = regraEm(par, path.extname(p));
    if (re && re(par[0], '').test(txt)) sobras.push(`${rel(p)}   (contém "${par[0]}")`);
    else if (!re && reLivre(par[0], '').test(txt)) revisar.push(`${rel(p)}   (menciona "${par[0]}" em prosa)`);
  }
}
const dadosAgora = await fetch(`${API}/api/dados`).then((x) => x.json()).catch(() => null);
if (dadosAgora && JSON.stringify(trocarDados(dadosAgora)) !== JSON.stringify(dadosAgora)) {
  sobras.push('data/ (pela API)   (ainda tem referência a slug antigo)');
}

if (revisar.length) {
  console.log(`\n  REVISAR à mão, ${revisar.length} menção(ões) em texto livre (nada foi trocado nelas):`);
  for (const s of revisar.slice(0, 20)) console.log(`    ${s}`);
  if (revisar.length > 20) console.log(`    (+${revisar.length - 20} outras)`);
}
if (sobras.length) {
  console.error(`\nFAIL sobrou slug antigo em ${sobras.length} lugar(es):`);
  for (const s of sobras.slice(0, 30)) console.error(`    ${s}`);
  if (sobras.length > 30) console.error(`    (+${sobras.length - 30} outros)`);
  process.exit(1);
}
console.log('  conferência: nenhum slug antigo sobrou  ✓');
console.log('\n  PRÓXIMO, e não é opcional:');
console.log('    node scripts/testes/vigia.test.mjs      (os validadores AINDA acham o que guardam?)');
console.log('    node scripts/testes/contrato.test.mjs');
console.log('    node scripts/asset.mjs doutor\n');
process.exit(salvou ? 0 : 1);
