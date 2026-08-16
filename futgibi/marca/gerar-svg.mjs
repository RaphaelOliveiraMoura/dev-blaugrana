// As peças da marca em SVG: balões, molduras, tarjas, o carimbo (burst), o padrão e os ícones.
//
// POR QUE SAIR DO PNG. As peças recortadas da folha do modelo resolveram o problema do "balão de
// CSS parece CSS", mas trouxeram outros três: não escalam (raster), não trocam de cor (o creme e o
// preto estão queimados no pixel), e vêm com a irregularidade que o modelo quis, não a que a marca
// quer. Em SVG as três somem de uma vez.
//
// COMO O TRAÇO FICA TRÊMULO SEM SER PNG: cada forma é uma lista de pontos que sofre um DESLOCAMENTO
// PSEUDO-ALEATÓRIO e vira curva suave. O ruído é determinístico (semente fixa), então a mesma peça
// sai idêntica toda vez: marca não pode mudar de forma a cada build.
//
//   node futgibi/marca/gerar-svg.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE, T } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'svg');

// ---------------------------------------------------------------- ruído determinístico -------
// Semente fixa: a peça precisa sair IGUAL em toda geração. Aleatório de verdade faria a marca
// mudar de forma a cada build, que é o oposto de identidade.
const rnd = (s) => { let x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };

// pontos -> curva fechada suave (Catmull-Rom convertido em Bézier cúbica)
const suave = (pts) => {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)}` +
         ` ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
};

// elipse com o raio perturbado: é o que dá o "desenhado à mão"
const elipseTremida = (cx, cy, rx, ry, { n = 26, tremor = 0.045, semente = 1 } = {}) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (rnd(semente + i * 7.3) - 0.5) * 2 * tremor;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });

// retângulo com as bordas trêmulas (cada lado ganha pontos intermediários perturbados)
const retTremido = (x, y, w, h, { passo = 34, tremor = 3.4, semente = 5 } = {}) => {
  const pts = [];
  const lado = (x0, y0, x1, y1, s) => {
    const dist = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(dist / passo));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const nx = -(y1 - y0) / dist, ny = (x1 - x0) / dist;   // normal do lado
      const o = (rnd(s + i * 3.1) - 0.5) * 2 * tremor;
      pts.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]);
    }
  };
  lado(x, y, x + w, y, semente);
  lado(x + w, y, x + w, y + h, semente + 40);
  lado(x + w, y + h, x, y + h, semente + 80);
  lado(x, y + h, x, y, semente + 120);
  return pts;
};

