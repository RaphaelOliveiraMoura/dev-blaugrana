// vigia.mjs · A MARCA DO Fut Gibi AINDA OBEDECE AO QUE ELA DECLARA?
//
// POR QUE EXISTE: o `tokens.json` é a fonte única da identidade, mas fonte única só vale enquanto
// alguém confere que as peças LEEM dela. Antes dele as cores estavam escritas à mão em 9 arquivos,
// 27 vezes, e o sintoma não era erro nenhum: era a marca divergindo devagar, peça por peça, sem
// nada ficar vermelho. Três defeitos reais desta pasta, todos silenciosos:
//
//   · o site linkava o `tokens.css` E redeclarava a paleta inteira à mão logo abaixo. Trocar um
//     hex no token não mudava o site, e ninguém descobriria isso olhando: as duas cópias estavam
//     iguais no dia em que a segunda foi escrita.
//   · a marca teve TRÊS grafias ao mesmo tempo, e a regra mudou duas vezes até parar de pé.
//     Hoje é "Fut Gibi": duas palavras, caixa mista, nunca em caixa alta, nem no logo.
//   · a arte escrevia texto de destaque em laranja-selo sobre verde, que dá 2,44 de contraste. As
//     duas peças de exemplo do manual violavam a regra que o próprio manual chama de "a que mais
//     pega", porque o laranja de BLOCO era a única cor de destaque exportada.
//
// Este arquivo é, pra MARCA, o que o `scripts/testes/vigia.test.mjs` é pro motor de animação: ele
// alimenta cada guarda com o caso sabidamente ruim e exige que ela reclame. O gate do mascote
// (§4) chega a FABRICAR a estrela dourada em memória e exigir que o detector acuse, porque
// detector que para de detectar devolve "tudo limpo" e é indistinguível de arte boa.
//
// Camada 2 do CLAUDE.md (barrado): sai com código 1 se algo reprovar.
//
//   node futgibi/marca/vigia.mjs [arquivo.png ...]
//
// Os PNG extras são opcionais e entram no §4, pra conferir arte nova antes de publicar.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { T, contraste } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FUTGIBI = path.join(AQUI, '..');
const RAIZ = path.join(FUTGIBI, '..');
const rel = (f) => path.relative(RAIZ, f);
const cru = (nome) => T.cor.global[nome]?.$value ?? null;

// ESTE ARQUIVO SAI DE TODA VARREDURA, e não é conveniência: um gate PRECISA nomear o defeito que
// caça. Este aqui escreve as grafias erradas, o hex de teste da estrela e a palavra LARANJA ao lado
// de `txt(`, então ele se auto-acusaria nos três primeiros gates e nasceria vermelho pra sempre,
// que é a forma mais rápida de um gate virar ruído que ninguém lê. É a mesma razão pela qual o
// `tokens.json` fica de fora do §2: ele é quem LISTA as formas proibidas.
// O preço é declarado: a fonte do vigia não é conferida por ele. Quem revisa isto é o olho.
const EU = fileURLToPath(import.meta.url);
const semEu = (lista) => lista.filter((f) => f !== EU);

// O CONTRAEXEMPLO DECLARADO. O manual mostra os erros DESENHADOS (o laranja escrevendo, o nome com
// espaço, a estrela dourada no peito), porque lista de "nunca" em texto é a forma mais fraca de
// ensinar. Só que um gate honesto não distingue o erro exibido de propósito do erro cometido: os
// dois são a mesma string no arquivo.
//
// A saída NÃO é liberar o arquivo inteiro, que apagaria o gate justamente onde a marca fala de si.
// É um marcador por LINHA, que obriga quem exibe o erro a dizer que sabe o que está fazendo. E o
// gate CONTA quantas linhas ignorou, senão "autorizado" vira "invisível" e o marcador vira porta.
const MARCA_IGNORA = 'vigia:contraexemplo';
let ignoradas = 0;
const ignorar = (linha) => {
  if (!linha || !linha.includes(MARCA_IGNORA)) return false;
  ignoradas++;
  return true;
};

