// Recorta a FOLHA de peças (balões, molduras, tarjas) em assets individuais, e mede a ÁREA ÚTIL
// de cada uma.
//
// POR QUE ESTAS PEÇAS EXISTEM: balão de CSS é `border-radius` mais um triângulo, e sempre parece
// CSS. Balão de quadrinho tem contorno IRREGULAR, de traço trêmulo, e isso não se escreve em folha
// de estilo. A folha vem do mesmo modelo e do mesmo estilo do resto da marca.
//
// DUAS COISAS QUE A VERSÃO POR GRADE ERRAVA, e as duas só apareceram olhando a folha de prova:
//
//  1. RECORTE. Cortar a folha em células iguais assume que o modelo desenhou numa grade perfeita,
//     e ele nunca desenha. O corte encostava na peça vizinha e levava um pedaço dela junto; apertar
//     a folga pra fugir disso cortava a peça boa ao meio. Agora cada peça é achada por ROTULAGEM DE
//     COMPONENTES CONECTADOS: mancha contínua de tinta é uma peça, esteja onde estiver.
//
//  2. ÁREA ÚTIL. Um balão inteiro com uma frase curta no meio deixa um vazio enorme, porque o texto
//     era centrado no ARQUIVO e não no MIOLO, e num balão com rabicho os dois centros não coincidem.
//     Aqui o maior retângulo inscrito no miolo é medido e gravado em `pecas.json`, em proporção.
//     Quem usa a peça põe o texto nessa caixa, e aí o balão VESTE o texto.
//
//   node futgibi/marca/recortar-pecas.mjs [--folha=baloes]
import sharp from '../../saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREME, PRETO } from './tokens.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ILUS = path.join(AQUI, '_ilustracoes');
const SAIDA = path.join(AQUI, 'pecas');

const flag = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? p;

// Os nomes vão na ORDEM DE LEITURA (cima pra baixo, esquerda pra direita). É só isso que a folha
// precisa declarar: quantas peças esperar e como se chamam.
const FOLHAS = {
  baloes:   ['fala', 'fala-larga', 'grito', 'pensamento', 'cartucho', 'fala-curta'],
  molduras: ['quadrada', 'larga', 'alta', 'rasgada'],
  tarjas:   ['reta', 'fita', 'rasgada', 'dobrada', 'flamula'],
};

const CLARO = 200;       // acima disto o pixel é papel (fundo ou miolo)
const ESCURO = 120;      // abaixo disto é traço
const MIN_AREA = 0.004;  // mancha menor que isto do quadro é respingo, não peça

const alvo = flag('folha');
const lista = alvo ? { [alvo]: FOLHAS[alvo] } : FOLHAS;
if (alvo && !FOLHAS[alvo]) {
  console.error(`FAIL folha "${alvo}" não existe (tem: ${Object.keys(FOLHAS).join(', ')})`);
  process.exit(1);
}

await mkdir(SAIDA, { recursive: true });
const catalogo = {};

