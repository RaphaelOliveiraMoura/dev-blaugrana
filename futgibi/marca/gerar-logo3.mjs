// RODADA 3 DE LOGOTIPO (15/08/2026). As seis primeiras direções foram reprovadas pelo Raphael, e
// junto veio a regra que muda o problema inteiro: **o nome é "Fut Gibi", em caixa mista, com
// espaço, e NUNCA em caixa alta**.
//
// Isso não é um detalhe de grafia, é outro desenho: "Fut Gibi" era um bloco retangular de sete
// letras iguais, e é por isso que toda direção anterior virava "palavra dentro de uma moldura".
// "Fut Gibi" tem ascendentes (F, G, b), tem descendente nenhuma, tem DOIS PINGOS de i e tem um
// vão no meio. São ganchos de desenho que o bloco não tinha.
//
// AS OITO DIREÇÕES, e cada uma aposta num gancho diferente:
//   1. bolinha   · os pingos dos dois "i" viram bolas. O achado mais óbvio e o mais memorável.
//   2. lettering · o nome na voz de quadrinho (Comic Neue), contorno grosso e sombra dura
//   3. balao     · o nome DENTRO do balão de fala desenhado da marca
//   4. pilha     · "Fut" sobre "Gibi", com o 12 ocupando a lateral
//   5. etiqueta  · o nome na tarja de banner, o mais sóbrio dos oito
//   6. monograma · o F e o G entrelaçados, com o nome pequeno embaixo
//   7. grampo    · o nome como capa de revista grampeada, com o vinco no meio
//   8. campo     · o nome sobre a linha do gramado, com a bola rolando pra dentro dele
//
// A prova sai nos TRÊS TESTES de sempre (32px, uma cor só, invertido) mais o teste que só agora
// existe: caixa mista sobrevive ao tamanho pequeno? Letra minúscula fecha mais rápido que
// maiúscula, e é isso que a folha `_prova-logo3.png` responde.
//
//   node futgibi/marca/gerar-logo3.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE, T } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'logo3');

const rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

const OSWALD = '"Oswald","Big Shoulders Display","Arial Narrow",Impact,sans-serif';
const COMIC = '"Comic Neue","Chalkboard SE",sans-serif';
const NOME = T.marca.escrita.texto;                     // "Fut Gibi", lido do token