let falhas = 0;
const OK = (m) => console.log(`  OK    ${m}`);
const FAIL = (m) => { falhas++; console.log(`  FAIL  ${m}`); };
const aviso = (m) => console.log(`  aviso ${m}`);
const conserto = (m) => console.log(`        conserto: ${m}`);
const secao = (t) => console.log(`\n== ${t} ==\n`);

// varredura de arquivos, sem dependência: `glob` de verdade é o que menos importa aqui
const varrer = (dir, ext, { fundo = true } = {}) => {
  if (!existsSync(dir)) return [];
  const saida = [];
  for (const nome of readdirSync(dir).sort()) {
    const f = path.join(dir, nome);
    if (statSync(f).isDirectory()) { if (fundo) saida.push(...varrer(f, ext, { fundo })); continue; }
    if (ext.some((e) => nome.endsWith(e))) saida.push(f);
  }
  return saida;
};
const linhasDe = (f) => readFileSync(f, 'utf8').split('\n');

console.log(`\nVIGIA DA MARCA · futgibi · tokens v${T.versao?.numero ?? '?'}`);

// ===========================================================================================
// GATE 1 · HEX ESCRITO À MÃO
// ===========================================================================================
// O DEFEITO QUE ELE PREVINE tem nome e endereço: o `site/index.html` linkava o `tokens.css` e
// redeclarava `--verde`, `--creme`, `--papel`, `--laranja` e `--preto` à mão dez linhas depois.
// Duas fontes de verdade que nascem idênticas e envelhecem separadas é o modo de falhar clássico
// da identidade visual, e ele não dá erro nunca: o site continua bonito, só que preso na paleta
// do dia em que a cópia foi feita.
//
// AUTORIZADOS existem porque nem todo hex é uma decisão de marca. O `tokens.json` é a fonte, o
// `tokens.css` é gerado a partir dela, e as folhas de PROVA (`prova-`, `provar-`, `variacoes-`)
// são contato interno que nunca vira post: nelas o hex é ferramenta de leitura, não identidade.
// Ainda assim elas são CONTADAS na saída, senão "autorizado" vira "invisível" e um dia uma peça
// publicada nasce dentro de um arquivo de prova sem ninguém notar.
const AUTORIZADOS = (base) => base === 'tokens.json' || base === 'tokens.css'
  || /^(prova-|provar-|variacoes-)/.test(base);

