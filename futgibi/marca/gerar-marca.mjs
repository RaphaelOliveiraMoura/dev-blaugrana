// O KIT DE MARCA: símbolo, assinatura horizontal, e as variações que todo sistema precisa ter.
//
// A DECISÃO, tomada em 15/08/2026 depois da folha de seis direções:
//
//   SÍMBOLO      = a figurinha de álbum, com o 12 dentro.
//   ASSINATURA   = a capa de gibi, com o nome na faixa e o número da edição.
//
// As duas dividem a MESMA IDEIA (a marca é um objeto impresso e numerado), o que é o que faz um
// sistema parecer um sistema em vez de duas peças. E elas se dividem por USO, não por gosto:
//
//   · o símbolo sobrevive a 44px porque tem um elemento DOMINANTE (o 12). Foi o único que passou
//     no teste de favicon; todas as outras direções viravam borrão, porque dependiam de o leitor
//     conseguir LER a palavra, e a 44px ninguém lê nada.
//   · a assinatura é horizontal, então serve onde o símbolo não cabe: rodapé, banner, cabeçalho.
//
// A FONTE VAI EMBUTIDA no SVG, em base64. Sem isso o logo depende de a Oswald estar instalada na
// máquina de quem abre, e um logo que muda de forma conforme a máquina não é um logo. O arquivo
// fica maior; é o preço de o desenho ser sempre o mesmo.
//
//   node futgibi/marca/gerar-marca.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE, T } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'logo');
const FONTE_ARQ = path.join(AQUI, '../site/marca/fontes/oswald.woff2');

const b64 = (await readFile(FONTE_ARQ)).toString('base64');
const FACE = `  <defs><style>
    @font-face{font-family:"FG";src:url(data:font/woff2;base64,${b64}) format("woff2");
      font-weight:700;font-style:normal}
  </style></defs>`;
const F = '"FG","Oswald","Arial Narrow",Impact,sans-serif';

// atributo com aspas SIMPLES, porque a lista de famílias já usa aspas duplas por dentro. Escapar
// com JSON.stringify põe barra invertida no XML e o parser recusa o arquivo inteiro.
const txt = (x, y, s, tam, cor, { esp = 1, anc = 'middle', op = 1 } = {}) =>
  `  <text x="${x}" y="${y}" text-anchor="${anc}" font-family='${F}' font-size="${tam}"
    font-weight="700" letter-spacing="${esp}" fill="${cor}"${op < 1 ? ` opacity="${op}"` : ''}>${s}</text>`;

const svg = (w, h, corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${FACE}
${fundo ? `  <rect width="${w}" height="${h}" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

// ------------------------------------------------------------------ o SÍMBOLO (a figurinha) ---
// A moldura de cromo de álbum. O 12 é o elemento dominante e é ele que sobrevive à redução; o
// nome na faixa de baixo some quando a peça fica pequena, e isso é PROJETO, não defeito: em
// favicon o que precisa restar é a forma, não a leitura.
const simbolo = (c, { comNome = true } = {}) => {
  const W = 420, H = comNome ? 520 : 440;
  const rede = `  <defs><pattern id="rd" width="30" height="30" patternUnits="userSpaceOnUse">
    <path d="M0,0 L30,30 M30,0 L0,30" stroke="${c.tinta}" stroke-width="2.4" opacity="0.16" fill="none"/>
  </pattern></defs>`;
  return svg(W, H, `${rede}
  <rect x="10" y="10" width="400" height="${H - 20}" rx="20" fill="${c.acento}"
    stroke="${c.tinta}" stroke-width="11"/>
  <rect x="38" y="38" width="344" height="${comNome ? 356 : 364}" fill="${c.papel}"
    stroke="${c.tinta}" stroke-width="8"/>
  <rect x="38" y="38" width="344" height="${comNome ? 356 : 364}" fill="url(#rd)"/>
${txt(210, comNome ? 288 : 296, '12', 210, c.tinta, { esp: -4 })}
${comNome ? txt(210, 484, 'FUTGIBI', 66, c.tinta, { esp: 4 }) : ''}`, c.fundo);
};

// ------------------------------------------------------------- a ASSINATURA (a capa de gibi) --
// Horizontal, pra onde o símbolo não cabe. A cartela "Nº 1" fica na faixa e não ao lado do nome:
// na primeira versão ela colidia com a última letra, e colisão de logo não se resolve empurrando,
// se resolve mudando de camada.
const assinatura = (c) => {
  const W = 640, H = 200;
  return svg(W, H, `
  <rect x="7" y="7" width="${W - 14}" height="${H - 14}" fill="${c.papel}"
    stroke="${c.tinta}" stroke-width="11"/>
  <rect x="7" y="7" width="${W - 14}" height="56" fill="${c.tinta}"/>
${txt(30, 47, 'FUTEBOL EM QUADRINHOS', 28, c.papel, { esp: 5, anc: 'start' })}
  <rect x="${W - 108}" y="16" width="82" height="38" fill="${c.acento}"/>
${txt(W - 67, 46, 'Nº 1', 27, c.tinta)}
${txt(W / 2, 166, 'FUTGIBI', 112, c.tinta, { esp: 4 })}`, c.fundo);
};

// a versão MÍNIMA: só a palavra, pra assinar arte e rodapé onde moldura vira ruído
const wordmark = (c) => svg(560, 150, `
${txt(280, 118, 'FUTGIBI', 116, c.tinta, { esp: 4 })}
  <rect x="64" y="132" width="432" height="8" fill="${c.acento}"/>`, c.fundo);

const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, fundo: null },
  mono:      { tinta: PRETO, papel: CREME, acento: CREME, fundo: null },
  invertido: { tinta: CREME, papel: VERDE, acento: VERDE, fundo: VERDE },
};

await mkdir(SAIDA, { recursive: true });
const feitos = [];
for (const [teste, c] of Object.entries(TESTES)) {
  const kit = {
    [`simbolo-${teste}`]: simbolo(c),
    [`simbolo-nu-${teste}`]: simbolo(c, { comNome: false }),   // sem o nome: o uso pequeno
    [`assinatura-${teste}`]: assinatura(c),
    [`wordmark-${teste}`]: wordmark(c),
  };
  for (const [nome, conteudo] of Object.entries(kit)) {
    await writeFile(path.join(SAIDA, `${nome}.svg`), conteudo);
    feitos.push(nome);
  }
}
console.log(`OK -> ${SAIDA}`);
console.log(`  ${feitos.length} arquivos: símbolo, símbolo nu, assinatura e wordmark, em cor / mono / invertido`);
console.log(`  fonte embutida em base64 (${(b64.length / 1024).toFixed(0)}KB por arquivo)`);
