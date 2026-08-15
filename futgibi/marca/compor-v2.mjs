// COMPOSIÇÃO v2: a arte é dirigida, não genérica.
//
// A v1 gerava uma cena bonita e depois tentava caber texto nela, e o conserto era sempre o mesmo:
// escurecer a arte até o texto ler. Isso é remendo. Aqui cada cena é PEDIDA com a distribuição que
// o modo precisa, então o texto entra num vazio que já existe.
//
//   RESPIRO · arte com a gente no ALTO   -> o texto ocupa o chão vazio da própria cena
//   FAIXA   · arte com a gente EMBAIXO   -> o texto ocupa o céu vazio da própria cena
//   RECORTE · arte sem fundo             -> DESCARTADO (parecia adesivo: figura sem chão perde peso)
//
// O QUE MUDOU EM 15/08/2026, e é o que separa esta versão da anterior:
//
//   1. O TEXTO VEM DO TOKEN. As três peças de convite tinham cada uma a sua cópia da frase, e a
//      frase afirmava um superlativo ("a MAIOR comunidade de quadrinhos de futebol do Brasil") que
//      ninguém pode conferir e que, num perfil de dia zero, era falso. A marca cobra fato
//      conferível do conteúdo: a peça que convida não pode ser a exceção.
//   2. A COR DO TEXTO É PERGUNTADA, não escolhida (`tintaSobre`). O subtítulo saía em laranja-selo
//      sobre verde, que é 2,44 de contraste, porque o laranja de bloco era a única cor de destaque
//      que este arquivo tinha importada.
//   3. A EMENDA SUMIU. Ver `assentar()` logo abaixo: é a diferença entre uma peça e duas coladas.
//
//   node futgibi/marca/compor-v2.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import {
  VERDE, CREME, PAPEL, LARANJA, PRETO, caber, tintaSobre, FONTE_ARTE, conferirFonte,
  CONVITE, CONVITE_APOIO, HANDLE, POST,
} from './tokens.mjs';

await conferirFonte(sharp);

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');
const SAIDA = path.join(AQUI, '_variacoes-v2');
const W = POST.w, H = POST.h, CX = W / 2;

const txt = (x, y, s, tam, cor, { esp = 1, anc = 'middle' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family='${FONTE_ARTE}' font-size="${tam}"
    font-weight="bold" letter-spacing="${esp}" fill="${cor}">${s}</text>`;
const camada = (svg) => ({ top: 0, left: 0,
  input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`) });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------------------------------------------------------------- a emenda, e como ela sumiu ----