const HEX = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
// cinza de folha de contato: os três canais quase iguais (o `#1a1a1c` de fundo das provas). Não é
// cor da marca, é o preto da mesa onde as peças são fotografadas.
const neutro = (hex) => {
  const h = hex.length === 4
    ? [1, 2, 3].map((i) => parseInt(hex[i] + hex[i], 16))
    : [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(...h) - Math.min(...h) <= 16;
};

secao('GATE 1 · HEX ESCRITO À MÃO (a fonte única ainda é única?)');
{
  const alvos = semEu([
    ...varrer(AQUI, ['.mjs'], { fundo: false }),
    ...varrer(path.join(FUTGIBI, 'site'), ['.html']),
  ]);
  let culpados = 0, vistos = 0;
  for (const f of alvos) {
    const base = path.basename(f);
    const achados = [];
    linhasDe(f).forEach((linha, i) => {
      if (ignorar(linha)) return;
      for (const m of linha.matchAll(HEX)) achados.push({ n: i + 1, hex: m[0] });
    });
    if (!achados.length) continue;
    vistos += achados.length;

    // A ÚNICA EXCEÇÃO ESTRUTURAL: `<meta name="theme-color">` não aceita `var()`, então ali o hex
    // é obrigatório. Ignorar a linha seria o caminho fácil e deixaria a cor da barra do navegador
    // envelhecer sozinha; em vez disso o gate CONFERE o valor contra o token. Exceção que continua
    // sendo medida não é buraco.
    const meta = achados.filter((a) => /theme-color/.test(linhasDe(f)[a.n - 1]));
    for (const m of meta) {
      const nome = Object.entries(T.cor.global)
        .find(([, v]) => v.$value.toUpperCase() === m.hex.toUpperCase())?.[0];
      if (nome === T.cor.papel['fundo-marca'].$ref) OK(`${rel(f)}: theme-color ${m.hex} confere com --${nome}`);
      else {
        FAIL(`${rel(f)}: theme-color ${m.hex} não é a cor de marca (esperado ${cru(T.cor.papel['fundo-marca'].$ref)})`);
        conserto('meta não resolve var(): troque o valor à mão quando o token mudar. É a única exceção.');
      }
    }
    const restantes = achados.filter((a) => !meta.includes(a));
    if (!restantes.length) continue;
    achados.length = 0; achados.push(...restantes);

    if (AUTORIZADOS(base)) {
      const n = achados.filter((a) => neutro(a.hex)).length;
      aviso(`${rel(f)}: ${achados.length} hex à mão (${n} neutro(s) de folha de contato). Folha de prova, não reprova`);
      continue;
    }
    culpados++;
    FAIL(`${rel(f)}: ${achados.length} hex escrito(s) à mão`);
    for (const a of achados.slice(0, 8)) console.log(`          linha ${String(a.n).padStart(4)}  ${a.hex}`);
    if (achados.length > 8) console.log(`          ... e mais ${achados.length - 8}`);
  }
  if (culpados) {
    conserto('no .mjs, importe de ./tokens.mjs (VERDE, CREME, LARANJA, PRETO, ...);');
    conserto('no .html, use as variáveis de site/marca/tokens.css (var(--verde-campo), ...).');
    conserto('cor nova nasce no tokens.json e desce por `node futgibi/marca/tokens.mjs`.');
  } else {
    OK(`nenhum hex à mão fora dos autorizados (${alvos.length} arquivos varridos)`);
  }
  // guarda contra a guarda: varredura que não VISITA arquivo nenhum devolve o mesmo "tudo ok" de
  // uma pasta limpa, e foi assim que duas réguas deste projeto viraram no-op por mudança de pasta.
  if (!alvos.length) FAIL('a varredura não achou arquivo nenhum em futgibi/marca/*.mjs nem em futgibi/site/**/*.html. O gate ficou CEGO');
  else if (!vistos) aviso('nenhum hex em lugar nenhum, nem nas folhas de prova. Improvável o bastante pra desconfiar do gate antes de comemorar');
}

// ===========================================================================================
// GATE 2 · GRAFIA DO NOME
// ===========================================================================================
// Em 15/08/2026 a marca tinha TRÊS grafias vivas ao mesmo tempo, e a pior parte é que cada uma
// estava "certa" no seu canto: token, logos e site faziam três coisas diferentes. Nome de marca
// é a única coisa que o leitor decora, e nada nele dá erro quando está errado.
//
// DOIS FALSOS POSITIVOS que este gate tem que evitar, e os dois são armadilha de verdade:
//   (a) o gate procura só as formas de `escrita.nunca`. Desde 15/08/2026 a caixa alta ENTROU
//       nessa lista: ela era legítima no logo e deixou de ser.
//   (b) o próprio `tokens.json` LISTA as formas erradas no campo `nunca`. Um gate ingênuo se
//       auto-acusaria na fonte da verdade, e o conserto óbvio (apagar a lista) mataria o gate.
//       Por isso JSON está fora da varredura, com a cópia publicada do site nomeada junto.
const SEM_GRAFIA = new Set([
  path.join(AQUI, 'tokens.json'),
  path.join(FUTGIBI, 'site/marca/tokens.json'),
]);

secao('GATE 2 · GRAFIA DO NOME (a marca se escreve de um jeito só?)');
{
  const errado = T.marca.escrita.nunca;
  const certo = T.marca.escrita.texto;
  const alvos = semEu([
    ...varrer(FUTGIBI, ['.md']),
    ...varrer(path.join(FUTGIBI, 'site'), ['.html']),
    ...varrer(AQUI, ['.mjs'], { fundo: false }),
    ...varrer(path.join(AQUI, 'logo'), ['.svg'], { fundo: false }),
  ]).filter((f) => !SEM_GRAFIA.has(f));

  let ocorrencias = 0;
  for (const f of alvos) {
    const svg = f.endsWith('.svg');
    const achados = [];
    linhasDe(f).forEach((linha, i) => {
      if (ignorar(linha)) return;
      // no SVG só o TEXTO desenhado conta: id, comentário e nome de path não vão pra tela
      const alvo = svg ? [...linha.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]).join(' ') : linha;
      if (!alvo) return;
      for (const forma of errado) {
        let de = 0;
        while ((de = alvo.indexOf(forma, de)) !== -1) { achados.push({ n: i + 1, forma }); de += forma.length; }
      }
    });
    if (!achados.length) continue;
    ocorrencias += achados.length;
    FAIL(`${rel(f)}: ${achados.length} grafia(s) fora do padrão`);
    for (const a of achados.slice(0, 6)) console.log(`          linha ${String(a.n).padStart(4)}  "${a.forma}"`);
    if (achados.length > 6) console.log(`          ... e mais ${achados.length - 6}`);
  }
  if (ocorrencias) {
    conserto(`a marca se escreve "${certo}", em caixa mista, SEMPRE. Nem o logo usa caixa alta.`);
    conserto(`o handle é "${T.marca.escrita.handle}", minúsculo, porque é o que se digita.`);
  } else {
    OK(`nenhuma das ${errado.length} formas proibidas em ${alvos.length} arquivos (md, html, mjs e texto de svg)`);
  }
  // as duas formas deste gate virar no-op sem dar erro: a lista de formas proibidas sumir do
  // token, ou a varredura deixar de achar arquivo. As duas imprimiriam a mesma linha verde.
  if (!errado.length) FAIL('`marca.escrita.nunca` está vazio no tokens.json: este gate virou no-op');
  if (!alvos.length) FAIL('a varredura de grafia não achou arquivo nenhum. O gate ficou CEGO (a pasta futgibi/ saiu do lugar?)');
}

