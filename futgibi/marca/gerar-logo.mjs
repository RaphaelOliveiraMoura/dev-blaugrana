// Candidatas de LOGOTIPO. Era a maior lacuna do sistema: até aqui "Fut Gibi" era uma palavra
// digitada numa fonte com espaçamento aumentado, ou seja, trocar a palavra virava outra marca.
//
// CADA DIREÇÃO CARREGA UM CONCEITO, e é isso que se escolhe aqui, não o desenho fino:
//   1. capa     · o nome dentro da faixa de capa de gibi, com o número da edição
//   2. carimbo  · o nome dentro do burst, a explosão das capas antigas
//   3. gol      · o nome dentro da trave, herdando o motivo que o banner já usa
//   4. figurinha· o nome na moldura de cromo de álbum, que é o objeto mais brasileiro da lista
//   5. desalinho· o nome com o registro de impressão barata fora de esquadro
//   6. camisa   · o nome com o 12 encaixado, que é o conceito que a marca já tem
//
// A prova sai em TRÊS TESTES, porque é onde logo morre: tamanho de favicon (32px), uma cor só
// (sem o laranja pra salvar), e invertido sobre a cor da marca.
//
//   node futgibi/marca/gerar-logo.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE, T } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'logo');

const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

// O wordmark é desenhado com a Oswald por TEXTO no SVG, e não vetorizado à mão, porque nesta
// rodada o que se escolhe é o CONCEITO. Escolhido o caminho, o passo seguinte é converter as
// letras em curva e ajustar o encaixe manualmente, que é o que faz um logo parar de ser "fonte".
const FONTE = '"Oswald","Big Shoulders Display","Arial Narrow",Impact,sans-serif';
const nome = (x, y, tam, cor, { esp = 1, anc = 'middle', peso = 700 } = {}) =>
  `<text x="${x}" y="${y}" text-anchor="${anc}" font-family='${FONTE}' font-size="${tam}"
    font-weight="${peso}" letter-spacing="${esp}" fill="${cor}">Fut Gibi</text>`;

