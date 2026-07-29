// check-sprite.mjs <sprite.png> [outro.png ...] — valida sprites normalizados contra o config.
// Pega automaticamente os bugs recorrentes ANTES do render: canvas errado, corpo cortado na
// borda, tamanho fora do padrão, pés fora do chão, fantasma (creme mal keyado) e resíduo de
// magenta. NÃO checa orientação do olhar (isso continua no checklist humano + flop-sprite).
// Sai com código !=0 se algum arquivo tiver FAIL. Uso típico: node check-sprite.mjs rigs/andar/x/w*.png
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import {
  CANVAS_W, CANVAS_H, FEET_Y, CHAR_H, WIDTH_MARGIN, SIZE_TOL, EDGE_MARGIN, GHOST_ALPHA,
} from './config.mjs';

const files = process.argv.slice(2);
if (!files.length) { console.error('uso: node check-sprite.mjs <sprite.png> [outro.png ...]'); process.exit(2); }

let anyFail = false;

for (const f of files) {
  const problemas = []; // {nivel:'FAIL'|'WARN', msg}
  const add = (nivel, msg) => problemas.push({ nivel, msg });
  try {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;

    if (W !== CANVAS_W || H !== CANVAS_H) add('FAIL', `canvas ${W}x${H} != ${CANVAS_W}x${CANVAS_H}`);

    // bbox do corpo + estatísticas de alpha / magenta residual
    let minX = W, minY = H, maxX = 0, maxY = 0, nBody = 0, alphaSum = 0, nMag = 0;
    for (let p = 0; p < W * H; p++) {
      const i = p * 4, a = data[i + 3];
      if (a > 10) {
        const x = p % W, y = (p / W) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        nBody++; alphaSum += a;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 120 && b > 120 && g < 140 && Math.min(r, b) - g > 40) nMag++;
      }
    }
    if (!nBody) { add('FAIL', 'sprite vazio (100% transparente)'); }
    else {
      const bw = maxX - minX + 1, bh = maxY - minY + 1;

      // rente à borda: nossos slicers nunca cortam o corpo (encaixam inteiro), então isto é
      // WARN, não FAIL — pega o bug do corte na FOLHA (célula cortou a arte antes de normalizar)
      // sem reprovar poses largas legítimas (corrida) que ficam flush por design.
      if (minX <= EDGE_MARGIN) add('WARN', 'corpo rente à borda ESQUERDA (conferir corte na folha)');
      if (maxX >= W - 1 - EDGE_MARGIN) add('WARN', 'corpo rente à borda DIREITA (conferir corte na folha)');
      if (minY <= EDGE_MARGIN) add('WARN', 'topo rente à borda SUPERIOR (conferir corte na folha)');

      // tamanho vs CHAR_H — pequeno demais só é problema se NÃO estiver limitado por largura
      const clampedByWidth = bw >= (CANVAS_W - WIDTH_MARGIN) * (1 - 0.03);
      if (bh > CHAR_H * (1 + SIZE_TOL)) add('FAIL', `alto demais (${bh}px vs CHAR_H ${CHAR_H})`);
      else if (bh < CHAR_H * (1 - SIZE_TOL) && !clampedByWidth) add('WARN', `pequeno (${bh}px vs CHAR_H ${CHAR_H})`);

      // pés na linha do chão
      if (Math.abs(maxY - FEET_Y) > 10) add('WARN', `pés em y=${maxY}, esperado ~${FEET_Y}`);

      // fantasma / creme mal keyado (corpo semi-transparente no geral)
      const meanA = alphaSum / nBody;
      if (meanA < GHOST_ALPHA) add('WARN', `corpo semi-transparente (alpha médio ${meanA.toFixed(0)}) — fantasma/creme?`);

      // resíduo de magenta que escapou do chroma
      const magPct = (nMag / nBody) * 100;
      if (magPct > 0.2) add('WARN', `resíduo de magenta ${magPct.toFixed(1)}% do corpo`);

      // OLHO/KIT VAZADO (bug recorrente do cream-key comendo o branco): buraco de transparência
      // CERCADO pelo corpo. Flood-fill do fundo a partir das bordas; toda transparência NÃO
      // alcançada é buraco interno. Buraco na FAIXA DA CABEÇA (topo 42% do corpo) = olhos vazados
      // → FAIL (regenerar em MAGENTA). Vãos legítimos (entre pernas/braço-corpo) tocam o fundo.
      const outside = new Uint8Array(W * H);
      const stack = [];
      const seed = (p) => { if (!outside[p] && data[p * 4 + 3] <= 10) { outside[p] = 1; stack.push(p); } };
      for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
      while (stack.length) {
        const p = stack.pop(), x = p % W, y = (p / W) | 0;
        if (x > 0) seed(p - 1); if (x < W - 1) seed(p + 1); if (y > 0) seed(p - W); if (y < H - 1) seed(p + W);
      }
      const headBot = minY + Math.round(bh * 0.42);
      let holeHead = 0, holeTot = 0;
      for (let p = 0; p < W * H; p++) {
        if (data[p * 4 + 3] <= 10 && !outside[p]) { holeTot++; if (((p / W) | 0) <= headBot) holeHead++; }
      }
      // olhos vazados de verdade (cream-key) dão buracos GRANDES (~1000-2900px); punhos/mãos/braços
      // erguidos em poses de festa criam buraquinhos fechados (<150px) que NÃO são vazamento — por isso
      // o threshold é alto (só reprova buraco realmente grande na cabeça).
      if (holeHead > 400) add('FAIL', `buraco interno na cabeça (${holeHead}px) — olhos vazados? gere a pose em MAGENTA (cream-key come o branco)`);
      else if (holeHead > 120 || holeTot > 400) add('WARN', `buraco interno (cabeça ${holeHead}px / total ${holeTot}px) — conferir olhos/kit`);
    }
  } catch (e) { add('FAIL', `erro ao ler: ${e.message}`); }

  const fails = problemas.filter((p) => p.nivel === 'FAIL');
  const status = fails.length ? 'FAIL' : (problemas.length ? 'WARN' : 'OK  ');
  if (fails.length) anyFail = true;
  const nome = path.relative(process.cwd(), f);
  console.log(`${status} ${nome}${problemas.length ? '  ' + problemas.map((p) => `[${p.nivel}] ${p.msg}`).join('; ') : ''}`);
}

process.exit(anyFail ? 1 : 0);