// O DEFEITO: a arte era CORTADA onde os personagens acabam e o resto do quadro virava cor chapada
// da marca. Na tela isso é uma linha reta atravessando a peça, com textura de papel de um lado e
// nada do outro. A legenda do modo prometia "peça única" e a peça mostrava duas coladas.
//
// O CONSERTO não é esconder a emenda, é não ter emenda: a arte cobre o quadro inteiro e o VAZIO
// DELA é tingido na cor da marca, mantendo o grão do papel. O tom continua vindo do token (é a
// mesma cor de sempre), mas o chão passa a ser o chão da ilustração, não um retângulo por cima.
//
// A transição é uma rampa (`fade`), e ela existe porque tingir a partir de uma linha seca só troca
// uma emenda por outra: onde a tinta começa de vez, o olho vê a costura de novo.
// A TINTA SÓ PODE PEGAR O VAZIO, NUNCA A GENTE. Foi o erro da primeira tentativa deste conserto:
// tingir a imagem inteira consertou a emenda e lavou os personagens junto, que saíram
// desbotados. `peso(y)` é o que separa as duas coisas, e cada modo tem o seu.
const assentar = async (src, { peso, cor, medirDe = 0, medirAte = 1 }) => {
  const base = await sharp(src).resize({ width: W, height: H, fit: 'cover', position: 'top' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = base;
  const [cr, cg, cb] = hex(cor);
  const lumi = (i) => data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;

  // a luminância média da faixa a tingir vira a referência: o grão é o DESVIO em torno dela, e é
  // ele que se preserva. Sem isso o chão sai chapado e a peça perde o papel.
  let soma = 0, n = 0;
  for (let y = Math.round(medirDe * info.height); y < Math.round(medirAte * info.height); y++)
    for (let x = 0; x < info.width; x++) { soma += lumi((y * info.width + x) * info.channels); n++; }
  const media = soma / Math.max(1, n);

  for (let y = 0; y < info.height; y++) {
    const t = Math.max(0, Math.min(1, peso(y)));
    if (t === 0) continue;
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const g = Math.max(0.82, Math.min(1.18, lumi(i) / (media || 1)));   // o grão, em torno de 1
      for (const [ch, alvo] of [[0, cr], [1, cg], [2, cb]]) {
        const tingido = Math.max(0, Math.min(255, alvo * g));
        data[i + ch] = Math.round(data[i + ch] * (1 - t) + tingido * t);
      }
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png().toBuffer();
};

// o chão, de `desde` pra baixo: a tinta ENTRA ao longo da rampa e fica
const chao = (desde, fade) => (y) => (y < desde ? 0 : Math.min(1, (y - desde) / fade));
// o céu, de cima até `ate`: a tinta é cheia e SAI na rampa, antes de encostar em quem está embaixo
const ceu = (ate, fade) => (y) => (y > ate ? 0 : Math.min(1, (ate - y) / fade));

// ---------------------------------------------------------------- o bloco de texto --------------
// O selo, sempre um só: dois destaques disputando é nenhum destaque.
const selo = (y) => `<rect x="${CX - 218}" y="${y}" width="436" height="72" fill="${LARANJA}"
    stroke="${PRETO}" stroke-width="7"/>${txt(CX, y + 51, 'COMEÇA HOJE', 38, tintaSobre(LARANJA), { esp: 5 })}`;

// convite + linha de apoio + handle. A altura é DERIVADA do número de linhas, senão trocar a frase
// no token deixaria o espaçamento preso na frase antiga.
const bloco = (yTopo, fundo, tam) => {
  const cor = tintaSobre(fundo);
  const linhas = CONVITE.map((l, i) => txt(CX, yTopo + i * tam * 1.06, l, tam, cor)).join('');
  const yFim = yTopo + CONVITE.length * tam * 1.06;
  return `${linhas}
    ${txt(CX, yFim + 22, CONVITE_APOIO, 34, tintaSobre(fundo, { destaque: true }), { esp: 0 })}
    ${txt(CX, yFim + 96, HANDLE, 44, cor, { esp: 8 })}`;
};
const alturaBloco = (tam) => CONVITE.length * tam * 1.06 + 96;

// ---------------------------------------------------------------- recorte por inundação ---------
// Mesmo método das peças: o fundo é o CLARO QUE ENCOSTA NA BORDA, não o claro em geral. Limiar de
// brilho apagaria a camisa creme dos personagens junto com o papel.
const semFundo = async (src) => {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const claro = (n) => data[n * c] >= 205 && data[n * c + 1] >= 205 && data[n * c + 2] >= 205;
  const fundo = new Uint8Array(w * h), fila = new Int32Array(w * h);
  let i = 0, f = 0;
  const semear = (n) => { if (!fundo[n] && claro(n)) { fundo[n] = 1; fila[f++] = n; } };
  for (let x = 0; x < w; x++) { semear(x); semear((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semear(y * w); semear(y * w + w - 1); }
  while (i < f) {
    const n = fila[i++], x = n % w, y = (n / w) | 0;
    if (x > 0) semear(n - 1);
    if (x < w - 1) semear(n + 1);
    if (y > 0) semear(n - w);
    if (y < h - 1) semear(n + w);
  }
  for (let n = 0; n < w * h; n++) if (fundo[n]) data[n * c + 3] = 0;
  const buf = await sharp(data, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
  return sharp(buf).trim({ threshold: 1 }).png().toBuffer();
};

const MODOS = {
  // a gente está no alto da arte; o texto ocupa o chão que a própria cena deixou vazio
  respiro: async () => {
    const tam = await caber(sharp, CONVITE, 64);
    const CHAO = 787;   // MEDIDO: o último pixel de contorno da turma, em 1448 de arte
    // O corte era aqui, e hoje aqui é só onde a rampa de tinta COMEÇA. A arte segue até a borda de
    // baixo, e é o chão dela que vira o verde da marca.
    const arte = await assentar(path.join(ILUS, 'topo.png'),
      { peso: chao(CHAO, 150), cor: VERDE, medirDe: 0.58, medirAte: 0.72 });
    // o texto ocupa o verde, centrado no que sobrou dele
    const yTopo = Math.round((CHAO + 150 + H) / 2 - alturaBloco(tam) / 2 + tam * 0.36);
    return {
      fundo: `<rect width="${W}" height="${H}" fill="${VERDE}"/>`,
      img: { input: arte, top: 0, left: 0 },
      // sem tarja e sem filete: o texto entra no vazio da arte, e é isso que faz parecer uma peça só
      frente: `${selo(44)}${bloco(yTopo, VERDE, tam)}`,
    };
  },

  // a gente está embaixo; o texto ocupa o céu vazio
  faixa: async () => {
    const tam = await caber(sharp, CONVITE, 64);
    const CABECAS = 1010;   // MEDIDO: onde a primeira fileira de cabeças começa
    // o céu inteiro acima da turma é tingido no papel da marca, então não existe linha entre "a
    // página" e "a arte": é tudo a mesma imagem. A rampa termina ANTES das cabeças, senão a tinta
    // lava a gente junto (foi o que aconteceu na primeira tentativa).
    const arte = await assentar(path.join(ILUS, 'base.png'),
      { peso: ceu(CABECAS, 120), cor: PAPEL, medirDe: 0.1, medirAte: 0.5 });
    // O BLOCO É CENTRADO NO CÉU, entre o selo e as cabeças. Antes ele ficava colado no topo e
    // sobravam ~400px de vazio até a turma: espaço morto lê como erro de montagem, não como ar.
    const ySelo = 96;
    const yTopo = Math.round((ySelo + 72 + CABECAS) / 2 - alturaBloco(tam) / 2 + tam * 0.36);
    return {
      fundo: `<rect width="${W}" height="${H}" fill="${PAPEL}"/>`,
      img: { input: arte, top: 0, left: 0 },
      frente: `${selo(ySelo)}${bloco(yTopo, PAPEL, tam)}`,
    };
  },

  // DESCARTADO em 15/08/2026, mantido só como registro: sem chão a figura perde peso e a peça
  // inteira lê como adesivo sobre fundo colorido.
  recorte: async () => {
    const tam = await caber(sharp, CONVITE, 64);
    const nu = await semFundo(path.join(ILUS, 'recorte.png'));
    const arte = await sharp(nu).resize({ width: 1000, height: 720, fit: 'inside' }).png().toBuffer();
    const m = await sharp(arte).metadata();
    return {
      fundo: `<rect width="${W}" height="${H}" fill="${VERDE}"/>
        <defs><pattern id="p" width="72" height="72" patternUnits="userSpaceOnUse">
          <path d="M0,0 L72,72 M72,0 L0,72" stroke="${CREME}" stroke-width="3" opacity="0.13" fill="none"/>
        </pattern></defs><rect width="${W}" height="${H}" fill="url(#p)"/>`,
      img: { input: arte, top: 210, left: Math.round(CX - m.width / 2) },
      frente: `${selo(52)}${bloco(1035, VERDE, tam)}`,
    };
  },
};

await mkdir(SAIDA, { recursive: true });
const feitas = [];
for (const [id, fn] of Object.entries(MODOS)) {
  try {
    const c = await fn();
    const arq = path.join(SAIDA, `${id}.png`);
    await sharp({ create: { width: W, height: H, channels: 4, background: VERDE } })
      .composite([camada(c.fundo), c.img, camada(c.frente)]).png().toFile(arq);
    feitas.push(arq);
    console.log('OK ->', arq);
  } catch (e) {
    console.log(`pulando "${id}": ${e.message.slice(0, 80)}`);
  }
}

if (feitas.length) {
  const TW = 330, GAP = 20, PAD = 24, ROT = 30;
  const pecas = [];
  for (const [i, a] of feitas.entries())
    pecas.push({ input: await sharp(a).resize({ width: TW }).png().toBuffer(),
      left: PAD + i * (TW + GAP), top: PAD + ROT });
  const FW = PAD * 2 + feitas.length * TW + (feitas.length - 1) * GAP;
  const FH = PAD * 2 + ROT + Math.round(TW * H / W);
  const rot = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">${feitas
    .map((a, i) => `<text x="${PAD + i * (TW + GAP)}" y="${PAD + 20}" font-family="Helvetica"
      font-size="17" font-weight="bold" fill="${CREME}">${path.basename(a, '.png')}</text>`).join('')}</svg>`;
  await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 26, g: 26, b: 28, alpha: 1 } } })
    .composite([...pecas, { input: Buffer.from(rot), left: 0, top: 0 }])
    .png().toFile(path.join(SAIDA, '_folha.png'));
  console.log('OK ->', path.join(SAIDA, '_folha.png'));
}