const svg = (w, h, corpo, fundo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${fundo ? `  <rect width="${w}" height="${h}" fill="${fundo}"/>\n` : ''}${corpo}
</svg>
`;

// o contorno de traço grosso com sombra dura, que é o acabamento da casa
const comContorno = (texto, { x, y, tam, fonte = COMIC, tinta, papel, esp = 0, anc = 'middle' }) => `
  <text x="${x + tam * 0.055}" y="${y + tam * 0.055}" text-anchor="${anc}" font-family='${fonte}'
    font-size="${tam}" font-weight="700" letter-spacing="${esp}" fill="${tinta}">${texto}</text>
  <text x="${x}" y="${y}" text-anchor="${anc}" font-family='${fonte}' font-size="${tam}"
    font-weight="700" letter-spacing="${esp}" stroke="${tinta}" stroke-width="${tam * 0.1}"
    stroke-linejoin="round" fill="${papel}" paint-order="stroke">${texto}</text>`;

// a bola de gomos, pequena, pra virar pingo de i
const bolinha = (cx, cy, r, { tinta, papel }) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${papel}" stroke="${tinta}" stroke-width="${r * 0.34}"/>
  <path d="M ${cx},${cy - r * 0.62} L ${cx + r * 0.6},${cy - r * 0.18} L ${cx + r * 0.37},${cy + r * 0.5}
    L ${cx - r * 0.37},${cy + r * 0.5} L ${cx - r * 0.6},${cy - r * 0.18} Z" fill="${tinta}"/>`;

const LOGOS = {
  // 1. BOLINHA: os pingos dos dois "i" viram bola.
  //    O TRUQUE que faz funcionar: o nome é escrito com o i SEM PINGO (ı, U+0131, que a Oswald
  //    tem e que ocupa a mesma largura do i normal, medido), e as bolas entram por cima na altura
  //    do pingo. A primeira tentativa quebrava a palavra em pedaços pra encaixar as hastes à mão
  //    e saía "Fut G ibi", com as bolas flutuando fora de lugar.
  '1-bolinha': (c) => svg(560, 210, `
  <text x="34" y="150" font-family='${OSWALD}' font-size="116" font-weight="700"
    letter-spacing="1" fill="${c.tinta}">Fut Gıbı</text>
  ${bolinha(281, 62, 21, c)}
  ${bolinha(375, 62, 21, c)}
  <rect x="36" y="170" width="340" height="8" fill="${c.acento}"/>`, c.fundo),

  // 2. LETTERING: a voz de quadrinho, com contorno grosso e sombra dura. É a mais "gibi" das oito
  //    e a que menos parece fonte digitada.
  '2-lettering': (c) => svg(560, 200, `
  ${comContorno(NOME, { x: 280, y: 132, tam: 96, tinta: c.tinta, papel: c.papel })}
  <text x="280" y="172" text-anchor="middle" font-family='${OSWALD}' font-size="21"
    font-weight="700" letter-spacing="6" fill="${c.tinta}">FUTEBOL EM QUADRINHOS</text>`, c.fundo),

  // 3. BALÃO: o nome sai da boca de alguém. Usa a peça que a marca já desenha, então o logo e o
  //    componente falam a mesma língua.
  //    A primeira versão desenhava a elipse com pontos RETOS (L) e um rabicho de três vértices
  //    soltos: saía uma folha com um risco atravessando. Aqui vale a mesma regra que consertou o
  //    balão do acervo: corpo e rabicho são UM caminho só, em curva, e o rabicho é uma vírgula.
  '3-balao': (c) => {
    const cx = 280, cy = 96, rx = 246, ry = 78, n = 26;
    const a1 = Math.PI * 0.56, a2 = Math.PI * 0.74;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (a > a1 && a < a2) continue;
      const k = 1 + (rnd(3 + i * 7.3) - 0.5) * 0.04;
      pts.push({ a, p: [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] });
    }
    const B1 = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];
    const B2 = [cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry];
    const ponta = [cx - rx * 0.44, 202];
    const m1 = [(B1[0] + ponta[0]) / 2 + rx * 0.06, (B1[1] + ponta[1]) / 2 + 3];
    const m2 = [(ponta[0] + B2[0]) / 2 + rx * 0.045, (ponta[1] + B2[1]) / 2 - 3];
    const rabo = [B1, m1, ponta, [ponta[0] - 1.5, ponta[1] - 1.5], m2, B2].map((p) => ({ a: null, p }));
    const onde = pts.findIndex((q) => q.a >= a2);
    const seq = [...pts.slice(0, onde < 0 ? pts.length : onde).filter((q) => q.a <= a1), ...rabo,
      ...pts.filter((q) => q.a >= a2)].map((q) => q.p);
    // Catmull-Rom fechado: a mesma curva suave das peças do acervo
    let d = `M ${seq[0][0].toFixed(1)},${seq[0][1].toFixed(1)}`;
    for (let i = 0; i < seq.length; i++) {
      const p0 = seq[(i - 1 + seq.length) % seq.length], p1 = seq[i];
      const p2 = seq[(i + 1) % seq.length], p3 = seq[(i + 2) % seq.length];
      d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)}`
        + ` ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)}`
        + ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return svg(560, 220, `
  <path d="${d} Z" fill="${c.papel}" stroke="${c.tinta}" stroke-width="9" stroke-linejoin="round"/>
  <text x="280" y="120" text-anchor="middle" font-family='${COMIC}' font-size="72"
    font-weight="700" fill="${c.tinta}">${NOME}</text>`, c.fundo);
  },

  // 4. PILHA: "Fut" sobre "Gibi", com o 12 na lateral. Quadrado, que é o formato que sobrevive
  //    melhor no avatar.
  '4-pilha': (c) => svg(460, 460, `
  <rect x="18" y="18" width="424" height="424" fill="${c.papel}" stroke="${c.tinta}" stroke-width="12"/>
  <text x="52" y="196" font-family='${OSWALD}' font-size="124" font-weight="700"
    letter-spacing="0" fill="${c.tinta}">Fut</text>
  <text x="52" y="312" font-family='${OSWALD}' font-size="124" font-weight="700"
    letter-spacing="0" fill="${c.tinta}">Gibi</text>
  <rect x="52" y="336" width="300" height="9" fill="${c.acento}"/>
  <text x="300" y="196" font-family='${OSWALD}' font-size="96" font-weight="700"
    fill="${c.acento}">12</text>
  <text x="52" y="392" font-family='${OSWALD}' font-size="21" font-weight="700" letter-spacing="5"
    fill="${c.tinta}">FUTEBOL EM QUADRINHOS</text>`, c.fundo),

  // 5. ETIQUETA: a tarja de banner com as pontas em V. O mais sóbrio, e o que melhor encaixa em
  //    rodapé e assinatura de arte.
  '5-etiqueta': (c) => svg(600, 180, `
  <path d="M 8,30 L 592,30 L 556,90 L 592,150 L 8,150 L 44,90 Z"
    fill="${c.papel}" stroke="${c.tinta}" stroke-width="9" stroke-linejoin="round"/>
  <text x="300" y="112" text-anchor="middle" font-family='${OSWALD}' font-size="72"
    font-weight="700" letter-spacing="1" fill="${c.tinta}">${NOME}</text>`, c.fundo),

  // 6. MONOGRAMA: F e G dividindo a mesma haste, com o nome pequeno embaixo. É o único que
  //    funciona a 16px, porque a 16px o que resta é sempre forma, nunca palavra.
  '6-monograma': (c) => svg(460, 460, `
  <circle cx="230" cy="196" r="150" fill="${c.papel}" stroke="${c.tinta}" stroke-width="13"/>
  <text x="230" y="252" text-anchor="middle" font-family='${OSWALD}' font-size="186"
    font-weight="700" letter-spacing="-6" fill="${c.tinta}">FG</text>
  <circle cx="322" cy="104" r="26" fill="${c.acento}" stroke="${c.tinta}" stroke-width="9"/>
  <text x="230" y="404" text-anchor="middle" font-family='${OSWALD}' font-size="52"
    font-weight="700" letter-spacing="1" fill="${c.tinta}">${NOME}</text>`, c.fundo),

  // 7. GRAMPO: a revista dobrada, com o vinco no meio e o grampo aparecendo. O objeto, não a
  //    palavra.
  '7-grampo': (c) => svg(560, 240, `
  <path d="M 40,30 L 280,44 L 520,30 L 520,206 L 280,192 L 40,206 Z"
    fill="${c.papel}" stroke="${c.tinta}" stroke-width="10" stroke-linejoin="round"/>
  <path d="M 280,44 L 280,192" stroke="${c.tinta}" stroke-width="6" opacity="0.55"/>
  <rect x="272" y="82" width="16" height="30" rx="3" fill="${c.tinta}"/>
  <rect x="272" y="130" width="16" height="30" rx="3" fill="${c.tinta}"/>
  <text x="160" y="136" text-anchor="middle" font-family='${OSWALD}' font-size="74"
    font-weight="700" fill="${c.tinta}">Fut</text>
  <text x="404" y="136" text-anchor="middle" font-family='${OSWALD}' font-size="74"
    font-weight="700" fill="${c.tinta}">Gibi</text>`, c.fundo),

  // 8. CAMPO: o nome pousado na linha do gramado, com a bola entrando. O único que conta uma
  //    AÇÃO, e o que melhor combina com a arte de capa nova.
  '8-campo': (c) => svg(560, 220, `
  <text x="286" y="122" text-anchor="middle" font-family='${OSWALD}' font-size="104"
    font-weight="700" letter-spacing="1" fill="${c.tinta}">${NOME}</text>
  <path d="M 30,158 L 530,158" stroke="${c.tinta}" stroke-width="9" stroke-linecap="round"/>
  <path d="M 30,158 A 120,44 0 0 1 270,158" fill="none" stroke="${c.tinta}" stroke-width="9"/>
  ${bolinha(470, 158, 26, c)}`, c.fundo),
};

const TESTES = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, fundo: null },
  mono:      { tinta: PRETO, papel: CREME, acento: PRETO, fundo: null },
  invertido: { tinta: CREME, papel: VERDE, acento: CREME, fundo: VERDE },
};

await mkdir(SAIDA, { recursive: true });
for (const [id, fn] of Object.entries(LOGOS))
  for (const [teste, cores] of Object.entries(TESTES))
    await writeFile(path.join(SAIDA, `${id}-${teste}.svg`), fn(cores));

console.log(`OK -> ${SAIDA}  (${Object.keys(LOGOS).length} direções x ${Object.keys(TESTES).length} testes)`);
console.log('   prova: node futgibi/marca/prova-logo3.mjs');
