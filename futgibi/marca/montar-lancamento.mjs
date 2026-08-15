// Monta o POST DE INAUGURACAO: ilustracao gerada pelo modelo + convite por codigo.
//
// CORRECAO DE ROTA (15/08/2026): a primeira versao punha a ilustracao inteira e uma tarja de texto
// embaixo, e o Raphael reprovou pela razao certa: A ARTE ROUBAVA O POST. Uma multidao de trinta
// rostos desenhados ganha de qualquer frase que divida espaco com ela, e um post de inauguracao nao
// existe pra ser bonito, existe pra CONVIDAR.
//
// Entao a ilustracao virou FUNDO, e as tres variacoes abaixo sao tres jeitos de fazer ela recuar:
// escurecendo, encolhendo, ou sendo coberta por um balao. Em todas, quem manda e o convite.
//
// AS REDES SAO ICONE, NAO TEXTO. "@futgibi · nas quatro redes" e uma frase que o leitor tem que
// LER e traduzir; quatro icones ele reconhece antes de ler, e ocupam menos espaco dizendo mais. O
// handle continua escrito, pequeno, porque sem ele ninguem sabe o que procurar.
//
//   node futgibi/marca/montar-lancamento.mjs [--arte=arquibancada]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readdir } from 'node:fs/promises';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');
const SAIDA = path.join(AQUI, '_variacoes-lancamento');

const W = 1080, H = 1440, CX = W / 2;

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;

