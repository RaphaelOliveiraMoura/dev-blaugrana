// Carimba @futgibi na arte.
//
// Existe porque quadrinho e o formato mais roubado que ha: um carrossel bom viaja em print, e sem
// a assinatura DENTRO da imagem cada viral seu constroi a autoridade de quem repostou. Assinatura
// na legenda nao resolve, porque o print nao leva a legenda junto.
//
// Duas decisoes de tamanho, e as duas sao pra que o carimbo nao vire a arte:
//   - o corpo sai da LARGURA da imagem (2,4%), entao a assinatura tem o mesmo peso visual num
//     quadrinho 3:4 e num story;
//   - fica no rodape, alinhada a direita, sobre uma pilula creme com contorno preto: sem a pilula
//     ela some no fundo claro e briga com o desenho no fundo escuro.
//
// A MARGEM PADRAO E 8% DA LARGURA, e o numero foi MEDIDO no slide montado, nao escolhido: com 2,2%
// e com 3,6% o selo pousava em cima da linha preta da moldura que o acabamento por codigo desenha,
// e ficava com cara de adesivo colado torto. Com 8% ele cai dentro da arte, ao lado da barra de
// legenda. Em arte SEM moldura da pra baixar com --margem=2.
//
//   node marca/assinar.mjs <arquivo.png> [...] [--sufixo=-assinado] [--posicao=direita|esquerda] [--margem=3.6]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO } from './tokens.mjs';

const FONTE = 'Chalkboard SE';
const HANDLE = '@futgibi';

const args = process.argv.slice(2);
const arquivos = args.filter((a) => !a.startsWith('--'));
const sufixo = args.find((a) => a.startsWith('--sufixo='))?.slice(9) ?? '-assinado';
const posicao = args.find((a) => a.startsWith('--posicao='))?.slice(10) ?? 'direita';
const margemPct = Number(args.find((a) => a.startsWith('--margem='))?.slice(9) ?? 8);

if (!arquivos.length) {
  console.error('uso: node marca/assinar.mjs <arquivo.png> [...] [--sufixo=-assinado] [--posicao=direita|esquerda]');
  process.exit(2);
}

for (const arq of arquivos) {
  const img = sharp(arq);
  const { width: w, height: h } = await img.metadata();

  const corpo = Math.round(w * 0.024);
  const padX = Math.round(corpo * 0.72), padY = Math.round(corpo * 0.42);
  // largura estimada pela contagem de caracteres: o sharp nao mede texto, e pedir a caixa exata
  // exigiria rasterizar duas vezes. 0.56 do corpo por caractere sobra folga na Chalkboard.
  const larg = Math.round(HANDLE.length * corpo * 0.56) + padX * 2;
  const alt = corpo + padY * 2;
  const margem = Math.round(w * (margemPct / 100));
  const x = posicao === 'esquerda' ? margem : w - larg - margem;
  const y = h - alt - margem;

  const selo = Buffer.from(`<svg width="${larg}" height="${alt}" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="${larg - 2}" height="${alt - 2}" rx="${Math.round(alt * 0.32)}"
      fill="${CREME}" fill-opacity="0.94" stroke="${PRETO}" stroke-width="${Math.max(2, Math.round(corpo * 0.11))}"/>
    <text x="${larg / 2}" y="${Math.round(alt / 2 + corpo * 0.36)}" font-family="${FONTE}" font-size="${corpo}"
      font-weight="bold" text-anchor="middle" fill="${PRETO}">${HANDLE}</text>
  </svg>`);

  const saida = arq.replace(/(\.[a-z]+)$/i, `${sufixo}$1`);
  await img.composite([{ input: selo, left: x, top: y }]).toFile(saida);
  console.log(`OK -> ${path.basename(saida)}  (selo ${larg}x${alt} em ${w}x${h})`);
}
