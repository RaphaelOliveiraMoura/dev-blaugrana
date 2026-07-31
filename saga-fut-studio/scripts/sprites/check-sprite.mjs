// check-sprite.mjs <sprite.png> [outro.png ...] — valida sprites normalizados contra o config.
// Pega automaticamente os bugs recorrentes ANTES do render: canvas errado, corpo cortado na
// borda, tamanho fora do padrão, pés fora do chão, fantasma (creme mal keyado) e resíduo de
// magenta. NÃO checa orientação do olhar (isso continua no checklist humano + flop-sprite).
// Sai com código !=0 se algum arquivo tiver FAIL. Uso típico: node check-sprite.mjs personagens/<slug>/rigs/andar/w*.png
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { larguraCabeca,
  CANVAS_W, CANVAS_H, FEET_Y, CHAR_H, WIDTH_MARGIN, SIZE_TOL, EDGE_MARGIN, GHOST_ALPHA,
} from './config.mjs';

// o sprite veio de uma folha marcada como HORIZONTAL? (personagens/<slug>/acoes/<nome>/_meta.json)
const _horiz = new Map();
function ehHorizontal(f) {
  const dir = path.dirname(f);
  if (!_horiz.has(dir)) {
    let v = false;
    try { v = JSON.parse(readFileSync(path.join(dir, '_meta.json'), 'utf8')).horizontal === true; } catch { v = false; }
    _horiz.set(dir, v);
  }
  return _horiz.get(dir);
}

const files = process.argv.slice(2);
// largura da cabeça por personagem, pra comparar a ESCALA entre poses no fim (ver bloco final)
const cabecas = new Map();
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

      // régua de ESCALA: agrupa por personagem e guarda a largura da cabeça. A comparação acontece
      // no fim, entre todos os sprites recebidos.
      //
      // O DONO SAI DO CAMINHO (`personagens/<slug>/...`), não do nome do arquivo. O agrupamento era
      // por nome porque os sprites viviam no kf/ do vídeo, chamados `<slug>-w1.png`. Depois que o
      // acervo virou pasta por personagem, o arquivo passou a se chamar só `w1.png` — e o regex,
      // sem achar prefixo, usava o NOME INTEIRO como chave. Consequências, as duas silenciosas:
      // com UM personagem cada grupo ficava com 1 sprite e a checagem inteira virava no-op; com
      // VÁRIOS, o `w1` de um personagem era comparado com o `w1` do outro e reprovava por eles
      // terem cabeças de tamanhos diferentes, que é exatamente o que deviam ter.
      // folha HORIZONTAL (o corpo sai da vertical, ex.: cair): a régua mede a faixa logo abaixo do
      // TOPO do desenho, que só é a cabeça enquanto o personagem está em pé. Num tombo ela mede
      // pernas pro alto e reprova uma folha perfeita. Marcado no catálogo e gravado no _meta.json.
      const larg = ehHorizontal(f) ? null : larguraCabeca(data, W, { minX, minY, maxX, maxY });
      if (larg) {
        const base = path.basename(f).replace(/\.png$/, '');
        const noCaminho = f.split(path.sep).join('/').match(/personagens\/([^/]+)\//);
        const m = base.match(/^([a-z]+(?:-[a-z]+)*?)-(?:[a-z]+\d*|w\d|r\d|i\d)$/) || base.match(/^([a-z-]+?)-[^-]+$/);
        const slug = noCaminho ? noCaminho[1] : (m ? m[1] : base);
        if (!cabecas.has(slug)) cabecas.set(slug, []);
        cabecas.get(slug).push({ nome: base, larg });
      }

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
      // FAIXA DO ROSTO: olho vazado fica no MIOLO horizontal da cabeça. O vão fechado entre um braço
      // erguido e o tronco também é um buraco interno grande e alto, mas cai na LATERAL — e era
      // reprovado como se fosse olho comido, travando o gate numa sprite perfeita (a de beber água
      // com a garrafa erguida). Só conta como suspeita de olho o que está no meio.
      const faceL = minX + Math.round(bw * 0.30), faceR = minX + Math.round(bw * 0.70);
      let holeHead = 0, holeTot = 0, holeLateral = 0;
      for (let p = 0; p < W * H; p++) {
        if (data[p * 4 + 3] <= 10 && !outside[p]) {
          holeTot++;
          const x = p % W, y = (p / W) | 0;
          if (y <= headBot) { if (x >= faceL && x <= faceR) holeHead++; else holeLateral++; }
        }
      }
      if (holeLateral > 400 && holeHead <= 400) add('WARN', `vão fechado na lateral (${holeLateral}px) — normal em braço erguido/mão na cintura; confira se não é recorte`);
      // olhos vazados de verdade (cream-key) dão buracos GRANDES (~1000-2900px); punhos/mãos/braços
      // erguidos em poses de festa criam buraquinhos fechados (<150px) que NÃO são vazamento — por isso
      // o threshold é alto (só reprova buraco realmente grande na cabeça).
      // OLHO VAZADO TEM ASSINATURA: são DOIS buracos, de tamanho parecido, lado a lado e na MESMA
      // altura (os dois olhos). Qualquer outro buraco interno grande é vão de prop ou de membro — o
      // espaço entre uma garrafa erguida e o rosto, o miolo de um jato de água, o triângulo entre
      // braço e tronco. Tentei antes discriminar por "sobrou branco na cabeça?", e falha na pose de
      // olhos FECHADOS (não há esclera pra sobrar). O par simétrico é o que só o defeito produz.
      const vis = new Uint8Array(W * H), comps = [];
      for (let p0 = 0; p0 < W * H; p0++) {
        if (data[p0 * 4 + 3] > 10 || outside[p0] || vis[p0]) continue;
        const fila = [p0]; vis[p0] = 1;
        let n = 0, sx = 0, sy = 0;
        while (fila.length) {
          const r = fila.pop(), x = r % W, y = (r / W) | 0; n++; sx += x; sy += y;
          for (const t of [r - 1, r + 1, r - W, r + W]) if (t >= 0 && t < W * H && !vis[t] && data[t * 4 + 3] <= 10 && !outside[t]) { vis[t] = 1; fila.push(t); }
        }
        if (n > 60) comps.push({ n, cx: sx / n, cy: sy / n });
      }
      const naCabeca = comps.filter((c) => c.cy <= headBot).sort((a, b) => b.n - a.n);
      let parDeOlhos = false;
      for (let i = 0; i < naCabeca.length && !parDeOlhos; i++)
        for (let j = i + 1; j < naCabeca.length; j++) {
          const a = naCabeca[i], b = naCabeca[j];
          const tamParecido = Math.min(a.n, b.n) / Math.max(a.n, b.n) > 0.55;
          const mesmaAltura = Math.abs(a.cy - b.cy) < bh * 0.06;
          const ladoALado = Math.abs(a.cx - b.cx) > bw * 0.08 && Math.abs(a.cx - b.cx) < bw * 0.55;
          if (tamParecido && mesmaAltura && ladoALado) { parDeOlhos = true; break; }
        }
      if (parDeOlhos) add('FAIL', `dois buracos simétricos na cabeça — olhos vazados: gere a pose em MAGENTA (cream-key come o branco)`);
      else if (holeHead > 400) add('WARN', `buraco interno na cabeça (${holeHead}px), mas sem o par simétrico de olho vazado — provável vão de prop/braço, confira o sprite`);
      else if (holeHead > 120 || holeTot > 400) add('WARN', `buraco interno (cabeça ${holeHead}px / total ${holeTot}px) — conferir olhos/kit`);
    }
  } catch (e) { add('FAIL', `erro ao ler: ${e.message}`); }

  const fails = problemas.filter((p) => p.nivel === 'FAIL');
  const status = fails.length ? 'FAIL' : (problemas.length ? 'WARN' : 'OK  ');
  if (fails.length) anyFail = true;
  const nome = path.relative(process.cwd(), f);
  console.log(`${status} ${nome}${problemas.length ? '  ' + problemas.map((p) => `[${p.nivel}] ${p.msg}`).join('; ') : ''}`);
}

