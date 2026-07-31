// slice-acao.mjs <slug> <nome> [destinoDir] [classe] — fatia a folha de AÇÃO em
// personagens/<slug>/acoes/<nome>/_sheet.png, tira magenta e normaliza os quadros com UMA ESCALA SÓ
// (placeSerieOnCanvas) -> <nome>1..N.png.
// Com destinoDir, copia também pra lá (ex.: videos/<id>/kf) como <slug>-<nome>N.png.
//
// O GRID vem da CLASSE (contratos.mjs): secundaria 2x2 (4), primaria 3x3 (9), complexa 4x4 (16).
// Era 2x2 fixo, o que impedia o pipeline de usar as folhas densas.
//
// A ESCALA ÚNICA é o ponto: normalizando quadro a quadro (como o slice-pose faz, e como esta
// ferramenta fazia), uma pose mais LARGA que alta passa a encaixar pela largura, cada quadro ganha
// uma escala diferente e o personagem CRESCE E ENCOLHE durante o gesto. Apareceu numa folha de
// "sentado com dor": alturas 521/492/463/422 num gesto que não muda de tamanho. Ver config.mjs.
//
// ALTURA DO SOLO (classe primária): `placeSerieOnCanvas` crava os pés em FEET_Y em TODO quadro, o
// que é certo pra andar/parar e ERRADO pra pulo — no pico do salto o sprite voltava pro chão e o
// ciclo de 9 quadros perdia justamente o que ele tem de diferente. Numa folha primária, a subida
// medida dentro da célula é preservada (o quadro mais baixo define o chão).
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, SHEET_INSET, keyMagenta, placeSerieOnCanvas, larguraCabeca, feetCenter, CANVAS_W, CANVAS_H, CHAR_H, FEET_Y, WIDTH_MARGIN } from './config.mjs';
import { gridDaClasse } from './contratos.mjs';
import { gestoPara } from './gestos.mjs';

const [, , SLUG, NOME, DEST, CLASSE = 'secundaria'] = process.argv;
if (!SLUG || !NOME) { console.error('uso: node slice-acao.mjs <slug> <nome> [destinoDir] [classe]'); process.exit(1); }
const { grid, celulas } = gridDaClasse(CLASSE);
const [GC, GR] = grid;

const BASE = path.join(CONTEUDO, `personagens/${SLUG}/acoes/${NOME}`);
await mkdir(BASE, { recursive: true });
const sheet = `${BASE}/_sheet.png`;
const meta = await sharp(sheet).metadata();
const CW = Math.floor(meta.width / GC), CH = Math.floor(meta.height / GR), I = SHEET_INSET;

const quadros = [];
for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) {
  const l = c * CW + I, t = r * CH + I, cw = CW - I * 2, ch = CH - I * 2;
  const { data, info } = await sharp(sheet).extract({ left: l, top: t, width: cw, height: ch }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bbox = keyMagenta(data, info.width, info.height);
  quadros.push({ data, W: info.width, H: info.height, bbox });
}
if (quadros.length !== celulas) { console.error(`FAIL classe ${CLASSE} espera ${celulas} células, li ${quadros.length}`); process.exit(1); }

// --- normalização: escala única sempre; altura do solo preservada só na classe primária ---
const PRESERVA_ALTURA = CLASSE === 'primaria';
let pngs, escala, alturasDoSolo = [];
if (!PRESERVA_ALTURA) {
  ({ pngs, escala } = await placeSerieOnCanvas(quadros));
} else {
  escala = Math.min(...quadros.map(({ bbox }) => {
    const bw = bbox.maxX - bbox.minX + 1, bh = bbox.maxY - bbox.minY + 1;
    return Math.min(CHAR_H / bh, (CANVAS_W - WIDTH_MARGIN) / bw);
  }));
  const chao = Math.max(...quadros.map((q) => q.bbox.maxY));   // quadro mais baixo = pés no chão
  pngs = [];
  for (const { data, W, H, bbox } of quadros) {
    const bw = bbox.maxX - bbox.minX + 1, bh = bbox.maxY - bbox.minY + 1;
    const nw = Math.max(1, Math.round(bw * escala)), nh = Math.max(1, Math.round(bh * escala));
    const feetCx = feetCenter(data, W, bbox);
    const trimmed = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: bbox.minX, top: bbox.minY, width: bw, height: bh })
      .resize({ width: nw, height: nh }).png().toBuffer();
    let left = Math.round(CANVAS_W / 2 - (feetCx - bbox.minX) * escala);
    left = Math.max(0, Math.min(CANVAS_W - nw, left));
    const doSolo = Math.round((chao - bbox.maxY) * escala);    // 0 = no chão, >0 = no ar
    alturasDoSolo.push(doSolo);
    const top = Math.max(0, Math.round(FEET_Y - nh - doSolo));
    pngs.push(await sharp({ create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: trimmed, left, top }]).png().toBuffer());
  }
}

