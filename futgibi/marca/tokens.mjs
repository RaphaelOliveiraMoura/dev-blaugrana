// A ponte entre o `tokens.json` e o resto: os scripts de arte importam DAQUI, nunca escrevem hex.
//
// POR QUE ELA EXISTE: antes deste par (json + ponte) as cores da marca estavam escritas à mão em 9
// arquivos, 27 vezes. Cada peça nova recomeçava a decisão, e o resultado era o esperado: nada
// convergia. Fonte única não é organização, é a única forma de o sistema não divergir sozinho.
//
// Ela também GERA o `site/marca/tokens.css`, pra que o site e a arte saiam do mesmo lugar. Rodar:
//   node futgibi/marca/tokens.mjs        # regrava o CSS a partir do JSON
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const T = JSON.parse(await readFile(path.join(AQUI, 'tokens.json'), 'utf8'));

// resolve a camada `papel` (semântica) até o valor cru
const cru = (nome) => T.cor.global[nome].$value;
const papel = (nome) => cru(T.cor.papel[nome].$ref);

// ------------------------------------------------------------------ o que os scripts de arte usam
export const VERDE = cru('verde-campo');
export const VERDE_FUNDO = cru('verde-fundo');
export const VERDE_SOMBRA = cru('verde-sombra');
export const VERDE_MEIO = cru('verde-meio');
export const CREME = cru('creme-papel');
export const CREME_SOMBRA = cru('creme-sombra');
export const PAPEL = cru('papel-fundo');
export const LARANJA = cru('laranja-selo');
export const PRETO = cru('preto-traco');

// A METADE QUE FALTAVA, e a falta tinha consequência visível. Até 15/08/2026 este arquivo exportava
// só o LARANJA (que é cor de BLOCO), então quem escrevia um subtítulo de destaque na arte não tinha
// alternativa e usava ele: 2,44 de contraste sobre verde, 2,25 sobre creme. As duas peças de
// exemplo do manual violavam a regra que o próprio manual chama de "a que mais pega".
export const LARANJA_TINTA = cru('laranja-tinta');
export const NEUTRO_900 = cru('neutro-900');
export const NEUTRO_700 = cru('neutro-700');
export const NEUTRO_500 = cru('neutro-500');
export const NEUTRO_300 = cru('neutro-300');
export const NEUTRO_100 = cru('neutro-100');

export const SERIE = Object.fromEntries(
  Object.entries(T.cor.serie).filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => [k, v.$value]));

export const HANDLE = T.marca.handle;
export const DOMINIO = T.marca.dominio;
export const NOME = T.marca.escrita.texto;
export const NOME_ALTA = T.marca.escrita.caixaAlta;
export const CHAMADA = T.voz.chamada.$value;
export const TESE = T.voz.tese.$value;
export const CONVITE = T.voz.convite.linhas;
export const CONVITE_APOIO = T.voz.convite.apoio;

export const POST = T.formato.post;             // { w, h, razao }
export const TAM_ARTE = T.tipografia.arte;      // { chamada, convite, apoio, handle, selo }

// ------------------------------------------------------------------ contraste, medido -----------
// A régua que decide o que pode escrever em cima do quê. Mora aqui e não numa planilha porque é o
// que o `tintaSobre()` consulta e o que o vigia confere: número solto em documento envelhece.
const canal = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => 0.2126 * canal(parseInt(hex.slice(1, 3), 16))
  + 0.7152 * canal(parseInt(hex.slice(3, 5), 16))
  + 0.0722 * canal(parseInt(hex.slice(5, 7), 16));
export const contraste = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const NOME_DE = Object.fromEntries(
  Object.entries(T.cor.global).map(([k, v]) => [v.$value.toUpperCase(), k]));
export const nomeDaCor = (hex) => NOME_DE[String(hex).toUpperCase()] ?? null;

// A PEÇA NÃO ESCOLHE COR DE TEXTO: ela PERGUNTA. Escolher era o caminho de errar, porque a resposta
// certa depende do fundo e ninguém confere contraste no meio de um layout.
//
// Sobre o verde não existe destaque de TEXTO, e isso não é um buraco: o laranja-tinta dá 1,13 ali, e
// o único âmbar claro o bastante pra passar 4,5 já é amarelo, que cai na primeira proibição da marca
// (verde e amarelo viram seleção). Sobre verde o destaque é o SELO, um bloco laranja com preto.
export const tintaSobre = (fundo, { destaque = false } = {}) => {
  const permitido = T.cor['texto-permitido'][nomeDaCor(fundo)] ?? [];
  if (!permitido.length) throw new Error(
    `tintaSobre: ${fundo} não é um fundo da marca (ou não tem par medido em texto-permitido)`);
  if (destaque) {
    const escolha = permitido.find((n) => n.startsWith('laranja'));
    if (escolha) return cru(escolha);
  }
  return cru(permitido[0]);
};