// ---------------------------------------------------------------------------
// ESCALA ENTRE POSES DO MESMO PERSONAGEM
//
// Cada sprite é normalizado pela SILHUETA, e silhueta muda com a pose: sentado/caído/agachado a
// bbox fica baixa e larga, e o personagem sai numa escala diferente do mesmo personagem em pé — na
// tela ele CRESCE E ENCOLHE ao trocar de pose. Nenhuma checagem por-arquivo pega isso, porque cada
// sprite isolado está perfeito; o defeito só existe na COMPARAÇÃO. Aqui a régua é a largura da
// CABEÇA, que não muda com a pose (ver larguraCabeca no config).
// o gate era `cabecas.size > 1` — pensado pra quando a chave era o nome do arquivo e ter mais de um
// grupo significava "chegou mais de um personagem". Com a chave certa (o dono), UM personagem é um
// grupo só, e a régua inteira era pulada justamente no caso mais comum. O que importa é ter 2+
// sprites DENTRO de um grupo, e isso o laço já confere.
if (cabecas.size) {
  console.log('');
  for (const [slug, itens] of cabecas) {
    if (itens.length < 2) continue;
    const vals = itens.map((i) => i.larg);
    const med = vals.slice().sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    // TOLERÂNCIA: era 0.22 e o resultado NÃO derrubava o gate (`anyFail = anyFail`, um no-op).
    // Na prática o validador media e deixava passar: o rodri-riso passou como "consistente" com a
    // cabeça indo de 186 a 247px, o que na tela é a cabeça inchando quando a pose troca. Agora
    // 8% reprova de verdade. A ressalva da heurística continua valendo (braço colado à cabeça
    // engana a medida), por isso a mensagem diz como conferir antes de sair regerando.
    const foraDoTom = itens.filter((i) => Math.abs(i.larg - med) / med > 0.08);
    if (foraDoTom.length) {
      anyFail = true;
      console.log(`FAIL escala de "${slug}": cabeça mediana ${med}px, mas ${foraDoTom.map((i) => `${i.nome}=${i.larg}px (${(Math.abs(i.larg - med) / med * 100).toFixed(0)}%)`).join(', ')}`);
      console.log(`     esse(s) sprite(s) aparecem maior/menor que o resto do personagem na tela. Confira no olho`);
      console.log(`     (braço colado à cabeça engana a medida); se for real, regere a folha com "muda" mais estrito.`);
    } else {
      console.log(`OK   escala de "${slug}": cabeça ${Math.min(...vals)}..${Math.max(...vals)}px em ${vals.length} sprites (consistente)`);
    }
  }
}

process.exit(anyFail ? 1 : 0);