// ===========================================================================================
// GATE 3 · PAR TEXTO/FUNDO QUE REPROVA CONTRASTE
// ===========================================================================================
// (a) A TABELA NÃO PODE MENTIR. `texto-permitido` guarda o resultado MEDIDO de cada par, e número
//     medido guardado em documento envelhece calado: basta alguém ajustar um hex no `global` pra
//     que a tabela passe a autorizar um par que hoje reprova. Aqui ela é recalculada toda vez.
//
// (b) O LARANJA-SELO É COR DE BLOCO, NUNCA DE TEXTO. Ele dá 2,25 sobre creme e 2,44 sobre verde,
//     ou seja, reprova como texto em QUALQUER fundo da marca. Adivinhar o fundo de uma chamada de
//     texto dentro de um SVG montado por template é frágil e daria falso positivo, então este
//     gate não adivinha: ele reprova o LARANJA em `txt(` e pronto. Estreito e de alta precisão,
//     que é o que se quer de um gate, porque gate que erra vira gate que se ignora.
const MIN_CONTRASTE = 4.5;
const CORES_ARTE = ['LARANJA_TINTA', 'CREME_SOMBRA', 'VERDE_SOMBRA', 'VERDE_FUNDO', 'VERDE_MEIO',
  'NEUTRO_900', 'NEUTRO_700', 'NEUTRO_500', 'NEUTRO_300', 'NEUTRO_100',
  'LARANJA', 'CREME', 'PRETO', 'VERDE', 'PAPEL'];

