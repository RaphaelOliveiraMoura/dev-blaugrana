// O LOGOTIPO OFICIAL (15/08/2026). Escolhido pelo Raphael no leque, e são peças que DIVIDEM FUNÇÃO
// em vez de disputarem o mesmo lugar, que era o vício das quatro rodadas reprovadas: cada uma
// delas tentava ser a marca inteira sozinha.
//
//   WORDMARK  · o lettering. É A MARCA, e vai onde houver espaço horizontal.
//   SELO      · a capa de gibi quadrada, com o nome dentro. Avatar, favicon, carimbo, bloco fechado.
//   ASSINATURA· lettering + subtítulo, na horizontal.
//
// O SELO NU FOI APAGADO (16/08/2026), e a decisão é do Raphael: "o selo nu não faz sentido". Ele
// era o quadrado verde com o 12, e existia por um argumento de redução (abaixo de ~64px o nome
// vira mancha, então o que resta tem que ser FORMA). O argumento continua verdadeiro e o preço
// está declarado: no favicon de 32px o selo não se lê como palavra, se lê como bloco verde de
// moldura preta. Isso é reconhecimento por SILHUETA e cor, que é como favicon é lido de fato numa
// aba com quinze irmãos. O que não se sustentava era o outro lado da conta: uma marca com dois
// símbolos concorrentes, um com nome e outro sem, e cada peça escolhendo um.
//
// O DESENHO É O PNG DO CODEX, E FICA ASSIM. Houve uma tentativa de traçar os PNGs em vetor (um
// `vetorizar.mjs` que quantizava a cor e seguia as fronteiras) e o Raphael reprovou olhando: o
// traçado engrossa canto, come o miolo das curvas e devolve um desenho pior que o original. A
// lição vale além daqui: **vetorizar arte de modelo automaticamente não devolve o mesmo desenho,
// devolve uma imitação dele.** Melhor um PNG bom que um vetor ruim.
//
// O QUE O PNG CUSTA, declarado: ele não recolore sozinho. As variantes saem por REMAPEAMENTO DE
// COR pixel a pixel, que é exato porque a arte é chapada (poucas cores, sem gradiente), e o fundo
// branco vira transparente por inundação a partir das bordas. Nada disso redesenha nada: o traço
// que sai é exatamente o que o Codex fez.
//
//   node futgibi/marca/gerar-logo-oficial.mjs
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { CREME, PRETO, LARANJA, VERDE, VERDE_SOMBRA } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const FONTE = path.join(AQUI, '_logo-ia');
const SAIDA = path.join(AQUI, 'logo');
const SITE = path.join(AQUI, '../site/marca/logo');

const OSWALD = '"Oswald","Big Shoulders Display","Arial Narrow",Impact,sans-serif';
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// As cores que o modelo usou e o papel de cada uma. O Codex chega perto do valor da marca mas não
// crava, então este passo também NORMALIZA a paleta: recolorir e acertar o hex viram o mesmo ato.
const DE_PARA = [
  { alvo: hex(PRETO), papel: 'tinta' },
  { alvo: hex(CREME), papel: 'papel' },
  { alvo: hex(LARANJA), papel: 'acento' },
  { alvo: hex(VERDE), papel: 'marca' },
];

// AS VARIANTES SÃO POR PEÇA. Uma tabela global quebra o desenho: o lettering tem três camadas
// (miolo creme, contorno preto, sombra laranja), e trocar "creme por verde" no invertido apaga o
// miolo das letras contra o fundo. O que muda no invertido nunca é o miolo, é o que SEPARA a peça
// do fundo: no lettering a sombra escurece, no selo entra um aro creme.
const V_WORDMARK = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, marca: VERDE },
  mono:      { tinta: PRETO, papel: CREME, acento: PRETO,   marca: CREME },
  invertido: { tinta: PRETO, papel: CREME, acento: VERDE_SOMBRA, marca: VERDE },
};
const V_SELO = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, marca: VERDE, dentro: CREME },
  mono:      { tinta: PRETO, papel: CREME, acento: CREME,   marca: CREME, dentro: PRETO },
  invertido: { tinta: PRETO, papel: CREME, acento: LARANJA, marca: VERDE, dentro: CREME, aro: CREME },
};

// ---------------------------------------------------------------- fundo fora + recolorir -----
// O fundo é o CLARO QUE ENCOSTA NA BORDA, nunca "o claro em geral": limiar de brilho apagaria o
// creme de dentro das letras junto com o papel. É o mesmo método das peças e dos spots.
const preparar = async (arq, cores) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const claro = (n) => data[n * c] >= 232 && data[n * c + 1] >= 232 && data[n * c + 2] >= 232;
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
  for (let n = 0; n < w * h; n++) {
    if (fundo[n]) { data[n * c + 3] = 0; continue; }
    const rgb = [data[n * c], data[n * c + 1], data[n * c + 2]];
    let melhor = null, dm = Infinity;
    for (const m of DE_PARA) {
      const d = (rgb[0] - m.alvo[0]) ** 2 + (rgb[1] - m.alvo[1]) ** 2 + (rgb[2] - m.alvo[2]) ** 2;
      if (d < dm) { dm = d; melhor = m; }
    }
    const novo = hex(cores[melhor.papel]);
    data[n * c] = novo[0]; data[n * c + 1] = novo[1]; data[n * c + 2] = novo[2];
  }
  return sharp(data, { raw: { width: w, height: h, channels: c } })
    .trim({ threshold: 1 })            // apara a margem larga que o modelo deixa em volta
    .png().toBuffer();
};