for (const [folha, nomes] of Object.entries(lista)) {
  const src = path.join(ILUS, `${folha}.png`);
  try { await sharp(src).metadata(); }
  catch { console.log(`pulando "${folha}": ainda não gerada`); continue; }

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const claro = (n) => {
    const p = n * C;
    return data[p] >= CLARO && data[p + 1] >= CLARO && data[p + 2] >= CLARO;
  };

  // ---- 1. inunda a partir das bordas: fundo é o claro que ENCOSTA na borda ----------------
  const fundo = new Uint8Array(W * H);
  const fila = new Int32Array(W * H);
  let ini = 0, fim = 0;
  const semearFundo = (n) => { if (!fundo[n] && claro(n)) { fundo[n] = 1; fila[fim++] = n; } };
  for (let x = 0; x < W; x++) { semearFundo(x); semearFundo((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { semearFundo(y * W); semearFundo(y * W + W - 1); }
  while (ini < fim) {
    const n = fila[ini++], x = n % W, y = (n / W) | 0;
    if (x > 0) semearFundo(n - 1);
    if (x < W - 1) semearFundo(n + 1);
    if (y > 0) semearFundo(n - W);
    if (y < H - 1) semearFundo(n + W);
  }

  // ---- 2. cada mancha de tinta contínua é uma PEÇA ----------------------------------------
  const rotulo = new Int32Array(W * H).fill(-1);
  const achadas = [];
  for (let s = 0; s < W * H; s++) {
    if (fundo[s] || rotulo[s] >= 0) continue;
    const id = achadas.length;
    let i2 = 0, f2 = 0, x0 = W, x1 = 0, y0 = H, y1 = 0, area = 0;
    rotulo[s] = id; fila[f2++] = s;
    while (i2 < f2) {
      const n = fila[i2++], x = n % W, y = (n / W) | 0;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const viz = [];
      if (x > 0) viz.push(n - 1);
      if (x < W - 1) viz.push(n + 1);
      if (y > 0) viz.push(n - W);
      if (y < H - 1) viz.push(n + W);
      for (const v of viz) if (!fundo[v] && rotulo[v] < 0) { rotulo[v] = id; fila[f2++] = v; }
    }
    achadas.push({ id, x0, x1, y0, y1, area });
  }

  // ordem de leitura: agrupa por faixa horizontal e ordena por x dentro da faixa
  const boas = achadas.filter((p) => p.area >= MIN_AREA * W * H)
    .sort((a, b) => {
      const mesmaFaixa = Math.abs(a.y0 - b.y0) < Math.min(a.y1 - a.y0, b.y1 - b.y0) * 0.6;
      return mesmaFaixa ? a.x0 - b.x0 : a.y0 - b.y0;
    });
  const aviso = boas.length !== nomes.length ? `   ATENÇÃO: esperava ${nomes.length}` : '';
  console.log(`\n${folha}: ${boas.length} peça(s) de ${achadas.length} mancha(s)${aviso}`);

  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const [cr, cg, cb] = hex(CREME), [pr, pg, pb] = hex(PRETO);

  for (const [i, p] of boas.entries()) {
    const nome = nomes[i] || `extra-${i}`;
    const w = p.x1 - p.x0 + 1, h = p.y1 - p.y0 + 1;

    // ---- 3. pinta só ESTA peça, na paleta da marca, e apaga tudo que não é ela ------------
    const buf = Buffer.alloc(w * h * 4);
    const miolo = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = (p.y0 + y) * W + (p.x0 + x), d = (y * w + x) * 4;
        if (rotulo[n] !== p.id) { buf[d + 3] = 0; continue; }
        const q = n * C, luz = (data[q] + data[q + 1] + data[q + 2]) / 3;
        buf[d + 3] = 255;
        if (luz >= CLARO) { buf[d] = cr; buf[d + 1] = cg; buf[d + 2] = cb; miolo[y * w + x] = 1; }
        else if (luz <= ESCURO) { buf[d] = pr; buf[d + 1] = pg; buf[d + 2] = pb; }
        else { buf[d] = data[q]; buf[d + 1] = data[q + 1]; buf[d + 2] = data[q + 2]; }
      }
    }
    await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
      .png().toFile(path.join(SAIDA, `${folha}-${nome}.png`));

    // ---- 4. o maior retângulo inscrito no MIOLO: é onde o texto cabe ----------------------
    // "Largest rectangle in histogram" aplicado linha a linha sobre a máscara do miolo.
    const alt = new Int32Array(w);
    let melhor = { area: 0, x: 0, y: 0, w: 0, h: 0 };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) alt[x] = miolo[y * w + x] ? alt[x] + 1 : 0;
      const pilha = [];
      for (let x = 0; x <= w; x++) {
        const cur = x === w ? 0 : alt[x];
        while (pilha.length && alt[pilha[pilha.length - 1]] >= cur) {
          const topo = pilha.pop();
          const altura = alt[topo];
          const esq = pilha.length ? pilha[pilha.length - 1] + 1 : 0;
          const area = altura * (x - esq);
          if (area > melhor.area) melhor = { area, x: esq, y: y - altura + 1, w: x - esq, h: altura };
        }
        pilha.push(x);
      }
    }
    catalogo[`${folha}-${nome}`] = {
      w, h,
      // em PROPORÇÃO, pra sobreviver a qualquer redimensionamento
      util: {
        x: +(melhor.x / w).toFixed(4), y: +(melhor.y / h).toFixed(4),
        w: +(melhor.w / w).toFixed(4), h: +(melhor.h / h).toFixed(4),
      },
    };
    console.log(`  ${nome.padEnd(12)} ${String(w).padStart(4)}x${String(h).padStart(4)}` +
      `   útil ${(melhor.w / w * 100).toFixed(0)}%x${(melhor.h / h * 100).toFixed(0)}%` +
      ` em (${(melhor.x / w * 100).toFixed(0)}%,${(melhor.y / h * 100).toFixed(0)}%)`);
  }
}

// O catálogo é o que faz a peça ser USÁVEL: sem a área útil, quem compõe chuta o padding e o texto
// boia no meio do desenho.
const cat = path.join(SAIDA, 'pecas.json');
await writeFile(cat, JSON.stringify(catalogo, null, 2) + '\n');
console.log(`\nOK -> ${cat} (${Object.keys(catalogo).length} peças com área útil medida)`);