secao('GATE 3a · A TABELA DE CONTRASTE AINDA FECHA?');
{
  const tabela = T.cor['texto-permitido'] ?? {};
  let pares = 0, ruins = 0;
  for (const [fundo, lista] of Object.entries(tabela)) {
    if (fundo.startsWith('_')) continue;
    const hexFundo = cru(fundo);
    if (!hexFundo) { FAIL(`texto-permitido declara o fundo "${fundo}", que não existe em cor.global`); continue; }
    for (const nome of lista) {
      const hexTinta = cru(nome);
      if (!hexTinta) { FAIL(`texto-permitido["${fundo}"] cita "${nome}", que não existe em cor.global`); ruins++; continue; }
      pares++;
      const c = contraste(hexFundo, hexTinta);
      if (c < MIN_CONTRASTE) {
        ruins++;
        FAIL(`${nome} sobre ${fundo} dá ${c.toFixed(2)}, e a tabela declara como PERMITIDO (mínimo ${MIN_CONTRASTE})`);
      }
    }
  }
  if (!pares) FAIL('`cor.texto-permitido` não tem par nenhum: o gate de contraste virou no-op e o tintaSobre() perdeu a régua');
  else if (!ruins) OK(`os ${pares} pares declarados foram recalculados e todos passam ${MIN_CONTRASTE}`);
  else conserto('ou o par sai da tabela, ou o hex volta pro valor que passava. Não arredonde o mínimo.');
}