await mkdir(SAIDA, { recursive: true });
const feitos = [];

// O SÍMBOLO É O PAINEL-BOLA LARANJA (escolhido em 17/08/2026, no funil de três rodadas: oito
// conceitos → três finalistas → doze variações de cor). O painel de quadrinho com a bola em
// velocidade dentro, no acabamento meio-tom, com o painel LARANJA: o Raphael escolheu a quente
// contra o meu voto na verde, e a leitura dele tem lógica de lockup também: o símbolo laranja
// ecoa a sombra do lettering, e o conjunto fica de UMA temperatura. No mono o painel vira preto
// com a bola creme (o laranja não tem par escuro que preserve o desenho).
const V_PAINEL = {
  cor:       { tinta: PRETO, papel: CREME, acento: LARANJA, marca: VERDE },
  mono:      { tinta: PRETO, papel: CREME, acento: PRETO,   marca: PRETO },
  invertido: { tinta: PRETO, papel: CREME, acento: LARANJA, marca: VERDE },
};

// ------------------------------------------------- 1. WORDMARK, 2. SÍMBOLO e 3. SELO ---------
for (const [peca, arq, variantes] of [
  ['wordmark', 'codex-completo-lettering.png', V_WORDMARK],
  ['simbolo-painel', '../_logo-final/painel-bola--laranja.png', V_PAINEL],
  ['simbolo', 'codex-completo-capa.png', V_SELO],
]) {
  for (const [v, c] of Object.entries(variantes)) {
    let png = await preparar(path.join(FONTE, arq), c);
    if (c.aro) {
      const m = await sharp(png).metadata();
      png = await sharp(png)
        .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([{ input: Buffer.from(
          `<svg width="${m.width + 16}" height="${m.height + 16}" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="${m.width + 10}" height="${m.height + 10}" fill="none"
              stroke="${c.aro}" stroke-width="6"/></svg>`), top: 0, left: 0 }])
        .png().toBuffer();
    }
    await writeFile(path.join(SAIDA, `${peca}-${v}.png`), png);
  }
  const m = await sharp(path.join(SAIDA, `${peca}-cor.png`)).metadata();
  feitos.push(`${peca} (${m.width}x${m.height}, o PNG do Codex recolorido)`);
}

// ---------------------------------------------------------------- 4. ASSINATURA --------------
// O SÍMBOLO VOLTOU pra ela em 16/08/2026, junto com a escolha da bola-balão. Ela tinha perdido o
// emblema quando o selo nu foi apagado, e por bom motivo: o selo tem o nome dentro, e nome ao
// lado do lettering sai escrito duas vezes. A bola-balão não escreve nada, então o lockup
// clássico (símbolo + lettering + subtítulo) volta a fechar.
{
  const H = 200, sub = 'FUTEBOL EM QUADRINHOS';
  for (const [v, c] of Object.entries(V_SELO)) {
    const letra = await sharp(path.join(SAIDA, `wordmark-${v}.png`))
      .resize({ height: H - 96 }).png().toBuffer();
    const lm = await sharp(letra).metadata();
    const simb = await sharp(path.join(SAIDA, `simbolo-painel-${v}.png`))
      .resize({ height: H - 58 }).png().toBuffer();
    const sm = await sharp(simb).metadata();
    // A largura sai do MAIOR entre lettering e subtítulo: medir só o lettering cortava o subtítulo
    // na borda, e nada acusava.
    const largSub = Math.round(sub.length * 21 * 0.62 + 21 * 5);
    const x0 = 40 + sm.width + 28;
    const W = x0 + Math.max(lm.width, largSub) + 40;
    // A INVERTIDA NÃO CARREGA UM RETÂNGULO VERDE. Ela levava, e o banner (que é grama com textura)
    // acabou usando a variante COR pra não estampar um bloco chapado no meio do campo: o subtítulo
    // saía preto sobre verde, 2.74 de contraste, reprovado até como texto grande. Fundo
    // transparente com tinta creme resolve os dois lados, e sobe pra 5.49.
    await sharp({ create: { width: W, height: H, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([
        { input: simb, left: 40, top: Math.round((H - (H - 58)) / 2) },
        { input: letra, left: x0, top: 26 },
        { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
          <text x="${x0}" y="${H - 30}" font-family='${OSWALD}' font-size="21"
            font-weight="700" letter-spacing="5"
            fill="${v === 'invertido' ? CREME : c.tinta}">${sub}</text></svg>`), top: 0, left: 0 },
      ]).png().toFile(path.join(SAIDA, `assinatura-${v}.png`));
  }
  feitos.push('assinatura (PNG composto: símbolo + lettering + subtítulo)');
}

// ---------------------------------------------------------------- 5. FAVICONS ----------------
// O PAINEL É O FAVICON SEM MOLDURA EXTRA: ele já é quadrado, fechado e laranja. A bola-balão
// precisava de um bloco verde por trás porque solta era preto e creme; o painel carrega a
// própria cor, então o desenho vai direto.
for (const t of [32, 180, 512]) {
  await sharp(path.join(SAIDA, 'simbolo-painel-cor.png'))
    .resize({ width: t, height: t, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(path.join(SITE, `favicon-${t}.png`));
}
feitos.push('favicon 32/180/512 (o painel-bola direto)');

console.log('OK -> logo/');
for (const f of feitos) console.log(`   ${f}`);
console.log('   publique com: node futgibi/marca/tokens.mjs');