// ------------------------------------------------------------------ a fonte da ARTE ----------
// A arte gerada por código passou semanas saindo em Helvetica enquanto o site usava Oswald, e
// NINGUÉM VIU, porque o defeito não dá erro: o sharp resolve fonte pelo fontconfig, não acha a
// família pedida, cai no fallback e gera o PNG normalmente.
//
// O sharp/librsvg NÃO lê `.woff2` nem `@font-face` embutido em base64 (testado: a largura da
// tinta saía idêntica à da Helvetica). Ele só enxerga `.ttf`/`.otf` que o fontconfig indexa, e no
// macOS isso quer dizer `~/Library/Fonts`.
export const FONTE_ARTE = 'Oswald, "Arial Narrow", Helvetica, sans-serif';
// o LETTERING da arte: cartucho, balão e legenda, a mesma voz dos slides publicados
export const FONTE_QUADRINHO = '"Comic Neue", "Chalkboard SE", Helvetica, sans-serif';

// Mede a largura da TINTA de verdade: renderiza e acha o último pixel escrito. É a mesma medida que
// o `conferirFonte` usa pra flagrar fallback e que o `caber` usa pra decidir o corpo.
export const medirTinta = async (sharp, texto, tam, fonte = FONTE_ARTE) => {
  const w = Math.ceil(texto.length * tam * 1.2) + 200;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.ceil(tam * 2)}">
    <rect width="${w}" height="${Math.ceil(tam * 2)}" fill="white"/>
    <text x="10" y="${Math.round(tam * 1.3)}" font-family='${fonte}' font-size="${tam}"
      font-weight="bold" fill="black">${texto.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).raw().toBuffer({ resolveWithObject: true });
  let max = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = info.width - 1; x > max; x--)
      if (data[(y * info.width + x) * info.channels] < 128) { max = x; break; }
  return max - 10;
};

export const conferirFonte = async (sharp) => {
  const [oswald, helv] = [
    await medirTinta(sharp, 'FACA PARTE DA MAIOR', 80, 'Oswald'),
    await medirTinta(sharp, 'FACA PARTE DA MAIOR', 80, 'Helvetica'),
  ];
  if (oswald === helv) {
    console.error(`\nFAIL a Oswald não está disponível pro renderizador: a arte sairia em Helvetica.`);
    console.error(`     conserto: cp futgibi/marca/fontes-ttf/Oswald.ttf ~/Library/Fonts/`);
    console.error(`     (o .woff2 do site NÃO serve aqui: o sharp só enxerga .ttf/.otf)\n`);
    process.exit(1);
  }
};

// A FONTE ENCOLHE EM VEZ DE ESTOURAR. Vive aqui e não em cada script porque o defeito que ela
// evita não dá erro nenhum: o PNG é gerado, o script diz OK, e a linha longa sai CORTADA nas
// laterais. Só o olho pega, e só se estiver olhando.
//
// ELA MEDE, NÃO ESTIMA, e a diferença custou caro pra aparecer: a versão anterior multiplicava a
// contagem de caracteres por 0,62em, que é o passo da HELVETICA. Quando a arte migrou pra Oswald
// (0,485em medido) o fator ficou pra trás, e a função passou a encolher texto que cabia inteiro,
// sem nada acusar. Fator por caractere é sempre um chute sobre a fonte de ontem.
export const caber = async (sharp, linhas, tam, { largura = POST.w, margem = 80, fonte = FONTE_ARTE } = {}) => {
  const textos = linhas.map((l) => l.t ?? l);
  const larguras = await Promise.all(textos.map((t) => medirTinta(sharp, t, tam, fonte)));
  const usada = Math.max(...larguras);
  const disponivel = largura - margem * 2;
  return usada > disponivel ? Math.floor((tam * disponivel) / usada) : tam;
};