secao('GATE 3b · LARANJA-SELO ESCREVENDO TEXTO NA ARTE');
{
  // extrai os argumentos de uma chamada `txt(` contando parênteses: as duas assinaturas da casa
  // põem a cor em lugares diferentes (5º posicional num arquivo, `{ cor }` no outro), então o que
  // se procura é a CONSTANTE dentro da chamada, não a posição dela.
  const argumentosDe = (src, abre) => {
    let n = 0;
    for (let i = abre; i < src.length; i++) {
      if (src[i] === '(') n++;
      else if (src[i] === ')') { n--; if (!n) return src.slice(abre + 1, i); }
    }
    return src.slice(abre + 1, abre + 400);
  };

  // `tintaSobre(LARANJA)` NÃO é o defeito, é a cura: ali o laranja é o FUNDO sobre o qual se
  // pergunta que tinta escreve, e a resposta que volta é o preto. Reprovar isso seria reprovar
  // justamente o padrão que o `tokens.mjs` recomenda ("a peça não escolhe cor de texto: ela
  // pergunta"), e gate que condena o conserto é gate que se aprende a ignorar. Por isso a
  // pergunta inteira sai da string antes de procurar a constante.
  const semPergunta = (args) => {
    let s = args, i;
    while ((i = s.indexOf('tintaSobre(')) !== -1) {
      let n = 0, fim = s.length;
      for (let j = i + 'tintaSobre'.length; j < s.length; j++) {
        if (s[j] === '(') n++;
        else if (s[j] === ')') { n--; if (!n) { fim = j + 1; break; } }
      }
      s = s.slice(0, i) + s.slice(fim);
    }
    return s;
  };

  let chamadas = 0, comCor = 0, culpadas = 0;
  for (const f of semEu(varrer(AQUI, ['.mjs'], { fundo: false }))) {
    const src = readFileSync(f, 'utf8');
    const quebras = [...src.matchAll(/\n/g)].map((m) => m.index);
    const linhaDe = (i) => quebras.findIndex((q) => q > i) + 1 || quebras.length + 1;
    const achados = [];
    for (const m of src.matchAll(/(^|[^\w.$])txt\s*\(/g)) {
      const abre = m.index + m[0].length - 1;
      if (/const\s+txt\s*=?\s*$/.test(src.slice(Math.max(0, m.index - 20), m.index + m[0].length - 4))) continue;
      chamadas++;
      const args = semPergunta(argumentosDe(src, abre));
      const cores = CORES_ARTE.filter((c) => new RegExp(`\\b${c}\\b`).test(args));
      if (cores.length) comCor++;
      if (cores.includes('LARANJA')) achados.push(linhaDe(abre));
    }
    if (!achados.length) continue;
    culpadas += achados.length;
    const prova = /^(prova-|provar-|variacoes-)/.test(path.basename(f));
    FAIL(`${rel(f)}: ${achados.length} chamada(s) txt() com LARANJA${prova ? ' (folha de prova, mas o laranja de texto não presta nem lá)' : ''}`);
    console.log(`          linhas ${achados.slice(0, 12).join(', ')}${achados.length > 12 ? ', ...' : ''}`);
  }
  if (culpadas) {
    conserto('sobre fundo CLARO use LARANJA_TINTA (4,87 no creme, 4,56 no papel).');
    conserto('sobre o VERDE não existe destaque de texto: o destaque é o SELO, bloco laranja com preto em cima.');
    conserto('na dúvida, pergunte em vez de escolher: tintaSobre(fundo, { destaque: true }).');
  } else {
    OK(`nenhuma chamada txt() escreve com o laranja-selo (${chamadas} chamadas varridas)`);
  }
  // A CLASSE DE DEFEITO FAVORITA DA CASA: validador que para de validar em silêncio. Se o helper
  // for renomeado ou a pasta mudar, este gate passa a aprovar tudo sem uma linha de erro.
  if (!chamadas) FAIL('nenhuma chamada `txt(` encontrada em futgibi/marca/*.mjs. O gate ficou CEGO (o helper foi renomeado? a pasta mudou?)');
  else if (!comCor) aviso(`${chamadas} chamadas txt() e nenhuma com constante de cor reconhecível. O gate está quase cego (as cores viraram variável?)`);
}

// ===========================================================================================
// GATE 4 · ESTRELA NO PEITO DO MASCOTE
// ===========================================================================================
// A camisa do torcedor-12 é creme LISA com o número 12 preto, e nada mais. A regra da marca é que
// aqui não existe clube; estrela de cinco pontas no peito lê como TÍTULO DE CLUBE e derruba a
// premissa inteira do canal numa imagem só. O modelo já inventou uma sozinho, mesmo com o prompt
// proibindo em caixa alta, e é por isso que o `tokens.json` chama isto de rede e não de prova.
//
// COMO ELE MEDE: a faixa do peito (35% a 65% da altura) não pode ter MANCHA de tinta saturada.
// Cada peça foi calibrada contra o acervo limpo, e cada limiar tem um motivo medido:
//
//   · SATURAÇÃO em HSV, não em HSL. Em HSL o creme #F3E7D0 aparece com 0,59 de saturação (o
//     denominador desaba em cor muito clara) e a camisa inteira do mascote virava suspeita. Em
//     HSV ele dá 0,14 e o dourado dá 0,74. Foi a troca que fez o detector enxergar.
//   · MATIZ 12°-42° FICA DE FORA: é a faixa da pele, da madeira e do papel envelhecido, que é
//     metade da paleta de uma ilustração desta casa (medido: a pele do mascote sai em 30°, com
//     0,64 de saturação, e acusaria o rosto e os braços em toda arte). O laranja-selo (26°) cai
//     nessa faixa junto, e tudo bem: ele é cor DA marca. O dourado de estrela sai em 46° e o
//     vermelho em 0°-10°, os dois fora da faixa, que é o que o gate precisa ver.
//   · VALOR ≥ 0,70 tira a grama das ilustrações (medida em 0,63) e o verde da marca (0,41).
//   · MANCHA CONEXA, não contagem solta de pixel. Contar pixel puro não separava: a folha
//     `recorte.png` tem 0,30% de tinta suspeita (uma camisa amarela DENTRO de um gibi desenhado
//     na cena) e uma estrela de 8% da largura dá 0,41%. Medindo a maior mancha, a mesma folha dá
//     2,28% de diâmetro contra 4,4% da estrela, e a mancha ainda diz ONDE olhar.
//   · COMPACIDADE ≥ 0,65 (menor lado da caixa dividido pelo maior). Emblema é redondo-ish: as
//     estrelas de teste dão 0,93 a 0,98. Os dois falsos positivos do acervo são figuras dentro de
//     quadrinhos desenhados na cena, e são compridas: 0,32 e 0,52. Com este filtro a maior mancha
//     compacta do acervo limpo cai pra 0,24% de diâmetro.
const PEITO = [0.35, 0.65];      // faixa vertical do peito, em fração da altura
const SAT_MIN = 0.60;            // HSV
const VAL_MIN = 0.70;
const PELE = [12, 42];           // matiz que sai da conta: pele, madeira, papel velho, laranja-selo
const COMPACTA_MIN = 0.65;       // emblema é largo e alto na mesma medida
const LIMIAR_MANCHA = 2.5;       // % da largura. Acervo limpo: 0,24. Estrela de 6% da largura: 3,2.

const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return [h < 0 ? h + 360 : h, mx === 0 ? 0 : d / mx, mx / 255];
};

