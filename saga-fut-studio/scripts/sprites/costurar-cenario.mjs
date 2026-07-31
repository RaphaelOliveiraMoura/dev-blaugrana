// costurar-cenario.mjs <videoId> <saida> <esq> <dir> [larguraFinal] [alturaFinal]
// Junta DOIS cenários 3:4 lado a lado num panorama 3:2 (o MUNDO de 2 telas), ALINHANDO a linha do
// chão dos dois.
//
// POR QUE EXISTE: um mundo de 2 telas num vídeo 3:4 é exatamente 2160x1440, ou seja dois 1080x1440
// encostados. Pedir a um render só que divida o quadro em dois lugares distintos (ex.: um lado
// chuvoso e vazio, outro ensolarado e lotado) é pedido difícil e o resultado é imprevisível; gerar
// os dois lados SEPARADOS sai coerente porque cada um usa o 3:4 que o modelo faz bem, e o contraste
// fica garantido. A emenda cai na linha do meio do campo, que é onde ela deve estar.
//
// O ALINHAMENTO é o ponto: dois renders independentes põem o horizonte em alturas ligeiramente
// diferentes, e no pan o personagem passaria a flutuar ou afundar ao cruzar a emenda. Aqui a linha
// da grama de cada lado é MEDIDA (cor dominante do rodapé) e o lado mais alto desce até casar.
import sharp from 'sharp';
import path from 'node:path';
import { CONTEUDO } from './config.mjs';

const [, , VIDEOID, SAIDA, ESQ, DIR, LW, LH] = process.argv;
if (!VIDEOID || !SAIDA || !ESQ || !DIR) {
  console.error('uso: node costurar-cenario.mjs <videoId> <saida> <esq> <dir> [larguraFinal] [alturaFinal]');
  process.exit(1);
}
const cen = (n) => path.join(CONTEUDO, `videos/${VIDEOID}/cenario/${n}.png`);

// Topo da grama = a maior DESCONTINUIDADE horizontal na faixa central do quadro.
//
// A primeira versão comparava com a cor dominante do rodapé, e errou feio num cenário CINZA: a
// arquibancada de concreto tem cor parecidíssima com grama dessaturada, então a "diferença" só
// disparava lá em cima e o alinhamento saiu 200px torto. A borda arquibancada/grama, por outro
// lado, sempre tem contorno preto grosso (é o estilo da casa), o que a torna o pico de gradiente
// mais forte da faixa — critério que não depende de qual é a cor de cada lado.
async function topoDoChao(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const med = [];
  for (let y = 0; y < H; y++) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let x = Math.round(W * 0.2); x < Math.round(W * 0.8); x += 3) { const i = (y * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
    med.push([r / n, g / n, b / n]);
  }
  const grad = (y) => Math.hypot(med[y + 2][0] - med[y - 2][0], med[y + 2][1] - med[y - 2][1], med[y + 2][2] - med[y - 2][2]);
  // Sobe A PARTIR DO RODAPÉ e para na PRIMEIRA transição forte. Pegar o maior gradiente do quadro
  // inteiro não serve: no cenário chuvoso a maior transição é nuvem-contra-arquibancada, lá em
  // cima. O limiar é auto-calibrado pela textura da própria grama daquele lado (mediana do
  // gradiente no rodapé x6), então funciona igual em grama lisa e em grama listrada.
  const base = [];
  for (let y = Math.round(H * 0.88); y < H - 3; y++) base.push(grad(y));
  base.sort((x, y) => x - y);
  const limiar = Math.max(4, base[Math.floor(base.length / 2)] * 6);
  let topo = Math.round(H * 0.45);
  for (let y = H - 4; y > Math.round(H * 0.2); y--) {
    if (grad(y) > limiar) { topo = y; break; }
  }
  return { topo, W, H, limiar: +limiar.toFixed(1) };
}

const a = await topoDoChao(cen(ESQ));
const b = await topoDoChao(cen(DIR));
console.log(`linha do chão: ${ESQ}=${a.topo}px (${(a.topo / a.H * 100).toFixed(1)}%) · ${DIR}=${b.topo}px (${(b.topo / b.H * 100).toFixed(1)}%)`);

// alinha DESCENDO o lado cuja grama começa mais alto (assim ninguém revela borda em cima; o que
// sobra embaixo é grama, que é uniforme e some no corte final)
const desloc = a.topo - b.topo;   // >0: o dir começa mais alto, desce o dir
const H = Math.max(a.H, b.H), Wc = a.W + b.W;
// Desloca o lado `dy` px preenchendo a faixa que abriria: DESCENDO (dy>0) o buraco é em CIMA e se
// preenche esticando a primeira linha (céu/arquibancada); SUBINDO (dy<0) o buraco é embaixo e se
// preenche esticando a última (grama). Preencher sempre pelo rodapé deixava tarja preta no topo.
const prep = async (arq, dy) => {
  if (!dy) return sharp(arq).png().toBuffer();
  const { width, height } = await sharp(arq).metadata();
  const corpo = await sharp(arq).png().toBuffer();
  const n = Math.abs(dy) + 6;
  const faixa = dy > 0
    ? await sharp(arq).extract({ left: 0, top: 0, width, height: 4 }).resize(width, n, { fit: 'fill' }).png().toBuffer()
    : await sharp(arq).extract({ left: 0, top: height - 4, width, height: 4 }).resize(width, n, { fit: 'fill' }).png().toBuffer();
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .composite([
      { input: faixa, left: 0, top: dy > 0 ? 0 : height - n },
      { input: corpo, left: 0, top: dy },
    ])
    .png().toBuffer();
};
const esqBuf = await prep(cen(ESQ), desloc < 0 ? -desloc : 0);
const dirBuf = await prep(cen(DIR), desloc > 0 ? desloc : 0);

let img = sharp({ create: { width: Wc, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
  .composite([{ input: esqBuf, left: 0, top: 0 }, { input: dirBuf, left: a.W, top: 0 }]);
const out = cen(SAIDA);
if (LW && LH) img = sharp(await img.png().toBuffer()).resize(parseInt(LW, 10), parseInt(LH, 10), { fit: 'fill', kernel: 'lanczos3' }).sharpen({ sigma: 0.7 });
await img.png().toFile(out);
const m = await sharp(out).metadata();
console.log(`OK panorama ${SAIDA}: ${m.width}x${m.height} · lado direito deslocado ${desloc}px pra casar o chão`);
console.log(`   emenda em x=${LW ? Math.round(parseInt(LW, 10) / 2) : a.W} (é aí que fica a linha do meio do campo)`);