const alturas = [];
for (let i = 0; i < celulas; i++) {
  await writeFile(`${BASE}/${NOME}${i + 1}.png`, pngs[i]);
  if (DEST) {
    await mkdir(path.resolve(DEST), { recursive: true });
    await writeFile(path.join(path.resolve(DEST), `${SLUG}-${NOME}${i + 1}.png`), pngs[i]);
  }
  const b = quadros[i].bbox;
  alturas.push(Math.round((b.maxY - b.minY + 1) * escala));
}
console.log(`${SLUG} ${NOME}: ${celulas} quadros (classe ${CLASSE}, grid ${GC}x${GR}) · alturas ${alturas.join('/')}`);
if (PRESERVA_ALTURA) console.log(`   altura do solo por quadro: ${alturasDoSolo.join(' ')} px (0 = pé no chão) — salto PRESERVADO`);

// _meta.json — A ALTURA DE CADA QUADRO, PRA O MOVIMENTO POR CÓDIGO SEGUIR A ARTE.
//
// Sem isso, quem quisesse tirar o personagem do chão tinha que chutar um arco no roteiro ("sobe de
// 30% a 72% do beat"), e o arco NUNCA batia com o desenho: o ciclo de 9 quadros roda N vezes dentro
// do beat enquanto o arco acontecia uma vez só, então o sprite aterrissava enquanto o código ainda
// subia. Aqui sai a curva medida NA PRÓPRIA FOLHA, normalizada (0 = quadro mais baixo, 1 = ápice).
// O composer multiplica isso pela altura desejada e o salto fica sincronizado por construção.
//
// A FOLHA DE EXPOSIÇÃO (`tempos`/`chao`) vem junto, copiada do vocabulário de gestos: é a
// cronometragem do gesto (quem SEGURA, quem passa voando) e quais desenhos têm o pé no chão. Viaja
// no _meta.json em vez de ficar só no catálogo porque quem consome é o composer (server/), e o
// tempo do gesto é propriedade DO ASSET — quem tem a folha tem a cronometragem dela.
const pico = Math.max(...alturasDoSolo, 0);
let doCatalogo = {};
try { const g = gestoPara(NOME, CLASSE); doCatalogo = { tempos: g.tempos, chao: g.chao, contato: g.contato, contatoPe: g.contatoPe, horizontal: g.horizontal, loop: g.loop, fim: g.fim }; }
catch { /* gesto fora do catálogo (fases escritas à mão): segue com exposição uniforme */ }
await writeFile(`${BASE}/_meta.json`, JSON.stringify({
  slug: SLUG, nome: NOME, classe: CLASSE, quadros: celulas,
  canvasW: CANVAS_W,        // pra o composer converter altura de sprite em px de tela (w / canvasW)
  alturaDoSoloPx: alturasDoSolo,
  curvaAltura: pico > 0 ? alturasDoSolo.map((h) => +(h / pico).toFixed(3)) : alturasDoSolo.map(() => 0),
  tempos: doCatalogo.tempos || null,   // frames de tela por desenho (null = uniforme pelo hz)
  chao: doCatalogo.chao || null,       // pé no chão por desenho (null = sem janela de voo)
  contato: doCatalogo.contato || null,       // desenhos em que algo BATE (tremor + squash)
  contatoPe: doCatalogo.contatoPe || null,   // subconjunto em que a batida é no chão (+ poeira)
  horizontal: doCatalogo.horizontal || false, // corpo sai da vertical: régua da cabeça não vale
  // `loop` FICA NULO pra folha fora do catálogo: null = "não declarado", e o composer mantém o
  // comportamento antigo (repetir). Gravar `false` aqui faria toda folha legada parar de repetir
  // silenciosamente no próximo render.
  loop: doCatalogo.tempos !== undefined || doCatalogo.loop !== undefined ? !!doCatalogo.loop : null,
  fim: doCatalogo.fim || null,               // 'segura' (congela no último) | 'volta' (ao primeiro)
  cabecaVariaPct: null,   // preenchido abaixo, depois da medição
}, null, 2) + '\n');
if (doCatalogo.tempos) console.log(`   exposição: ${doCatalogo.tempos.join('/')} frames por desenho${doCatalogo.chao ? ` · voo nos desenhos ${doCatalogo.chao.map((c, i) => (c ? null : i + 1)).filter(Boolean).join(',')}` : ''}`);
else {
  // GESTO NOVO SEM CRONOMETRAGEM. Exposição uniforme (todo desenho o mesmo tempo) é o certo pra
  // respiração e ciclo de espera, e é EXATAMENTE o que faz um gesto amplo ler como flipbook
  // mecânico. Quem acabou de gerar a folha é quem sabe qual desenho deve SEGURAR, então o lembrete
  // vai aqui, na hora, e não num doc que ninguém abre depois.
  console.warn(`[slice-acao] ⚠️  "${NOME}" saiu SEM folha de exposição: os ${celulas} desenhos vão ficar o MESMO tempo na tela.`);
  console.warn(`             Num gesto amplo isso lê como flipbook. Declare em scripts/sprites/gestos.mjs:`);
  console.warn(`               tempos${celulas}: [...]  quantos frames cada desenho segura (antecipação e ápice SEGURAM)`);
  console.warn(`               chao${celulas}: [...]    quais desenhos têm o pé no chão (só se houver salto)`);
  console.warn(`               contato${celulas}: [...] em quais desenhos algo BATE (tremor + squash)`);
  console.warn(`               loop: true        só se o gesto REPETE (respirar, esperar); o default é uma vez`);
  console.warn(`             Depois refatie (sem custo de geração): node scripts/sprites/slice-acao.mjs ${SLUG} ${NOME} "" ${CLASSE}`);
}