const svg = (w, h, corpo, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${extra}>
${corpo}
</svg>
`;

// `currentColor` no traço e uma variável no preenchimento: a peça troca de cor onde for usada,
// que é a coisa que o PNG não fazia.
const tinta = (d, { fill = `var(--peca-fundo, ${CREME})`, sw = 9 } = {}) =>
  `  <path d="${d}" fill="${fill}" stroke="currentColor" stroke-width="${sw}"
    stroke-linejoin="round" stroke-linecap="round"/>`;

const PECAS = {};

// ---------------------------------------------------------------- balões ---------------------
// CORPO E RABICHO SÃO UM CAMINHO SÓ, e essa é a diferença entre balão e sorvete. A versão
// anterior era uma elipse com um triângulo colado por baixo, e o olho lê exatamente isso: casquinha
// com bola em cima. Num balão desenhado de verdade o contorno DESCE pra dentro do rabicho e volta,
// sem emenda, e o rabicho é uma VÍRGULA (os dois lados curvam pro mesmo lado), não uma cunha reta.
//
// O rabicho existe pra APONTAR: balão com bico apontado pro vazio é o detalhe que denuncia
// quadrinho feito por quem não lê quadrinho.
const balao = (w, h, { rabicho = 'baixo-esq', semente = 3, tremor = 0.022, n = 24,
                       alcance = 0.55, curva = 0.1 } = {}) => {
  const cx = w / 2, cy = h * 0.40, rx = w / 2 - 14, ry = h * 0.34;
  // O arco que cede lugar ao rabicho fica no FUNDO da elipse, e estreito: na primeira calibragem
  // ele avançava pelo lado esquerdo (até 0.86π) e a volta do rabicho cavava uma mordida no meio
  // da borda. Base larga se consegue descendo a ponta, não alargando o arco.
  const a1 = Math.PI * 0.56, a2 = Math.PI * 0.74;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (a > a1 && a < a2) continue;
    const k = 1 + (rnd(semente + i * 7.3) - 0.5) * 2 * tremor;
    pts.push({ a, p: [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] });
  }
  const B1 = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];   // onde o rabicho nasce
  const B2 = [cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry];   // onde ele devolve o contorno
  const ponta = [cx - rx * alcance, h - 6];
  // A VÍRGULA: os dois pontos de meio são empurrados pro MESMO lado (+x). Empurrar pra lados
  // opostos volta a dar cunha; não empurrar dá triângulo. O mesmo lado é o que faz a curva.
  const desloc = rx * curva;
  const m1 = [(B1[0] + ponta[0]) / 2 + desloc, (B1[1] + ponta[1]) / 2 + 4];
  const m2 = [(ponta[0] + B2[0]) / 2 + desloc * 0.72, (ponta[1] + B2[1]) / 2 - 4];
  // a ponta entra DUPLICADA: Catmull-Rom arredonda tudo, e dois pontos quase juntos são o jeito
  // de manter o bico afiado sem abrir mão da suavização no resto
  const rabo = [B1, m1, ponta, [ponta[0] - 1.5, ponta[1] - 1.5], m2, B2].map((p) => ({ a: null, p }));
  const onde = pts.findIndex((q) => q.a >= a2);
  const ordem = [...pts.slice(0, onde < 0 ? pts.length : onde).filter((q) => q.a <= a1), ...rabo,
                 ...pts.filter((q) => q.a >= a2)];
  let seq = ordem.map((q) => q.p);
  if (rabicho === 'baixo-dir') seq = seq.map(([x, y]) => [w - x, y]);
  return svg(w, h, tinta(suave(seq)));
};
PECAS['balao-fala'] = balao(420, 380, { semente: 3 });
PECAS['balao-fala-dir'] = balao(420, 380, { rabicho: 'baixo-dir', semente: 11 });
PECAS['balao-largo'] = balao(560, 340, { semente: 21, alcance: 0.52, curva: 0.06 });

// balão de PENSAMENTO: nuvem de bolhas + três bolinhas de rastro
{
  const w = 440, h = 400, cx = w / 2, cy = h * 0.42, rx = w / 2 - 24, ry = h * 0.36;
  const n = 11;
  const bolhas = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 42 + rnd(i * 5.5) * 14;
    return `  <circle cx="${(cx + Math.cos(a) * rx * 0.82).toFixed(1)}" cy="${(cy + Math.sin(a) * ry * 0.82).toFixed(1)}"
    r="${r.toFixed(1)}" fill="var(--peca-fundo, ${CREME})" stroke="currentColor" stroke-width="9"/>`;
  }).join('\n');
  const miolo = `  <ellipse cx="${cx}" cy="${cy}" rx="${(rx * 0.86).toFixed(1)}" ry="${(ry * 0.84).toFixed(1)}"
    fill="var(--peca-fundo, ${CREME})"/>`;
  const rastro = [[cx - rx * 0.66, h - 78, 20], [cx - rx * 0.80, h - 40, 13], [cx - rx * 0.90, h - 14, 8]]
    .map(([x, y, r]) => `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"
    fill="var(--peca-fundo, ${CREME})" stroke="currentColor" stroke-width="8"/>`).join('\n');
  PECAS['balao-pensamento'] = svg(w, h, `${bolhas}\n${miolo}\n${rastro}`);
}

// ---------------------------------------------------------------- o BURST --------------------
// ELE NÃO É MAIS O CARIMBO DA MARCA (15/08/2026). A explosão das capas antigas ("NOVO!",
// "GRÁTIS!") resolvia o problema da estrela proibida e trazia outro: ela lê como banca de rua dos
// anos 60, e o Raphael reprovou olhando. O que sobrevive dele é o BALÃO DE GRITO, que é a mesma
// forma cumprindo uma função de quadrinho em vez de uma função de propaganda.
// As pontas têm comprimento irregular de propósito; burst de pontas iguais vira engrenagem.
const burst = (w, h, { pontas = 13, semente = 7, interno = 0.62 } = {}) => {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 10;
  const pts = [];
  for (let i = 0; i < pontas * 2; i++) {
    const a = (i / (pontas * 2)) * Math.PI * 2 - Math.PI / 2;
    const base = i % 2 ? interno : 1;
    const k = base * (1 + (rnd(semente + i * 4.7) - 0.5) * 0.16);
    pts.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]);
  }
  const d = 'M ' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ') + ' Z';
  return svg(w, h, tinta(d, { sw: 10 }));
};
PECAS['carimbo-burst'] = burst(420, 420);
PECAS['carimbo-burst-largo'] = burst(560, 420, { pontas: 15, semente: 31 });
PECAS['balao-grito'] = burst(460, 420, { pontas: 11, semente: 19, interno: 0.68 });

// ---------------------------------------------------------------- molduras -------------------
for (const [nome, w, h] of [['moldura-quadrada', 520, 520], ['moldura-larga', 760, 480],
                            ['moldura-alta', 460, 700]]) {
  PECAS[nome] = svg(w, h, tinta(suave(retTremido(16, 16, w - 32, h - 32, { semente: w })), { sw: 10 }));
}
// a rasgada tem tremor alto e passo curto: é a mesma função, outra calibragem
PECAS['moldura-rasgada'] = svg(760, 520,
  tinta(suave(retTremido(18, 18, 724, 484, { passo: 15, tremor: 9, semente: 77 })), { sw: 9 }));

// ---------------------------------------------------------------- tarjas ---------------------
{
  const w = 1200, h = 210, y = 30, hh = h - 60, rec = 46;
  // reta com as pontas em V (fita de banner)
  const reta = `M 0,${y} L ${w},${y} L ${w - rec},${y + hh / 2} L ${w},${y + hh}` +
               ` L 0,${y + hh} L ${rec},${y + hh / 2} Z`;
  PECAS['tarja-reta'] = svg(w, h, tinta(reta, { sw: 9 }));
  PECAS['tarja-rasgada'] = svg(w, h,
    tinta(suave(retTremido(10, y, w - 20, hh, { passo: 13, tremor: 8, semente: 91 })), { sw: 8 }));
  // flâmula: triangular, aponta pra direita
  PECAS['tarja-flamula'] = svg(w, h,
    tinta(`M 8,${y} L ${w - 8},${y + hh / 2} L 8,${y + hh} Z`, { sw: 9 }));
}

// ---------------------------------------------------------------- padrão gráfico -------------
// A MALHA DA REDE DE GOL, em losango, como padrão repetível. É o único elemento de futebol que
// não pertence a clube nenhum e que já estava na marca (o banner é "o nome dentro do gol"), mas
// só como desenho isolado. Como PATTERN ele forra story, faixa e fundo de destaque.
{
  const t = 120;   // lado do bloco que se repete
  PECAS['padrao-rede'] = svg(t, t,
`  <defs><pattern id="rede" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
    <path d="M 0,0 L ${t},${t} M ${t},0 L 0,${t}" stroke="currentColor" stroke-width="4"
      stroke-linecap="round" fill="none" opacity="0.45"/>
  </pattern></defs>
  <rect width="${t}" height="${t}" fill="url(#rede)"/>`);

  // a variante fechada, pra quando a rede precisa ler como rede e não como textura
  PECAS['padrao-rede-densa'] = svg(t, t,
`  <defs><pattern id="redeD" width="${t / 2}" height="${t / 2}" patternUnits="userSpaceOnUse">
    <path d="M 0,0 L ${t / 2},${t / 2} M ${t / 2},0 L 0,${t / 2}" stroke="currentColor"
      stroke-width="3" stroke-linecap="round" fill="none" opacity="0.55"/>
  </pattern></defs>
  <rect width="${t}" height="${t}" fill="url(#redeD)"/>`);
}

// AS ALTERNATIVAS (15/08/2026). A rede era o padrão único, e padrão único vira papel de parede:
// toda peça forrada igual. Cada um destes vem do mesmo lugar de onde a rede veio (o futebol que
// não pertence a clube nenhum, mais o material do gibi), e cada um tem um EMPREGO típico, escrito
// no manual. Todos são tiles que fecham na repetição e herdam a cor por `currentColor`.
{
  // BEN-DAY: o pontilhado da impressão barata de gibi. É o miolo de papel da marca, e o site já
  // usava a ideia no fundo da página; agora ela existe como peça, não como CSS de uma página só.
  const t = 56;
  PECAS['padrao-pontos'] = svg(t, t,
`  <circle cx="14" cy="14" r="5.5" fill="currentColor" opacity="0.4"/>
  <circle cx="42" cy="42" r="5.5" fill="currentColor" opacity="0.4"/>`);

  // GRAMA: tufos rabiscados, espalhados sem grade aparente (posições com ruído determinístico).
  // Cada tufo fica longe da borda de propósito: tufo cortado ao meio denuncia o tile.
  const g = 150;
  const tufo = (x, y, s) => {
    const k = 0.85 + rnd(s) * 0.4;
    return `  <path d="M ${x - 10 * k},${y} q 2,-${12 * k} 6,-${15 * k} M ${x},${y + 2} q 0,-${15 * k} 1,-${19 * k}
    M ${x + 9 * k},${y} q -2,-${11 * k} -6,-${15 * k}" stroke="currentColor" stroke-width="4"
    stroke-linecap="round" fill="none" opacity="0.5"/>`;
  };
  PECAS['padrao-grama'] = svg(g, g, [
    tufo(34, 40, 1), tufo(104, 28, 2), tufo(72, 82, 3), tufo(24, 118, 4), tufo(118, 116, 5),
  ].join('\n'));

  // HACHURA: o rabisco de lápis, a textura mais crua da casa. Traços curtos na mesma inclinação,
  // comprimento variando; serve de sombra e de fundo de bloco sem virar cinza chapado.
  const hh = 120;
  const risco = (x, y, s) => {
    const c = 16 + rnd(s) * 14;
    return `  <path d="M ${x},${y} l ${c},${-c * 0.55}" stroke="currentColor" stroke-width="3.6"
    stroke-linecap="round" opacity="0.42"/>`;
  };
  PECAS['padrao-hachura'] = svg(hh, hh, [
    risco(8, 30, 11), risco(56, 20, 12), risco(88, 44, 13), risco(26, 66, 14),
    risco(66, 82, 15), risco(12, 104, 16), risco(90, 106, 17), risco(46, 46, 18),
  ].join('\n'));

  // LISTRAS: o gramado cortado em faixas verticais, o mesmo fundo que o banner já usa. Discreto
  // de propósito: listra forte atrás de texto em pé é briga.
  const L = 160;
  PECAS['padrao-listras'] = svg(L, L,
`  <defs><pattern id="lst" width="${L / 2}" height="${L}" patternUnits="userSpaceOnUse">
    <rect width="${L / 4}" height="${L}" fill="currentColor" opacity="0.16"/>
  </pattern></defs>
  <rect width="${L}" height="${L}" fill="url(#lst)"/>`);

  // CAMPO: os quartos de círculo do escanteio, um em cada canto do tile. Na repetição eles se
  // encontram e viram círculos inteiros nos cruzamentos, com o ponto do pênalti no meio: a
  // marcação de campo vista de cima, abstraída até virar geometria.
  const c = 240, r = 46;
  PECAS['padrao-campo'] = svg(c, c,
`  <g stroke="currentColor" stroke-width="5" fill="none" opacity="0.5">
    <path d="M 0,${r} A ${r},${r} 0 0 0 ${r},0"/>
    <path d="M ${c - r},0 A ${r},${r} 0 0 0 ${c},${r}"/>
    <path d="M ${c},${c - r} A ${r},${r} 0 0 0 ${c - r},${c}"/>
    <path d="M ${r},${c} A ${r},${r} 0 0 0 0,${c - r}"/>
  </g>
  <circle cx="${c / 2}" cy="${c / 2}" r="7" fill="currentColor" opacity="0.5"/>`);
}

// ---------------------------------------------------------------- iconografia ---------------
// UM SET PRÓPRIO, e o critério de entrada é a regra da marca: só entra objeto que NÃO PERTENCE A
// CLUBE NENHUM. Bola, apito, cartão, cronômetro, rede, bandeirinha, chuteira, cone, gibi, banca.
// Antes disto os únicos ícones do sistema eram os das redes sociais, que são marcas de terceiros:
// a marca não tinha desenho próprio pro tamanho pequeno, onde ilustração não cabe.
//
// Todos em grade de 48, traço de 4, cantos redondos: o mesmo peso do contorno das peças grandes,
// pra que ícone e balão pareçam da mesma mão.
const ico = (corpo) => svg(48, 48,
`  <g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
${corpo}
  </g>`);

const ICONES = {
  bola: `    <circle cx="24" cy="24" r="18"/>
    <path d="M24 15 L30.5 19.7 L28 27.4 H20 L17.5 19.7 Z"/>
    <path d="M24 6.2 V15 M40.7 18.4 L30.5 19.7 M34.6 37.7 L28 27.4 M13.4 37.7 L20 27.4
    M7.3 18.4 L17.5 19.7" stroke-width="3"/>`,
  apito: `    <path d="M8 19 h18 a11 11 0 1 1 0 14 H8 a3 3 0 0 1 -3 -3 v-8 a3 3 0 0 1 3 -3 Z"/>
    <circle cx="35" cy="26" r="4"/>
    <circle cx="12" cy="23.5" r="2" fill="currentColor" stroke="none"/>`,
  cartao: `    <rect x="14" y="7" width="20" height="30" rx="3" transform="rotate(12 24 22)"/>`,
  cronometro: `    <circle cx="24" cy="27" r="15"/><path d="M24 27 V18 M24 27 l7 5"/>
    <path d="M19 6 h10 M24 6 v6 M37 12 l3 -3"/>`,
  rede: `    <path d="M7 40 V12 h34 v28"/><path d="M7 12 h34"/>
    <path d="M14 12 v28 M21 12 v28 M28 12 v28 M35 12 v28 M7 19 h34 M7 26 h34 M7 33 h34"
      stroke-width="2" opacity="0.75"/>`,
  bandeirinha: `    <path d="M14 42 V8"/><path d="M14 10 L36 16 L14 22 Z"/>`,
  chuteira: `    <path d="M5 32 h6 l4 -12 h9 l5 6 h10 a6 6 0 0 1 6 6 v4 H5 Z"/>
    <path d="M12 38 v4 M22 38 v4 M32 38 v4"/>`,
  cone: `    <path d="M24 7 L36 38 H12 Z"/><path d="M6 42 h36"/><path d="M18 24 h12"/>`,
  gibi: `    <path d="M24 13 C19 8 12 8 7 10 v27 c5 -2 12 -2 17 3 5 -5 12 -5 17 -3 V10 c-5 -2 -12 -2 -17 3 Z"/>
    <path d="M24 13 v30"/>`,
  banca: `    <path d="M9 21 h30 v20 H9 Z"/>
    <path d="M7 21 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0 q4 -7 8 0"/>
    <path d="M14 41 V28 h7 v13" stroke-width="3"/>
    <path d="M26 28 h9 v7 h-9 Z" stroke-width="3"/>`,
  balao: `    <path d="M8 10 h32 a3 3 0 0 1 3 3 v18 a3 3 0 0 1 -3 3 H22 l-8 7 v-7 H8 a3 3 0 0 1 -3 -3
    V13 a3 3 0 0 1 3 -3 Z"/>`,
  calendario: `    <rect x="6" y="11" width="36" height="31" rx="3"/><path d="M6 21 h36 M16 6 v9 M32 6 v9"/>
    <path d="M15 30 h6 M27 30 h6"/>`,
  // A CAMISA 12 é a terceira peça escolhida no leque de logotipo, e o lugar dela é AQUI: ela é
  // pictograma do mascote, não marca. Vira selo de conteúdo, destaque e ícone de lista.
  'camisa-12': `    <path d="M17 7 L24 11 L31 7 L41 13 L37 21 L33 19 V41 H15 V19 L11 21 L7 13 Z"/>
    <text x="24" y="35" text-anchor="middle" font-family="Oswald, sans-serif" font-size="15"
      font-weight="700" fill="currentColor" stroke="none">12</text>`,
};
for (const [nome, corpo] of Object.entries(ICONES)) PECAS[`icone-${nome}`] = ico(corpo);

await mkdir(SAIDA, { recursive: true });
for (const [nome, conteudo] of Object.entries(PECAS)) {
  await writeFile(path.join(SAIDA, `${nome}.svg`), conteudo);
}
console.log(`OK -> ${SAIDA}`);
for (const n of Object.keys(PECAS)) console.log(`  ${n}.svg`);