// O `fundo` não é enfeite: sem ele a versão INVERTIDA desenhava creme sobre transparente e o logo
// simplesmente sumia na folha de prova. Fundo declarado é o que torna o teste honesto.
const svg = (w, h, corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${fundo ? `  <rect width="${w}" height="${h}" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

const burstPath = (cx, cy, R, { pontas = 14, semente = 7, interno = 0.66 } = {}) => {
  const pts = [];
  for (let i = 0; i < pontas * 2; i++) {
    const a = (i / (pontas * 2)) * Math.PI * 2 - Math.PI / 2;
    const k = (i % 2 ? interno : 1) * (1 + (rnd(semente + i * 4.7) - 0.5) * 0.14);
    pts.push(`${(cx + Math.cos(a) * R * k).toFixed(1)},${(cy + Math.sin(a) * R * k).toFixed(1)}`);
  }
  return 'M ' + pts.join(' L ') + ' Z';
};

// tinta = a cor que muda por teste. Cada candidata recebe {tinta, papel, acento}.
const LOGOS = {
  // 1. CAPA DE GIBI: a faixa do título mais a cartela da edição. É o que a marca já faz nas peças.
  '1-capa': (c) => svg(560, 200, `
  <rect x="6" y="6" width="548" height="188" fill="${c.papel}" stroke="${c.tinta}" stroke-width="10"/>
  <rect x="6" y="6" width="548" height="54" fill="${c.tinta}"/>
  <text x="26" y="45" font-family='${FONTE}' font-size="28" font-weight="700" letter-spacing="5"
    fill="${c.papel}">FUTEBOL EM QUADRINHOS</text>
  <rect x="466" y="14" width="80" height="38" fill="${c.acento}"/>
  <text x="506" y="44" text-anchor="middle" font-family='${FONTE}' font-size="27" font-weight="700"
    fill="${c.tinta}">Nº 1</text>
  ${nome(280, 162, 108, c.tinta, { esp: 3 })}`, c.fundo),

  // 2. CARIMBO: o nome dentro do burst. É o carimbo virando a própria marca.
  '2-carimbo': (c) => svg(460, 460, `
  <path d="${burstPath(230, 230, 216)}" fill="${c.acento}" stroke="${c.tinta}" stroke-width="12"
    stroke-linejoin="round"/>
  <path d="${burstPath(230, 230, 168, { pontas: 14, semente: 7, interno: 0.72 })}" fill="none"
    stroke="${c.tinta}" stroke-width="5" opacity="0.55"/>
  ${nome(230, 236, 68, c.tinta, { esp: 1 })}
  <text x="230" y="270" text-anchor="middle" font-family='${FONTE}' font-size="17" font-weight="700"
    letter-spacing="3" fill="${c.tinta}">FUTEBOL EM QUADRINHOS</text>`, c.fundo),

  // 3. GOL: o nome dentro da trave, com a rede atrás. Herda o motivo do banner.
  '3-gol': (c) => svg(560, 300, `
  <defs><pattern id="r3" width="34" height="34" patternUnits="userSpaceOnUse">
    <path d="M0,0 L34,34 M34,0 L0,34" stroke="${c.tinta}" stroke-width="3" opacity="0.4" fill="none"/>
  </pattern></defs>
  <rect x="46" y="52" width="468" height="196" fill="url(#r3)"/>
  <path d="M40 250 V46 H520 V250" fill="none" stroke="${c.tinta}" stroke-width="16"
    stroke-linecap="square"/>
  <rect x="96" y="112" width="368" height="86" fill="${c.papel}" stroke="${c.tinta}" stroke-width="8"/>
  ${nome(280, 182, 74, c.tinta, { esp: 2 })}`, c.fundo),

  // 4. FIGURINHA: a moldura de cromo de álbum. O objeto mais brasileiro da lista.
  '4-figurinha': (c) => svg(420, 520, `
  <rect x="8" y="8" width="404" height="504" rx="14" fill="${c.acento}" stroke="${c.tinta}" stroke-width="10"/>
  <rect x="34" y="34" width="352" height="380" fill="${c.papel}" stroke="${c.tinta}" stroke-width="7"/>
  <circle cx="210" cy="196" r="96" fill="none" stroke="${c.tinta}" stroke-width="7" opacity="0.5"/>
  <text x="210" y="232" text-anchor="middle" font-family='${FONTE}' font-size="118" font-weight="700"
    fill="${c.tinta}">12</text>
  ${nome(210, 482, 68, c.tinta, { esp: 3 })}`, c.fundo),

  // 5. DESALINHO: o registro de impressão barata fora de esquadro. O "defeito" vira assinatura.
  '5-desalinho': (c) => svg(560, 200, `
  ${nome(284, 132, 116, c.acento, { esp: 2 })}
  ${nome(278, 126, 116, c.tinta, { esp: 2 })}
  <rect x="60" y="150" width="440" height="9" fill="${c.tinta}"/>
  <rect x="66" y="156" width="440" height="9" fill="${c.acento}" opacity="0.85"/>`, c.fundo),

  // 6. CAMISA: o 12 encaixado no nome, que é o conceito que a marca já carrega.
  '6-camisa': (c) => svg(560, 220, `
  <path d="M40 60 L84 36 L120 52 L156 36 L200 60 L182 106 L160 96 V186 H80 V96 L58 106 Z"
    fill="${c.papel}" stroke="${c.tinta}" stroke-width="9" stroke-linejoin="round"/>
  <text x="120" y="156" text-anchor="middle" font-family='${FONTE}' font-size="72" font-weight="700"
    fill="${c.tinta}">12</text>
  ${nome(228, 132, 88, c.tinta, { esp: 2, anc: 'start' })}
  <text x="230" y="168" font-family='${FONTE}' font-size="19" font-weight="700" letter-spacing="3.4"
    fill="${c.tinta}" opacity="0.85">FUTEBOL EM QUADRINHOS</text>`, c.fundo),
};

const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, fundo: null },
  mono:      { tinta: PRETO, papel: CREME, acento: CREME, fundo: null },
  invertido: { tinta: CREME, papel: VERDE, acento: VERDE, fundo: VERDE },
};

await mkdir(SAIDA, { recursive: true });
for (const [id, fn] of Object.entries(LOGOS)) {
  for (const [teste, cores] of Object.entries(TESTES)) {
    await writeFile(path.join(SAIDA, `${id}-${teste}.svg`), fn(cores));
  }
}
console.log(`OK -> ${SAIDA}  (${Object.keys(LOGOS).length} direções x ${Object.keys(TESTES).length} testes)`);