// ------------------------------------------------------------------------- o CSS, gerado do JSON
// Chamado quando este arquivo roda direto. O site NUNCA declara um hex: ele lê estas variáveis.
if (import.meta.url === `file://${process.argv[1]}`) {
  // as fontes são servidas do próprio domínio, então o @font-face também nasce daqui
  const faces = Object.entries(T.tipografia.fontes || {})
    .filter(([k]) => !k.startsWith('_'))
    .map(([, f]) => `@font-face{
  font-family:"${f.familia}";
  src:url("${f.arquivo}") format("woff2");
  font-weight:${f.peso}; font-style:normal; font-display:swap;
}`);

  const linhas = [
    '/* GERADO por futgibi/marca/tokens.mjs a partir de tokens.json. NÃO EDITE À MÃO. */',
    '/* Mude o tokens.json e rode: node futgibi/marca/tokens.mjs */',
    '',
    ...faces,
    '',
    ':root{',
    '  /* --- cor: valor cru --- */',
    ...Object.entries(T.cor.global).map(([k, v]) => `  --${k}:${v.$value};`),
    '',
    '  /* --- cor: o que o valor significa --- */',
    ...Object.entries(T.cor.papel).map(([k, v]) => `  --${k}:var(--${v.$ref});`),
    '',
    '  /* --- cor por série: cada uma vem de um material do gibi --- */',
    ...Object.entries(T.cor.serie || {})
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `  --serie-${k}:${v.$value};`),
    '',
    '  /* --- tipografia --- */',
    `  --fonte-texto:${T.tipografia.familia.texto.$value};`,
    `  --fonte-display:${T.tipografia.familia.display.$value};`,
    `  --fonte-quadrinho:${T.tipografia.familia.quadrinho.$value};`,
    ...Object.entries(T.tipografia.escala)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `  --t-${k}:${v.$value};`),
    `  --peso-display:${T.tipografia.escala.display.peso};`,
    '',
    '  /* --- traço e sombra: sempre 0 de blur --- */',
    ...Object.entries(T.traco)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `  --${k}:${v.$value}${k.startsWith('sombra') ? ' var(--preto-traco)' : ''};`),
    '}',
  ];
  const saida = path.join(AQUI, '../site/marca/tokens.css');
  await mkdir(path.dirname(saida), { recursive: true });
  await writeFile(saida, linhas.join('\n') + '\n');
  console.log('OK ->', saida);

  // O JSON também é PUBLICADO no site: o manual da marca lê a fonte em tempo de renderização, e
  // pra isso ela precisa estar dentro do que o servidor enxerga. É cópia gerada, não segunda
  // fonte: quem edita continua sendo o marca/tokens.json.
  const copia = path.join(AQUI, '../site/marca/tokens.json');
  await writeFile(copia, JSON.stringify(T, null, 2) + '\n');
  console.log('OK ->', copia);

  // ------------------------------------------------------------------ os ativos, publicados
  // O site só serve o que está dentro de `site/`, então os SVG da marca vivem em DUAS pastas. Isso
  // é uma segunda fonte esperando pra divergir: bastava alguém desenhar um ícone novo e esquecer
  // de copiar pro site (ou pior, ajustar só a cópia). Hoje a cópia é GERADA daqui, como o CSS.
  const publicar = async (de, para, filtro = () => true) => {
    const origem = path.join(AQUI, de), destino = path.join(AQUI, para);
    await mkdir(destino, { recursive: true });
    const arquivos = (await readdir(origem)).filter(filtro);
    for (const a of arquivos) await copyFile(path.join(origem, a), path.join(destino, a));
    console.log(`OK -> ${para}  (${arquivos.length} arquivos)`);
  };
  const svg = (a) => a.endsWith('.svg');
  await publicar('svg', '../site/marca/svg', svg);
  // as TRÊS peças de logo são PNG (o desenho do Codex recolorido; vetorizar deixou pior). Os SVG
  // que ainda saem daqui são os ícones numerados, não a marca. Os favicon-*.png são gerados
  // direto no site pelo gerar-logo-oficial.mjs, então ficam de fora daqui.
  await publicar('logo', '../site/marca/logo',
    (a) => (a.endsWith('.svg') || a.endsWith('.png')) && !a.startsWith('favicon'));
  // os spots: os descartados (listra, camuflagem) e a folha de contato ficam fora do site
  await publicar('spots', '../site/marca/spots',
    (a) => a.endsWith('.png') && !a.includes('_descartado') && !a.startsWith('_'));
  // a RESERVA de ícones aprovados (17/08/2026): o manual mostra a galeria na seção de logo
  await publicar('icones-reserva', '../site/marca/icones-reserva', (a) => a.endsWith('.png'));

  // As PEÇAS DE EXEMPLO do manual são curadoria, não ativo bruto: o mapa diz qual arquivo ilustra
  // o quê. Ele existe porque a pasta de exemplos acumulou três ilustrações que o manual não mostra
  // mais, e ninguém tinha como saber quais estavam em uso.
  const EXEMPLOS = {
    '_variacoes-composicao/respiro.png': 'post-respiro.png',
    '_variacoes-composicao/faixa.png': 'post-faixa.png',
    '_ilustracoes/capa-leitor.png': 'capa.png',
    '_ilustracoes/topo2.png': 'arte-topo.png',
    '_ilustracoes/base2.png': 'arte-base.png',
  };
  const dirEx = path.join(AQUI, '../site/marca/exemplos');
  await mkdir(dirEx, { recursive: true });
  for (const [de, para] of Object.entries(EXEMPLOS))
    await copyFile(path.join(AQUI, de), path.join(dirEx, para));
  console.log(`OK -> ../site/marca/exemplos  (${Object.keys(EXEMPLOS).length} peças)`);

  // As FOLHAS DE PROVA das aplicações, que o manual mostra na seção 11. O caminho de cada uma é
  // declarado no próprio token (`aplicacao.*.prova`), então publicar é seguir o que já está dito:
  // não há segunda lista pra esquecer de atualizar quando nascer uma aplicação nova.
  let provas = 0;
  for (const a of Object.values(T.aplicacao)) {
    if (!a?.prova) continue;
    const de = path.join(AQUI, '..', a.prova);
    const para = path.join(AQUI, '../site', a.prova);
    await mkdir(path.dirname(para), { recursive: true });
    await copyFile(de, para).then(() => provas++)
      .catch(() => console.warn(`AVISO prova ausente: ${a.prova} (rode o gerador dela)`));
  }
  console.log(`OK -> ../site/marca  (${provas} folhas de prova)`);
}
