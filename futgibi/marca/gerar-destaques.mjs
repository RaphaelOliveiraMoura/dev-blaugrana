// Capas dos DESTAQUES do perfil, por codigo.
//
// Sao 1080x1920 (story) porque a capa de destaque e recortada do CENTRO de um story: gerar
// quadrado e deixar o Instagram recortar poe o pictograma fora do circulo. Tudo que importa mora
// dentro de um circulo central, que e a area que sobrevive ao recorte.
//
// DUAS COISAS MUDARAM EM 15/08/2026, e as duas eram a mesma dívida: estas capas nasceram ANTES do
// resto do sistema e ficaram pra trás quando ele cresceu.
//
//   1. CADA CAPA USA A COR DA SUA SÉRIE. As quatro eram verdes e idênticas, e as cores de série
//      foram criadas justamente porque "no feed o leitor não distinguia formato de relance". A
//      prateleira era o único lugar onde a diferença precisa aparecer, e era o único que não usava.
//   2. O PICTOGRAMA VEM DO SET PRÓPRIO (marca/svg/icone-*.svg). Antes cada capa desenhava o seu
//      inline, num traço arredondado que não é o da casa, e o de Memória era uma bola de gomos que
//      na tela lia como GLOBO. O set existe pra que ícone e balão pareçam da mesma mão: capa de
//      destaque desenhando o seu por fora é a definição de peça solta.
//
//   node futgibi/marca/gerar-destaques.mjs [--saida=<dir>] [--modo=fundo|anel]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { VERDE, CREME, PRETO, SERIE, T, FONTE_ARTE, conferirFonte, contraste } from './tokens.mjs';

await conferirFonte(sharp);

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SVG = path.join(AQUI, 'svg');
const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;
const SAIDA = flag('saida', path.join(AQUI, 'destaques'));
const MODO = flag('modo', 'fundo');

const W = 1080, H = 1920, CX = W / 2, CY = H / 2;

// A prateleira, o ícone do set que a representa e o rótulo. O título sai do token (com acento):
// a chave é slug e slug não se mostra pra ninguém.
const PRATELEIRAS = {
  'o-dia-em-que': { icone: 'calendario', rotulo: 'O DIA\nEM QUE' },
  resenha: { icone: 'balao', rotulo: 'RESENHA' },
  memoria: { icone: 'album', rotulo: 'MEMÓRIA' },
  bastidor: { icone: 'lapis', rotulo: 'BASTIDOR' },
};

// o ícone é 48x48 com `currentColor` e traço 4: em 300px o traço vira ~25px, que é o peso das
// peças grandes. Ele escala sem virar mancha justamente porque o set foi desenhado nesse peso.
const icone = async (nome, tam, cor) => {
  const s = (await readFile(path.join(SVG, `icone-${nome}.svg`), 'utf8'))
    .replace(/currentColor/g, cor)
    .replace(/width="48" height="48"/, `width="${tam}" height="${tam}"`);
  return sharp(Buffer.from(s)).png().toBuffer();
};

await mkdir(SAIDA, { recursive: true });

const TAM_ICONE = 330;
const feitas = [];

for (const [id, p] of Object.entries(PRATELEIRAS)) {
  const cor = SERIE[id];
  const titulo = T.cor.serie[id].titulo;
  // no modo `fundo` a capa inteira é da cor da série; no `anel`, o fundo segue verde e a cor entra
  // num aro grosso em volta do pictograma. O primeiro separa muito mais no perfil, que é o ponto.
  const fundo = MODO === 'anel' ? VERDE : cor;
  if (contraste(CREME, fundo) < 4.5)
    console.warn(`AVISO ${id}: creme sobre ${fundo} dá ${contraste(CREME, fundo).toFixed(2)}, abaixo de 4,5`);

  const linhas = p.rotulo.split('\n');
  const aro = MODO === 'anel'
    ? `<circle cx="${CX}" cy="${CY - 60}" r="290" fill="none" stroke="${cor}" stroke-width="42"/>`
    : '';

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${fundo}"/>
    ${aro}
    ${linhas.map((l, i) => `<text x="${CX}" y="${CY + 250 + i * 78}" text-anchor="middle"
       font-family='${FONTE_ARTE}' font-size="66" font-weight="bold" letter-spacing="6"
       fill="${CREME}">${l}</text>`).join('')}
  </svg>`;

  const arq = path.join(SAIDA, `destaque-${id}.png`);
  await sharp(Buffer.from(svg))
    .composite([{ input: await icone(p.icone, TAM_ICONE, CREME),
      top: Math.round(CY - 60 - TAM_ICONE / 2), left: Math.round(CX - TAM_ICONE / 2) }])
    .png().toFile(arq);
  feitas.push({ id, arq, titulo });
  console.log(`OK -> ${path.basename(arq)}  (${titulo}, ${MODO === 'anel' ? 'aro' : 'fundo'} ${cor})`);
}

// folha de conferencia: as quatro capas ja RECORTADAS no circulo, que e como o perfil mostra.
// A prova é esta, nunca o arquivo: o quadrado só existe no disco.
const folha = async (modo, arquivos, saida) => {
  const D = 260, GAP = 40, PAD = 40;
  const capas = [];
  for (const [i, f] of arquivos.entries()) {
    const centro = await sharp(f.arq)
      .extract({ left: 0, top: Math.round(H / 2 - W / 2), width: W, height: W })
      .resize(D, D).toBuffer();
    const mascara = Buffer.from(
      `<svg width="${D}" height="${D}"><circle cx="${D / 2}" cy="${D / 2}" r="${D / 2}" fill="white"/></svg>`);
    capas.push({
      input: await sharp(centro).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer(),
      left: PAD + i * (D + GAP), top: PAD,
    });
  }
  const FW = PAD * 2 + D * 4 + GAP * 3, FH = PAD * 2 + D;
  await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
    .composite(capas).png().toFile(saida);
  console.log('OK ->', saida);
};

await folha(MODO, feitas, path.join(SAIDA, '_folha.png'));
