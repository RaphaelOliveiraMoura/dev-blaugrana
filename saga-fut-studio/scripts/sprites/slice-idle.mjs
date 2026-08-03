// slice-idle.mjs <slug> [destinoDir] — fatia a folha 2x2 de IDLE em personagens/<slug>/rigs/idle/_sheet.png,
// tira magenta e normaliza -> i1..i4.png (+ cópia como <slug>-iN.png em destinoDir).
//
// POR QUE NÃO USA O placeOnCanvas DO slice-walk: aquele normaliza CADA quadro pra CHAR_H, ou seja
// escala todo mundo pra a MESMA altura. Num walk isso é ótimo (a altura é constante por design), mas
// no idle a animação É a variação de altura — ombros e peito subindo poucos pixels. Normalizando
// quadro a quadro, a respiração é exatamente o que seria apagado, e o ciclo sairia MORTO sem dar
// nenhum erro. Aqui a escala é ÚNICA (tirada do quadro mais alto) e cada quadro é ancorado pelos
// PÉS, então a diferença de altura sobrevive e o jitter horizontal não.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, SHEET_INSET, keyMagenta, placeSerieOnCanvas } from './config.mjs';
import { cartaoIdle } from './sprite-card.mjs';

const [, , SLUG, DEST] = process.argv;
if (!SLUG) { console.error('uso: node slice-idle.mjs <slug> [destinoDir]'); process.exit(1); }
const BASE = path.join(CONTEUDO, `personagens/${SLUG}/rigs/idle`);
await mkdir(BASE, { recursive: true });
const sheet = `${BASE}/_sheet.png`;
const meta = await sharp(sheet).metadata();
const HW = Math.floor(meta.width / 2), HH = Math.floor(meta.height / 2), I = SHEET_INSET;
const cells = [[I, I], [HW + I, I], [I, HH + I], [HW + I, HH + I]];

// passe 1: keya as 4 células e guarda bbox/pés (sem escalar nada ainda)
const quadros = [];
for (let i = 0; i < 4; i++) {
  const [l, t] = cells[i], cw = HW - I * 2, ch = HH - I * 2;
  const { data, info } = await sharp(sheet).extract({ left: l, top: t, width: cw, height: ch }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bbox = keyMagenta(data, info.width, info.height);
  quadros.push({ data, info, bbox });
}

// escala ÚNICA pros 4 quadros (mesma regra das folhas de ação): ver placeSerieOnCanvas no config
const { pngs, escala } = await placeSerieOnCanvas(quadros.map((q) => ({ data: q.data, W: q.info.width, H: q.info.height, bbox: q.bbox })));
const alturas = [];
for (let i = 0; i < 4; i++) {
  await writeFile(`${BASE}/i${i + 1}.png`, pngs[i]);
  if (DEST) {
    await mkdir(path.resolve(DEST), { recursive: true });
    await writeFile(path.join(path.resolve(DEST), `${SLUG}-i${i + 1}.png`), pngs[i]);
  }
  const b = quadros[i].bbox;
  alturas.push(Math.round((b.maxY - b.minY + 1) * escala));
  console.log(SLUG, 'i' + (i + 1), `${b.maxX - b.minX + 1}x${b.maxY - b.minY + 1} -> alt ${alturas[i]}`);
}

// ============================================================================
// O CICLO ANIMA MESMO? O defeito clássico desta folha é o modelo desenhar as 4 células idênticas.
// Medir só a ALTURA não basta: um idle pode animar pela PISCADA e por variação interna de ombro
// sem a bbox mudar de tamanho — foi o que aconteceu na primeira folha de verdade, e um aviso só de
// altura mandaria regerar uma folha boa (2 minutos e uma cota de geração jogados fora). Então mede
// as duas coisas, e só reclama quando NENHUMA das duas se move.
// ============================================================================
const amp = Math.max(...alturas) - Math.min(...alturas);
// fração de pixels que muda entre quadros consecutivos (comparação nos PNGs já normalizados)
const bufs = [];
for (let i = 0; i < 4; i++) bufs.push(await sharp(`${BASE}/i${i + 1}.png`).ensureAlpha().raw().toBuffer());
let maiorMudanca = 0;
for (let i = 0; i < 4; i++) {
  const a = bufs[i], b = bufs[(i + 1) % 4];
  let dif = 0, corpo = 0;
  for (let p = 0; p < a.length; p += 4) {
    const opaco = a[p + 3] > 40 || b[p + 3] > 40;
    if (!opaco) continue;
    corpo++;
    const d = Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]) + Math.abs(a[p + 3] - b[p + 3]);
    if (d > 60) dif++;
  }
  if (corpo) maiorMudanca = Math.max(maiorMudanca, dif / corpo);
}
const pctMud = (maiorMudanca * 100).toFixed(1);
console.log(`movimento: altura varia ${amp}px (${alturas.join('/')}) · pixels mudam ${pctMud}% entre quadros`);
if (amp < 2 && maiorMudanca < 0.01) {
  console.warn('[slice-idle] ⚠️  as 4 células saíram praticamente IGUAIS (altura parada e <1% de pixel mudando): o idle vai ficar PARADO na tela. Regere a folha.');
} else if (amp < 2) {
  console.log('  (altura parada, mas há movimento interno — piscada/ombro. Confira o _card.png; costuma ler bem.)');
}
// o cartão não pode DERRUBAR o fatiamento, mas falhar CALADO foi o que o escondeu por meses
const card = await cartaoIdle(SLUG).catch((e) => { console.warn(`aviso: cartão de idle falhou (${e.message})`); return null; });
console.log('OK', SLUG, card ? '· cartão: ' + BASE.replace(CONTEUDO + '/', '') + '/_card.png' : '', DEST ? `· copiado pra ${DEST}` : '');