const txt = (x, y, s, tam, { cor = CREME, esp = 1, anc = 'middle' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family="Helvetica" font-size="${tam}"
    font-weight="bold" letter-spacing="${esp}" fill="${cor}">${s}</text>`;
const bloco = (x, y, linhas, tam, o = {}) =>
  linhas.map((l, i) => txt(x, y + i * tam * 1.08, l.t ?? l, tam, { ...o, ...(l.o || {}) })).join('');

// ------------------------------------------------------------------------- os icones de rede
// Desenhados aqui e nao baixados: sao as marcas oficiais em forma de path, e o cartao creme com
// contorno e sombra dura e o mesmo dos botoes da landing, entao post e site combinam.
const GLIFOS = {
  instagram: `<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5.4" fill="none"
      stroke="${PRETO}" stroke-width="2.1"/>
    <circle cx="12" cy="12" r="4.3" fill="none" stroke="${PRETO}" stroke-width="2.1"/>
    <circle cx="17.7" cy="6.4" r="1.25" fill="${PRETO}"/>`,
  tiktok: `<path fill="${PRETO}" d="M16.6 2h-3v13.2a2.7 2.7 0 1 1-2.2-2.66V9.4a5.9 5.9 0 1 0 5.2 5.85V8.9a7 7 0 0 0 4 1.28V7.1a4.1 4.1 0 0 1-4-4.1z"/>`,
  youtube: `<path fill="${PRETO}" d="M22.2 7.4a2.8 2.8 0 0 0-1.95-2C18.5 5 12 5 12 5s-6.5 0-8.25.45A2.8 2.8 0 0 0 1.8 7.4 29 29 0 0 0 1.35 12 29 29 0 0 0 1.8 16.6a2.8 2.8 0 0 0 1.95 1.95C5.5 19 12 19 12 19s6.5 0 8.25-.45a2.8 2.8 0 0 0 1.95-1.95A29 29 0 0 0 22.65 12a29 29 0 0 0-.45-4.6zM9.9 15.05v-6.1L15.2 12z"/>`,
  x: `<path fill="${PRETO}" d="M17.7 3h3.3l-7.2 8.24L22.3 21h-6.63l-5.2-6.79L4.53 21H1.22l7.7-8.8L1.7 3h6.8l4.7 6.21zm-1.16 16h1.83L7.55 4.9H5.58z"/>`,
};

// a fileira de cartões, centrada em `cy`
const redes = (cy, { lado = 132, gap = 26, fundo = CREME } = {}) => {
  const ids = Object.keys(GLIFOS);
  const larg = ids.length * lado + (ids.length - 1) * gap;
  const x0 = CX - larg / 2;
  return ids.map((id, i) => {
    const x = x0 + i * (lado + gap), esc = (lado * 0.5) / 24;
    return `<g>
      <rect x="${x + 7}" y="${cy + 7}" width="${lado}" height="${lado}" fill="${PRETO}"/>
      <rect x="${x}" y="${cy}" width="${lado}" height="${lado}" fill="${fundo}"
            stroke="${PRETO}" stroke-width="6"/>
      <g transform="translate(${x + lado * 0.25}, ${cy + lado * 0.25}) scale(${esc})">
        ${GLIFOS[id]}</g></g>`;
  }).join('');
};

// o selo carimbado, torto, que é onde mora o "começa HOJE"
const selo = (x, y, s, tam = 40) => `<g transform="translate(${x}, ${y}) rotate(-3)">
    <rect x="${-s.length * tam * 0.32 - 22}" y="-6" width="${s.length * tam * 0.64 + 44}" height="${tam + 26}"
          fill="${PRETO}"/>
    <rect x="${-s.length * tam * 0.32 - 28}" y="-12" width="${s.length * tam * 0.64 + 44}" height="${tam + 26}"
          fill="${LARANJA}" stroke="${PRETO}" stroke-width="6"/>
    ${txt(-6, tam + 4, s, tam, { cor: PRETO, esp: 4 })}</g>`;

const CONVITE = ['FAÇA PARTE DA MAIOR', 'COMUNIDADE DE', 'QUADRINHOS DE FUTEBOL', 'DO BRASIL.'];

// A FONTE ENCOLHE EM VEZ DE ESTOURAR, que é a mesma regra dos cards de jogo da casa. Sem isso a
// linha mais longa sai CORTADA nas laterais e o defeito não dá erro nenhum: o PNG é gerado, o
// script diz OK, e só o olho pega. Foi exatamente o que aconteceu na primeira rodada desta peça.
const caber = (linhas, tam, margem = 80) => {
  const maiorCh = Math.max(...linhas.map((l) => (l.t ?? l).length));
  const largura = maiorCh * tam * 0.62;          // Helvetica bold, caixa alta: ~0,62em por caractere
  const disponivel = W - margem * 2;
  return largura > disponivel ? Math.floor((tam * disponivel) / largura) : tam;
};

// ------------------------------------------------------------------------------ as variações
// A única diferença real entre elas é QUANTO da ilustração sobrevive. Em todas, o convite domina.
const COMPOR = {
  // 1. VELADO. A multidão inteira continua lá, mas afundada atrás de um véu da cor da marca: ela
  //    vira TEXTURA, e a textura é o que dá o recado de "muita gente" sem disputar a leitura.
  velado: () => ({
    arte: { y: 0, h: H, corte: 'center' },
    svg: `
      <rect width="${W}" height="${H}" fill="${VERDE}" fill-opacity="0.82"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${PRETO}" stroke-width="22"/>
      ${selo(CX, 150, 'COMEÇA HOJE')}
      ${bloco(CX, 430, CONVITE, caber(CONVITE, 78))}
      ${txt(CX, 740, 'Aqui não tem clube. Cabe o Brasil inteiro.', 38, { cor: LARANJA, esp: 0 })}
      ${redes(880)}
      ${txt(CX, 1130, '@futgibi', 56, { esp: 9 })}
      ${txt(CX, 1200, 'futgibi.com', 34, { cor: LARANJA, esp: 4 })}`,
  }),

  // 2. FAIXA. A ilustração encolhe pra uma faixa no rodapé e vira o CHÃO do post. É a que dá mais
  //    espaço ao texto e a que menos depende de a arte ter saído boa.
  faixa: () => ({
    arte: { y: H - 470, h: 470, corte: 'center' },
    svgFundo: `<rect width="${W}" height="${H}" fill="${VERDE}"/>`,
    svg: `
      ${selo(CX, 132, 'COMEÇA HOJE')}
      ${bloco(CX, 340, CONVITE, caber(CONVITE, 80))}
      ${txt(CX, 640, 'Aqui não tem clube. Cabe o Brasil inteiro.', 38, { cor: LARANJA, esp: 0 })}
      ${redes(700)}
      ${txt(CX, 930, '@futgibi', 58, { esp: 9 })}
      <rect x="0" y="${H - 470}" width="${W}" height="12" fill="${PRETO}"/>`,
  }),

  // 4. RESPIRO. A única que não esconde NADA: usa o espaço vazio que a própria ilustração deixou
  //    (a grama, na cena da roda) como área de texto. Quando a arte tem espaço negativo de sobra,
  //    esta ganha das outras três, porque o convite domina sem que a ilustração pague por isso.
  //    Só serve com arte que TENHA esse vazio embaixo: na arquibancada ela cai em cima de rosto.
  respiro: () => ({
    arte: { y: 0, h: H, corte: 'top' },
    svg: `
      ${selo(158, 96, 'COMEÇA HOJE', 34)}
      <rect x="0" y="${H - 620}" width="${W}" height="620" fill="${VERDE}" fill-opacity="0.94"/>
      <rect x="0" y="${H - 620}" width="${W}" height="11" fill="${PRETO}"/>
      ${bloco(CX, H - 540, CONVITE, caber(CONVITE, 66))}
      ${txt(CX, H - 218, 'Aqui não tem clube. Cabe o Brasil inteiro.', 34, { cor: LARANJA, esp: 0 })}
      ${redes(H - 190, { lado: 84, gap: 20 })}
      ${txt(CX, H - 48, '@futgibi', 42, { esp: 8 })}`,
  }),

  // 3. BALÃO. O convite sai da BOCA da torcida: o balão cobre o miolo da multidão e ela aparece só
  //    nas bordas. É a mais quadrinho das três, e a que amarra a arte ao texto em vez de separar.
  balao: () => ({
    arte: { y: 0, h: H, corte: 'center' },
    svg: `
      <rect width="${W}" height="${H}" fill="${VERDE}" fill-opacity="0.22"/>
      <g stroke="${PRETO}" stroke-width="14" fill="${CREME}" stroke-linejoin="round">
        <path d="M 76,190 h 928 a 66,66 0 0 1 66,66 v 700 a 66,66 0 0 1 -66,66 h -300
                 l -196,158 v -158 h -432 a 66,66 0 0 1 -66,-66 v -700 a 66,66 0 0 1 66,-66 z"/>
      </g>
      ${selo(CX, 118, 'COMEÇA HOJE')}
      ${bloco(CX, 350, CONVITE, caber(CONVITE, 74, 120), { cor: PRETO })}
      ${txt(CX, 650, 'Aqui não tem clube.', 42, { cor: LARANJA, esp: 0 })}
      ${txt(CX, 702, 'Cabe o Brasil inteiro.', 42, { cor: LARANJA, esp: 0 })}
      ${redes(770, { lado: 118, gap: 24, fundo: VERDE })}
      ${txt(CX, 970, '@futgibi', 50, { cor: PRETO, esp: 9 })}`,
  }),
};

const nome = flag('arte') || (await readdir(ILUS).catch(() => []))
  .filter((f) => f.endsWith('.png'))[0]?.replace('.png', '');
if (!nome) { console.error('FAIL nao ha ilustracao em _ilustracoes/ (rode gerar-ilustracao.mjs)'); process.exit(1); }

await mkdir(SAIDA, { recursive: true });
const feitas = [];

for (const [id, fn] of Object.entries(COMPOR)) {
  const c = fn();
  const arte = await sharp(path.join(ILUS, `${nome}.png`))
    .resize({ width: W, height: c.arte.h, fit: 'cover', position: c.arte.corte || 'top' })
    .png().toBuffer();

  const camada = (svg) => ({ top: 0, left: 0,
    input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`) });

  const arq = path.join(SAIDA, `${id}.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: VERDE } })
    .composite([
      ...(c.svgFundo ? [camada(c.svgFundo)] : []),
      { input: arte, top: c.arte.y, left: 0 },
      camada(c.svg),
    ]).png().toFile(arq);
  feitas.push({ id, arq });
  console.log('OK ->', arq);
}

// folha numerada, que é como toda decisão visual da casa é tomada
const TW = 420, TH = Math.round(TW * H / W), PAD = 38, GAP = 28, ROT = 56;
const pecas = [];
for (const [i, f] of feitas.entries()) {
  pecas.push({ input: await sharp(f.arq).resize(TW, TH).png().toBuffer(),
    left: PAD + i * (TW + GAP), top: PAD + ROT });
}
const FW = PAD * 2 + TW * feitas.length + GAP * (feitas.length - 1), FH = PAD * 2 + TH + ROT;
const rot = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">
  ${feitas.map((f, i) => `<text x="${PAD + i * (TW + GAP) + TW / 2}" y="${PAD + 36}"
     text-anchor="middle" font-family="Helvetica" font-size="31" font-weight="bold"
     fill="#F3E7D0">${i + 1}. ${f.id}</text>`).join('')}</svg>`;
await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite([...pecas, { input: Buffer.from(rot), left: 0, top: 0 }])
  .png().toFile(path.join(SAIDA, '_folha.png'));
console.log('OK ->', path.join(SAIDA, '_folha.png'));