// A variação que sobra é a do DESENHO. Muita variação num gesto que não deveria mudar de tamanho
// (acenar, apontar) quer dizer que o modelo redesenhou o corpo: liste mais coisa em `travado`.
const varia = Math.max(...alturas) - Math.min(...alturas);

// O TESTE QUE IMPORTA: a CABEÇA tem que ter o mesmo tamanho em todos os quadros. É o sinal de que o
// modelo animou UM desenho, em vez de fazer N ilustrações independentes. Referência medida no
// projeto: folha de CAMINHADA (que funciona) varia 1%; uma folha de comemoração ruim variou 22%, e
// na tela isso não lê como gesto, lê como o personagem pulsando de tamanho. A altura do corpo
// sozinha não denuncia (aquela folha variava só 7%), por isso a régua aqui é a cabeça. Num ciclo com
// AGACHAR/PULAR a altura muda de propósito, e a cabeça continua sendo a régua honesta.
const cabecas = [];
for (let i = 0; i < celulas; i++) {
  const { data, info } = await sharp(`${BASE}/${NOME}${i + 1}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let p = 0; p < info.width * info.height; p++) if (data[p * 4 + 3] > 40) {
    const x = p % info.width, y = (p / info.width) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  cabecas.push(larguraCabeca(data, info.width, { minX, minY, maxX, maxY }) || 0);
}
const medCab = cabecas.reduce((a, b) => a + b, 0) / celulas;
const pctCab = medCab ? Math.round(((Math.max(...cabecas) - Math.min(...cabecas)) / medCab) * 100) : 0;
console.log(`escala única ${escala.toFixed(3)} · altura varia ${varia}px · CABEÇA varia ${pctCab}% (${cabecas.join('/')})`);
// LIMITE POR CLASSE. Medições de 30/07/2026, mesmo personagem, mesmo pipeline:
//   2x2 gesto pequeno .......... 1.9%      4x4 com 4 ciclos pequenos .... 4.2%
//   3x3 com salto (2 gerações) .. 19% e 24%
// O que dispara a variação é a AMPLITUDE do gesto, não o número de células. E na classe primária a
// própria régua fica torta: a cabeça INCLINA no salto, então a largura dela muda de propósito.
// Por isso a primária tem faixa larga e o veredito final é o olho no preview; secundária e
// complexa (gestos contidos) continuam com o limite apertado, onde a régua é confiável.
const LIMITE_FAIL = PRESERVA_ALTURA ? 26 : 12;
const LIMITE_WARN = PRESERVA_ALTURA ? 12 : 8;
// GESTO HORIZONTAL: a régua mede a faixa 6-24% a partir do TOPO do desenho, o que é a cabeça só
// enquanto o personagem está EM PÉ. Num tombo, o topo do desenho passa a ser um braço levantado ou
// as pernas pro alto, e uma folha perfeita acusa 50% de variação. Aqui não existe número honesto
// disponível, então o número sai como INFORMAÇÃO e o veredito é o olho no preview. Marcado no
// catálogo (`horizontal: true`), nunca por flag na linha de comando — não é escapatória.
if (doCatalogo.horizontal) {
  console.log(`[slice-acao] gesto HORIZONTAL: régua da cabeça NÃO se aplica (mediu ${pctCab}%, seria FAIL acima de ${LIMITE_FAIL}%).`);
  console.log(`             O corpo sai da vertical, então a faixa medida deixa de ser a cabeça. CONFIRA no preview.`);
} else if (pctCab > LIMITE_FAIL) {
  console.error(`[slice-acao] FAIL cabeça variando ${pctCab}% entre os quadros (limite ${LIMITE_FAIL}% na classe ${CLASSE}): o modelo`);
  console.error(`             desenhou ${celulas} poses INDEPENDENTES, não ${celulas} quadros de uma animação. Na tela isso pulsa.`);
  console.error(`             Conserto: fases MENORES + "muda" dizendo a ÚNICA parte que se move.`);
  process.exit(1);
} else if (pctCab > LIMITE_WARN) {
  console.warn(`[slice-acao] ⚠️  cabeça variando ${pctCab}% (aceito até ${LIMITE_FAIL}% na classe ${CLASSE}, mas o normal é ~2%).`);
  console.warn(`             Num gesto AMPLO parte disso é a cabeça inclinando de propósito — CONFIRA no preview se pulsa.`);
} else if (varia > 60 && !PRESERVA_ALTURA) {
  console.warn(`[slice-acao] ⚠️  ${varia}px de variação de altura: se o gesto NÃO era pra mudar a altura do corpo, liste mais coisa em "travado".`);
}
console.log('OK', SLUG, NOME, DEST ? `· copiado pra ${DEST}` : '');
