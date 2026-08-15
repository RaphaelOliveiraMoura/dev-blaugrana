// Candidatas da ARTE DE CONVITE (a que fica fixada no topo dos quatro perfis).
//
// O objetivo dela nao e "me siga": e fazer quem chega sentir que ja pertence. A chamada foi
// escolhida pelo Raphael em 15/08/2026 entre tres leques, e o que a fez ganhar e que ela REMOVE
// UMA BARREIRA em vez de descrever um lugar. As descartadas ("o time tem onze, a doze e sua") todas
// erravam no mesmo ponto: separavam o time de quem le antes de convidar.
//
// COMO ELA E FEITA, e e o arranjo que a casa ja usa no acabamento dos quadrinhos:
//   o MASCOTE vem ilustrado (asset pose torcedor-12 chamar, no traco rabisco-riso)
//   o TEXTO e as CORES entram por codigo por cima
// Texto pedido por prompt sai torto e cor pedida por prompt vira quatro verdes diferentes no perfil
// (IDENTIDADE.md secao 2). A multidao da arquibancada tambem e por codigo, de proposito: multidao
// gerada por modelo e onde ele deforma rosto, e silhueta abstrata nao tem esse problema.
//
// Formato 1080x1440 (3:4, o da casa): o Instagram mostra inteiro, cabe no Photo Mode do TikTok e
// sobrevive ao corte do X. Escolha OLHANDO a _folha.png.
//
//   node futgibi/marca/variacoes-convite.mjs [--saida=<dir>]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { VERDE, VERDE_FUNDO, CREME, LARANJA, PRETO, FONTE_ARTE, conferirFonte, tintaSobre } from './tokens.mjs';

await conferirFonte(sharp);   // a arte não sai em fallback silencioso

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = process.argv.find((a) => a.startsWith('--saida='))?.slice(8)
  || path.join(AQUI, '_variacoes-convite');
const MASCOTE = path.join(AQUI, '../../saga-fut/personagens/torcedor-12/poses/chamar.png');

const W = 1080, H = 1440, CX = W / 2;

const CHAMADA_1 = 'PRA VESTIR A 12,';
const CHAMADA_2 = 'BASTA GOSTAR DE FUTEBOL.';

