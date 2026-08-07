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
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

// QUADRO DE CLASSE ANTERIOR É LIXO QUE ANIMA. Refatiar o mesmo gesto numa classe MENOR (9 quadros
// -> 4) grava `<nome>1..4` por cima e deixa `<nome>5..9` intactos no disco. Ninguém reclama, e o
// estrago é silencioso: a grade do gesto é inferida CONTANDO os arquivos (4=2x2, 9=3x3, 16=4x4),
// então o motor passaria a ler nove quadros — quatro do gesto novo e cinco do antigo, emendados
// como se fossem uma animação só.
//
// Some com eles ANTES de fatiar, e declara quantos: apagar em silêncio é o outro jeito de errar.
{
  const sobra = (await readdir(BASE).catch(() => []))
    .filter((f) => new RegExp(`^${NOME}(\\d+)\\.png$`).test(f))
    .filter((f) => Number(f.match(/(\d+)\.png$/)[1]) > celulas);
  for (const f of sobra) await rm(path.join(BASE, f), { force: true });
  if (sobra.length) console.log(`   ${sobra.length} quadro(s) da classe anterior removidos (${sobra.sort().join(', ')}): a grade sai da CONTAGEM de arquivos`);
}

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

// --- normalização: escala única sempre; altura do solo preservada só quando o gesto VOA ---
//
// Era `classe === 'primaria'`, e isso estava errado. Preservar a altura desenhada existe pra UM
// caso: o gesto que tira o pé do chão (o salto da comemoração), onde apagar a subida mataria o que
// a folha tem de melhor. Num gesto primário SEM voo — chutar, empurrar, apontar — não existe altura
// pra preservar: o que sobra é o RUÍDO de o modelo ter desenhado o personagem mais alto ou mais
// baixo em cada célula, e isso vira o personagem FLUTUANDO na tela. Medido no chute do segurança:
// 26 pontos percentuais de deriva na linha dos pés, tudo ruído. Agora quem manda é a declaração do
// gesto (`chao`), não a classe.
let _gestoCat = null;
try { _gestoCat = gestoPara(NOME, CLASSE); } catch { /* gesto fora do catálogo */ }
const PRESERVA_ALTURA = CLASSE === 'primaria' && !!(_gestoCat?.chao);
if (CLASSE === 'primaria' && !PRESERVA_ALTURA) console.log('   pés CRAVADOS no chão (o gesto não declara voo em `chao`) — a deriva vertical do desenho é ruído');
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