async function medirPeito(entrada) {
  const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const y0 = Math.floor(H * PEITO[0]), y1 = Math.floor(H * PEITO[1]), BH = y1 - y0;
  const mascara = new Uint8Array(W * BH);
  let opacos = 0, suspeitos = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    if (data[i + 3] < 128) continue;                       // transparente não é tinta
    opacos++;
    const [h, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
    if (s < SAT_MIN || v < VAL_MIN) continue;
    if (h >= PELE[0] && h <= PELE[1]) continue;
    mascara[(y - y0) * W + x] = 1;
    suspeitos++;
  }
  // maior mancha conexa (4 vizinhos), iterativa pra não estourar a pilha em imagem grande
  const visto = new Uint8Array(W * BH), fila = new Int32Array(W * BH);
  let mancha = null, maiorBruta = 0;
  for (let p = 0; p < W * BH; p++) {
    if (!mascara[p] || visto[p]) continue;
    let n = 0, ini = 0, fim = 0, xa = W, xb = 0, ya = BH, yb = 0;
    fila[fim++] = p; visto[p] = 1;
    while (ini < fim) {
      const q = fila[ini++]; n++;
      const qx = q % W, qy = (q / W) | 0;
      if (qx < xa) xa = qx; if (qx > xb) xb = qx;
      if (qy < ya) ya = qy; if (qy > yb) yb = qy;
      if (qx > 0 && mascara[q - 1] && !visto[q - 1]) { visto[q - 1] = 1; fila[fim++] = q - 1; }
      if (qx < W - 1 && mascara[q + 1] && !visto[q + 1]) { visto[q + 1] = 1; fila[fim++] = q + 1; }
      if (qy > 0 && mascara[q - W] && !visto[q - W]) { visto[q - W] = 1; fila[fim++] = q - W; }
      if (qy < BH - 1 && mascara[q + W] && !visto[q + W]) { visto[q + W] = 1; fila[fim++] = q + W; }
    }
    const bw = xb - xa + 1, bh = yb - ya + 1;
    const diam = 2 * Math.sqrt(n / Math.PI) / W * 100;     // diâmetro equivalente, em % da largura
    if (diam > maiorBruta) maiorBruta = diam;
    const compacidade = Math.min(bw, bh) / Math.max(bw, bh);
    if (compacidade < COMPACTA_MIN) continue;
    if (!mancha || n > mancha.n) mancha = { n, diam, compacidade, x: xa, y: ya + y0 };
  }
  return {
    W, H,
    tinta: opacos ? suspeitos / opacos * 100 : 0,
    mancha: mancha?.diam ?? 0,
    bruta: maiorBruta,
    onde: mancha ? `${mancha.x},${mancha.y}` : null,
  };
}