// Helvetica em tudo, igual ao banner e aos destaques ja aprovados: a personalidade vem do desenho.
const txt = (x, y, s, tam, { cor = CREME, esp = 2, anc = 'middle' } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family='${FONTE_ARTE}' font-size="${tam}"
    font-weight="bold" letter-spacing="${esp}" fill="${cor}">${s}</text>`;

// A multidao: fileiras de torcedor que CRESCEM pra frente, entao o olho le profundidade sem
// perspectiva desenhada. Desenhada de tras pra frente, pra fileira da frente cobrir a de tras.
//
// Duas coisas que a primeira versao errou e que valem pra qualquer multidao por codigo: cabeca
// colada no ombro do vizinho vira parede de bolinha (precisa de FOLGA lateral), e fileira sem
// sobreposicao vertical le como listra e nao como arquibancada (a da frente tem que MORDER a de
// tras). O ombro e mais largo que a cabeca, senao a silhueta parece ovo.
const multidao = (base, fileiras, { corA = CREME, corB = '#DCCBAA' } = {}) =>
  Array.from({ length: fileiras }, (_, f) => {
    const r = 24 + f * 7;                       // f=0 e a fileira mais ao FUNDO (menor)
    const y = base - (fileiras - 1 - f) * 74;   // ... e a mais alta na tela
    const passo = r * 3.1;                      // folga lateral: sem ela vira parede
    const n = Math.ceil(W / passo) + 2;
    const cor = f % 2 ? corB : corA;
    return Array.from({ length: n }, (_, i) => {
      const x = -passo + i * passo + (f % 2 ? passo / 2 : 0);
      const om = r * 1.7;                       // meia-largura do ombro
      return `<g fill="${cor}" stroke="${PRETO}" stroke-width="${5 + f}" stroke-linejoin="round">
          <path d="M ${x - om},${y + r * 3.4} v -${r * 0.7}
                   a ${om},${r * 1.5} 0 0 1 ${om * 2},0 v ${r * 0.7} Z"/>
          <circle cx="${x}" cy="${y}" r="${r}"/></g>`;
    }).join('');
  }).join('');

// -------------------------------------------------------------------------- as tres candidatas
// Cada uma declara o SVG de fundo, o SVG de frente (o que fica por cima do mascote) e onde o
// mascote entra. `mascote:null` = a peca nao usa ilustracao.
const CANDIDATAS = {
  '1-camisa': {
    fundo: `<rect width="${W}" height="${H}" fill="${VERDE}"/>
      ${txt(CX, 150, CHAMADA_1, 62)}
      ${txt(CX, 226, CHAMADA_2, 62, { cor: tintaSobre(VERDE, { destaque: true }) })}`,
    mascote: { alt: 1010, base: 1300 },
    frente: `${txt(CX, 1390, '@futgibi', 58, { esp: 8 })}`,
  },

  '2-arquibancada': {
    fundo: `<rect width="${W}" height="${H}" fill="${VERDE}"/>
      ${multidao(700, 4)}
      ${txt(CX, 150, CHAMADA_1, 62)}
      ${txt(CX, 226, CHAMADA_2, 62, { cor: tintaSobre(VERDE, { destaque: true }) })}`,
    mascote: { alt: 880, base: 1330 },
    frente: `${txt(CX, 1400, '@futgibi', 56, { esp: 8 })}`,
  },

  '3-edicao-1': {
    // a moldura de capa de gibi: a faixa do titulo em cima, o numero da edicao no canto, e a
    // chamada na base, que e onde a capa de revista sempre poe a linha de apoio.
    fundo: `<rect width="${W}" height="${H}" fill="${LARANJA}"/>
      <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="${VERDE}"
            stroke="${PRETO}" stroke-width="12"/>
      <rect x="40" y="40" width="${W - 80}" height="146" fill="${CREME}" stroke="${PRETO}" stroke-width="12"/>
      ${txt(CX, 146, 'FUTGIBI', 92, { cor: PRETO, esp: 14 })}
      ${multidao(700, 3, { corA: '#0F4A2A', corB: '#0B3A21' })}`,
    mascote: { alt: 820, base: 1160 },
    frente: `<g transform="translate(915, 300)">
        <circle r="104" fill="${CREME}" stroke="${PRETO}" stroke-width="12"/>
        ${txt(0, -12, 'Nº', 40, { cor: PRETO, esp: 1 })}
        ${txt(0, 62, '1', 104, { cor: tintaSobre(CREME, { destaque: true }), esp: 0 })}
      </g>
      <rect x="40" y="1150" width="${W - 80}" height="250" fill="${CREME}"
            stroke="${PRETO}" stroke-width="12"/>
      ${txt(CX, 1232, CHAMADA_1, 58, { cor: PRETO })}
      ${txt(CX, 1302, CHAMADA_2, 58, { cor: tintaSobre(CREME, { destaque: true }) })}
      ${txt(CX, 1372, '@futgibi', 44, { cor: PRETO, esp: 8 })}`,
  },
};

await mkdir(SAIDA, { recursive: true });

const feitas = [];
for (const [id, c] of Object.entries(CANDIDATAS)) {
  const camadas = [{ input: Buffer.from(`<svg width="${W}" height="${H}"
    xmlns="http://www.w3.org/2000/svg">${c.fundo}</svg>`), top: 0, left: 0 }];

  if (c.mascote) {
    // a sprite e ancorada no PE, entao a posicao e dada pela linha de base e nao pelo topo: assim
    // trocar a altura do mascote nao o faz flutuar nem afundar.
    const sprite = await sharp(MASCOTE).resize({ height: c.mascote.alt }).png().toBuffer();
    const { width: sw, height: sh } = await sharp(sprite).metadata();
    camadas.push({ input: sprite, top: Math.round(c.mascote.base - sh), left: Math.round(CX - sw / 2) });
  }

  camadas.push({ input: Buffer.from(`<svg width="${W}" height="${H}"
    xmlns="http://www.w3.org/2000/svg">${c.frente}</svg>`), top: 0, left: 0 });

  const arq = path.join(SAIDA, `${id}.png`);
  await sharp({ create: { width: W, height: H, channels: 4, background: VERDE } })
    .composite(camadas).png().toFile(arq);
  feitas.push({ id, arq });
  console.log('OK ->', arq);
}

// Folha de escolha: lado a lado e NUMERADAS, que e como toda decisao visual da casa e tomada.
const TW = 420, TH = Math.round(TW * H / W), PAD = 40, GAP = 32, ROT = 58;
const pecas = [];
for (const [i, f] of feitas.entries()) {
  pecas.push({
    input: await sharp(f.arq).resize(TW, TH).png().toBuffer(),
    left: PAD + i * (TW + GAP), top: PAD + ROT,
  });
}
const FW = PAD * 2 + TW * feitas.length + GAP * (feitas.length - 1);
const FH = PAD * 2 + TH + ROT;
const rotulos = `<svg width="${FW}" height="${FH}" xmlns="http://www.w3.org/2000/svg">
  ${feitas.map((f, i) => `<text x="${PAD + i * (TW + GAP) + TW / 2}" y="${PAD + 36}"
     text-anchor="middle" font-family='${FONTE_ARTE}' font-size="32" font-weight="bold"
     fill="#F3E7D0">${i + 1}. ${f.id.slice(2)}</text>`).join('')}</svg>`;

await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 24, g: 24, b: 26, alpha: 1 } } })
  .composite([...pecas, { input: Buffer.from(rotulos), left: 0, top: 0 }])
  .png().toFile(path.join(SAIDA, '_folha.png'));
console.log('OK ->', path.join(SAIDA, '_folha.png'));