// ENQUADRAMENTO DA FOLHA: o modelo tem que desenhar o personagem no MESMO lugar e do MESMO tamanho
// em todas as células, com folga até a borda. Nada media isso — a régua só olhava a cabeça e a
// altura do corpo — e por isso a folha de chute do segurança passou com o personagem ANDANDO pela
// célula (27 pontos percentuais de deriva no centro) e a perna estendida ENCOSTANDO na borda
// (0px de folga), que na tela é membro cortado. Aqui as três coisas viram número.
{
  const cw = quadros[0].W, ch = quadros[0].H;
  const centro = quadros.map((q) => ((q.bbox.minX + q.bbox.maxX) / 2) / cw * 100);
  const pes = quadros.map((q) => q.bbox.maxY / ch * 100);
  const amp = (v) => Math.round(Math.max(...v) - Math.min(...v));
  const folga = Math.min(...quadros.flatMap((q) => [q.bbox.minX, cw - 1 - q.bbox.maxX, q.bbox.minY]));
  const derivaX = amp(centro), derivaY = amp(pes);
  console.log(`enquadramento: deriva horizontal ${derivaX}% · deriva dos pés ${derivaY}% · folga mínima até a borda ${folga}px`);
  const queixas = [];
  if (derivaX > 12) queixas.push(`o personagem ANDA ${derivaX}% da célula entre os desenhos (limite 12%)`);
  if (!PRESERVA_ALTURA && derivaY > 12) queixas.push(`a linha dos PÉS varia ${derivaY}% da célula (limite 12%)`);
  if (folga <= 2) queixas.push(`o corpo ENCOSTA na borda da célula (folga ${folga}px) — membro cortado na tela`);
  if (queixas.length) {
    console.error(`[slice-acao] FAIL enquadramento: ${queixas.join('; ')}.`);
    console.error('             O gesto foi desenhado como N ilustrações soltas, não como N quadros no mesmo enquadramento.');
    console.error('             Conserto: regere a folha. Se o gesto for AMPLO (perna/braço estendido), o prompt já');
    console.error('             manda desenhar o personagem MENOR pra caber com folga — confira se a descrição das');
    console.error('             fases não está pedindo extensão além do que cabe na célula.');
    process.exit(1);
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
const doCatalogo = _gestoCat
  ? { tempos: _gestoCat.tempos, chao: _gestoCat.chao, contato: _gestoCat.contato, contatoPe: _gestoCat.contatoPe, horizontal: _gestoCat.horizontal, loop: _gestoCat.loop, fim: _gestoCat.fim, propEm: _gestoCat.propEm }
  : {};   // gesto fora do catálogo (fases escritas à mão): segue com exposição uniforme
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
// APERTO: quanto esta folha foi ENCOLHIDA pra caber na largura do canvas.
//
// O PROBLEMA QUE ISTO RESOLVE: a escala do canvas é UMA SÓ pra folha inteira e sai do quadro mais
// exigente — `min(CHAR_H/altura, larguraÚtil/largura)` em TODOS os quadros. Num gesto amplo, o
// quadro deitado (o carrinho) ou de perna esticada é largo demais, bate no teto de 468px, e a
// escala que ele impõe encolhe TAMBÉM os quadros em pé. Medido no torcedor-cule: a cabeça mede
// 247px no `idle` e 171px no `carrinho` — o mesmo personagem, 30% menor, e na tela ele ENCOLHE ao
// trocar de animação.
//
// A RÉGUA É A CABEÇA, não a altura do corpo. A cabeça não muda de tamanho com a pose; o corpo sim
// (agachado, inclinado, deitado). Medindo pelo corpo, o quadro 1 do carrinho — que é uma corrida
// inclinada, não uma pose ereta — dava 1,60x quando o certo era 1,44x, e o personagem saía GRANDE
// demais. É a mesma régua que o gate de escala do ciclo já usa, pelo mesmo motivo.
//
// A cabeça de referência sai do IDLE do personagem: é a folha em que ele está em pé, parado e
// inteiro. Sem idle, o aperto fica 1 (não mexe) — melhor não corrigir do que corrigir por chute.
let aperto = 1;
{
  const idle1 = path.join(CONTEUDO, `personagens/${SLUG}/rigs/idle/i1.png`);
  if (existsSync(idle1)) {
    const { data: dI, info: iI } = await sharp(idle1).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let mnX = 1e9, mnY = 1e9, mxX = -1, mxY = -1;
    for (let y = 0; y < iI.height; y++) for (let x = 0; x < iI.width; x++) {
      if (dI[(y * iI.width + x) * 4 + 3] > 10) { if (x < mnX) mnX = x; if (x > mxX) mxX = x; if (y < mnY) mnY = y; if (y > mxY) mxY = y; }
    }
    const cabIdle = larguraCabeca(dI, iI.width, { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY });
    // a MAIOR cabeça da folha é a medida no quadro em pé; nos quadros deitados a faixa medida não
    // é a cabeça de verdade (o corpo saiu da vertical), e por isso ela sai menor
    const cabFolha = Math.max(...cabecas);
    if (cabIdle > 0 && cabFolha > 0) aperto = +(cabIdle / cabFolha).toFixed(4);
  }
}
if (aperto > 1.03) {
  console.log(`   APERTO ${aperto.toFixed(2)}x: a largura do quadro mais amplo encolheu a folha ` +
    `(cabeça ${Math.max(...cabecas)}px contra ${Math.round(Math.max(...cabecas) * aperto)}px no idle). O motor compensa o w.`);
}

const medCab = cabecas.reduce((a, b) => a + b, 0) / celulas;
const pctCab = medCab ? Math.round(((Math.max(...cabecas) - Math.min(...cabecas)) / medCab) * 100) : 0;

await writeFile(`${BASE}/_meta.json`, JSON.stringify({
  slug: SLUG, nome: NOME, classe: CLASSE, quadros: celulas,
  canvasW: CANVAS_W,        // pra o composer converter altura de sprite em px de tela (w / canvasW)
  escala: +escala.toFixed(4),   // escala de desenho usada (px da folha original -> px do canvas)
  aperto,                        // fator que o motor aplica no `w` pra o personagem não encolher
  alturaDoSoloPx: alturasDoSolo,
  curvaAltura: pico > 0 ? alturasDoSolo.map((h) => +(h / pico).toFixed(3)) : alturasDoSolo.map(() => 0),
  tempos: doCatalogo.tempos || null,   // frames de tela por desenho (null = uniforme pelo hz)
  chao: doCatalogo.chao || null,       // pé no chão por desenho (null = sem janela de voo)
  contato: doCatalogo.contato || null,       // desenhos em que algo BATE (tremor + squash)
  contatoPe: doCatalogo.contatoPe || null,   // subconjunto em que a batida é no chão (+ poeira)
  horizontal: doCatalogo.horizontal || false, // corpo sai da vertical: régua da cabeça não vale
  // ONDE O PROP ENCONTRA A MÃO/PÉ, por quadro, em fração do canvas. É o que deixa a bola parar NA
  // luva do goleiro em vez de perto dela (ver gestos.mjs).
  propEm: doCatalogo.propEm || null,
  // `loop` FICA NULO pra folha fora do catálogo: null = "não declarado", e o composer mantém o
  // comportamento antigo (repetir). Gravar `false` aqui faria toda folha legada parar de repetir
  // silenciosamente no próximo render.
  loop: doCatalogo.tempos !== undefined || doCatalogo.loop !== undefined ? !!doCatalogo.loop : null,
  fim: doCatalogo.fim || null,               // 'segura' (congela no último) | 'volta' (ao primeiro)
  cabecaVariaPct: pctCab,   // variação da cabeça entre os quadros (a régua de 'pulsa?')
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