// A ESTRELA FABRICADA. Nada disso toca o disco: o caso ruim nasce e morre em memória, porque o
// ponto é provar que o detector ACUSA, não deixar arte suja no repositório.
const estrelaDourada = (largura, fracao) => {
  const r = largura * fracao / 2, lado = Math.ceil(r * 2), pontos = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    pontos.push(`${(r + rr * Math.cos(a)).toFixed(1)},${(r + rr * Math.sin(a)).toFixed(1)}`);
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
    <polygon points="${pontos.join(' ')}" fill="#D4AF37" stroke="#8A6D1F" stroke-width="2"/></svg>`);
};

const sujar = async (arquivo, fracao = 0.12) => {
  const { width, height } = await sharp(arquivo).metadata();
  const estrela = estrelaDourada(width, fracao);
  const { width: ew } = await sharp(estrela).metadata();
  return sharp(arquivo)
    .composite([{ input: estrela, top: Math.round(height * 0.47), left: Math.round((width - ew) / 2) }])
    .png().toBuffer();
};

secao('GATE 4 · ESTRELA NO PEITO DO MASCOTE');
{
  const candidatos = [
    path.join(FUTGIBI, 'site/mascote.png'),
    path.join(AQUI, 'perfil.png'),
    ...varrer(path.join(AQUI, '_ilustracoes'), ['.png'], { fundo: false }),
    path.join(RAIZ, T.ilustracao.referencia),
    ...process.argv.slice(2).map((a) => path.resolve(a)),
  ].filter((f) => existsSync(f));

  if (!candidatos.length) {
    FAIL('nenhuma arte do mascote encontrada. O gate não tem o que medir (os caminhos saíram do lugar?)');
  } else {
    let pior = 0, piorNome = '';
    for (const f of candidatos) {
      const r = await medirPeito(f);
      const linha = `${rel(f)}  mancha ${r.mancha.toFixed(2)}%  (bruta ${r.bruta.toFixed(2)}%, tinta ${r.tinta.toFixed(2)}%)`;
      if (r.mancha >= LIMIAR_MANCHA) FAIL(`${linha}  <- tinta saturada em ${r.onde}, olhe o peito`);
      else OK(linha);
      if (r.mancha > pior) { pior = r.mancha; piorNome = path.basename(f); }
    }
    if (pior >= LIMIAR_MANCHA) {
      conserto('a camisa é creme LISA com o 12 preto e nada mais. Regere a arte, não retoque o gate.');
      conserto('se for falso positivo, olhe a folha antes de mexer no limiar: o detector é rede, não prova.');
    }

    // ---- o guarda alimentado com o caso sabidamente ruim -------------------------------------
    // Regra número um do vigia da casa. Sem isto, um detector que parou de detectar imprime a
    // mesma lista de OK que um acervo limpo, e as duas telas são idênticas.
    const cobaia = candidatos[0];
    const suja = await medirPeito(await sujar(cobaia, 0.12));
    if (suja.mancha < LIMIAR_MANCHA) {
      FAIL(`o detector NÃO acusou uma estrela dourada de 12% da largura colada no peito de ${path.basename(cobaia)} (mediu ${suja.mancha.toFixed(2)}%, limiar ${LIMIAR_MANCHA}%)`);
      conserto('o gate está CEGO: confira SAT_MIN/VAL_MIN/PELE. Nenhum OK acima vale nada enquanto isto estiver vermelho.');
    } else {
      OK(`o detector ACUSA a cobaia com estrela dourada colada no peito: ${suja.mancha.toFixed(2)}% em ${path.basename(cobaia)}`);

      // A MARGEM DECLARADA, e só faz sentido depois que o caso ruim disparou: detector cego mede
      // 0,00 nas duas pontas e sairia daqui com uma margem infinita e um OK. Limiar que separa por
      // sorte é pior que limiar nenhum, porque ele convence. Se as pontas encostarem, a saída diz.
      const margem = pior > 0 ? suja.mancha / pior : Infinity;
      if (Number.isFinite(margem) && margem < 2) {
        aviso(`MARGEM CURTA: a arte limpa mais suja é "${piorNome}" com ${pior.toFixed(2)}% e a cobaia com estrela deu ${suja.mancha.toFixed(2)}% (${margem.toFixed(1)}x).`);
        aviso('leia os números acima como AVISO, não como veredito: confira o peito olhando antes de publicar.');
      } else {
        const m = Number.isFinite(margem) ? `${margem.toFixed(0)}x` : 'nenhuma mancha compacta no acervo limpo';
        OK(`margem: limpa pior ${pior.toFixed(2)}% · limiar ${LIMIAR_MANCHA}% · com estrela ${suja.mancha.toFixed(2)}% (${m})`);
      }
    }
  }
}

// ===========================================================================================
if (ignoradas) console.log(`\n${ignoradas} linha(s) marcadas como \`${MARCA_IGNORA}\`: erro exibido de propósito, confira se ainda é o caso`);
console.log(`\n${falhas ? `${falhas} FAIL` : 'tudo passou'} · o que reprova aqui é marca divergindo, não estilo\n`);
process.exit(falhas ? 1 : 0);
