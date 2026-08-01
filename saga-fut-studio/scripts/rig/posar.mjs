// posar.mjs — O MOTOR DE POSE: esqueleto + ângulos -> imagem.
//
// É aqui que "gesto vira dado". A pose é um objeto `{ osso: graus }` e mais nada: nenhum desenho
// novo, nenhuma geração. O que este arquivo faz é acumular as transformações da hierarquia (cada
// osso gira em torno do próprio pivô, dentro do referencial do pai) e emitir as peças na ordem de
// profundidade.
//
// POR QUE NÃO ANINHAR OS <g> DO SVG E DEIXAR O RENDERIZADOR ACUMULAR: a ordem de DESENHO não é a
// mesma da hierarquia. O braço de trás é filho do tronco mas tem que ser pintado ANTES dele, senão
// o volume do desenho chapado desaparece. Então a matriz é acumulada aqui e cada peça sai plana, na
// ordem de z.
import sharp from '/Users/raphaeloliveira/projects/dev-blaugrana/saga-fut-studio/node_modules/sharp/dist/index.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONTEUDO, CANVAS_W, CANVAS_H, FEET_Y, CHAR_H } from '../sprites/config.mjs';
import { OSSOS, PONTOS_TRONCO, PROPORCAO, ESPESSURA, SOBREPOR, metaBoneco } from '../../shared/boneco.mjs';

const rad = (g) => (g * Math.PI) / 180;

export async function carregarBoneco(slug) {
  const meta = JSON.parse(await readFile(path.join(CONTEUDO, metaBoneco(slug)), 'utf8'));
  const dataUri = {};
  const pecas = {};
  for (const [id, p] of Object.entries(meta.pecas)) {
    const buf = await readFile(path.join(CONTEUDO, p.arquivo));
    dataUri[id] = `data:image/png;base64,${buf.toString('base64')}`;
    // CADA PEÇA TEM A SUA ESCALA, tirada da proporção canônica. O gerador desenha as doze peças
    // preenchendo células iguais, então a perna nasce do tamanho da cabeça; reescalar aqui é o que
    // devolve o chibi de três cabeças sem depender de o modelo ter acertado tamanho relativo.
    const alvo = (PROPORCAO[id] || 0) * CHAR_H;
    const ky = alvo && p.h ? alvo / p.h : 1;
    const alvoW = (ESPESSURA[id] || 0) * CHAR_H;
    const kx = alvoW && p.w ? alvoW / p.w : ky;   // sem espessura declarada, mantém o aspecto
    pecas[id] = { ...p, kx, ky, w: p.w * kx, h: p.h * ky, pivo: [p.pivo[0] * kx, p.pivo[1] * ky], ponta: [p.ponta[0] * kx, p.ponta[1] * ky] };
  }
  // O TRONCO GIRA NO QUADRIL, não na base da peça: a peça desce até o meio da coxa, e um tronco que
  // gira pela coxa faz o personagem inteiro balançar a partir do joelho.
  if (pecas.tronco) pecas.tronco.pivo = [pecas.tronco.w * 0.5, pecas.tronco.h * PONTOS_TRONCO.quadrilFrente[1]];

  const bon = { ...meta, pecas, dataUri, escalaPadrao: 1 };
  // ALTURA DO QUADRIL: medida na pose de repouso, atravessando a cadeia real (com sobreposição de
  // junta e tudo). Derivar em vez de somar alturas evita o personagem afundar no chão sempre que
  // alguém mexer numa proporção.
  const g = resolver(bon, {}, { x: 0, y: 0 });
  const cn = pecas['canela-frente'];
  bon.alturaQuadril = cn ? g['canela-frente'].y + (cn.ponta[1] - cn.pivo[1]) : CHAR_H * 0.36;
  return bon;
}

// Ponto de encaixe de um filho, em coordenadas LOCais do pai (origem no pivô do pai).
function encaixe(bon, paiId, em) {
  const p = bon.pecas[paiId];
  if (em && PONTOS_TRONCO[em]) {
    const [fx, fy] = PONTOS_TRONCO[em];
    // X MEDIDO NO DESENHO quando existe (largura do corpo na altura da junta); a fração é o
    // fallback de folha antiga. `fx` vira a posição DENTRO dessa largura: 0 = borda de trás,
    // 1 = borda da frente, e um pouco pra dentro pro membro nascer sob o tecido.
    const b = p.bordas && (em.startsWith('ombro') ? p.bordas.ombro : em.startsWith('quadril') ? p.bordas.quadril : null);
    const x = b ? (b[0] + (b[1] - b[0]) * fx) * p.kx : fx * p.w;
    return [x - p.pivo[0], fy * p.h - p.pivo[1]];
  }
  // encaixa ANTES da ponta (SOBREPOR): a peça filha entra por dentro do pai e a linha da junta some
  return [p.ponta[0] - p.pivo[0], (p.ponta[1] - p.pivo[1]) * SOBREPOR];
}

// Transformação global de cada osso: posição do pivô e ângulo acumulado.
export function resolver(bon, pose = {}, raiz = {}) {
  const porId = Object.fromEntries(OSSOS.map((o) => [o.id, o]));
  const cache = {};
  const calc = (id) => {
    if (cache[id]) return cache[id];
    const o = porId[id];
    const ang = pose[id] || 0;
    if (!o.pai) return (cache[id] = { x: raiz.x ?? 0, y: raiz.y ?? 0, ang });
    const gp = calc(o.pai);
    const [lx, ly] = encaixe(bon, o.pai, o.em);
    const c = Math.cos(rad(gp.ang)), s = Math.sin(rad(gp.ang));
    return (cache[id] = { x: gp.x + lx * c - ly * s, y: gp.y + lx * s + ly * c, ang: gp.ang + ang });
  };
  OSSOS.forEach((o) => calc(o.id));
  return cache;
}

// SVG da pose montada. `k` é a escala e `flip` espelha o boneco inteiro (ir pra esquerda não custa
// arte nenhuma num rig: é o mesmo boneco virado).
export function svgDaPose(bon, pose = {}, { w = CANVAS_W, h = CANVAS_H, x = CANVAS_W / 2, y = FEET_Y, k = null, flip = false, fundo = null, sem = [] } = {}) {
  const esc = k ?? bon.escalaPadrao;
  const g = resolver(bon, pose, { x: 0, y: 0, ang: pose.tronco || 0 });
  const camadas = [...OSSOS].sort((a, b) => a.z - b.z).map((o) => {
    const p = bon.pecas[o.id];
    // `sem` omite peças do desenho. Serve pra animação limitada: o corpo é desenhado sem cabeça e a
    // expressão entra por cima, trocando de desenho sem que o corpo saiba de nada.
    if (!p || sem.includes(o.id)) return '';
    const t = g[o.id];
    return `<g transform="translate(${t.x.toFixed(2)},${t.y.toFixed(2)}) rotate(${t.ang.toFixed(2)})">`
      + `<image href="${bon.dataUri[o.id]}" x="${(-p.pivo[0]).toFixed(2)}" y="${(-p.pivo[1]).toFixed(2)}" width="${p.w}" height="${p.h}"/></g>`;
  }).join('');
  const bg = fundo ? `<rect width="${w}" height="${h}" fill="${fundo}"/>` : '';
  // o boneco é montado com o QUADRIL na origem, então o deslocamento vertical leva o pé até y.
  const dy = y - bon.alturaQuadril * esc;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">${bg}`
    + `<g transform="translate(${x},${dy}) scale(${(flip ? -esc : esc).toFixed(4)},${esc.toFixed(4)})">${camadas}</g></svg>`;
}

export async function renderPose(bon, pose, opts = {}) {
  const png = await sharp(Buffer.from(svgDaPose(bon, pose, { ...opts, fundo: null }))).png().toBuffer();
  const comTraco = opts.traco ? await contornarSilhueta(png, opts.traco) : png;
  if (!opts.fundo) return comTraco;
  const meta = await sharp(comTraco).metadata();
  return sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: opts.fundo } })
    .composite([{ input: comTraco }]).png().toBuffer();
}

// CONTORNO DA SILHUETA DO CONJUNTO, não de cada peça.
//
// POR QUE: o defeito que faz o boneco parecer colagem não é a emenda geométrica (essa a
// sobreposição já resolve), é o TRAÇO. Cada peça vem com contorno preto fechado em volta dela, e
// duas peças sobrepostas mostram a linha da de cima cortando a de baixo, mais a ponta arredondada
// aparecendo como bolha. Num desenho de verdade o contorno existe só no CONTORNO DO CORPO.
//
// Aqui o boneco é montado primeiro e o traço é desenhado depois, a partir do alpha do resultado:
// dilatação por deslocamento em N direções, pintada de preto e posta ATRÁS. O que sai é uma linha
// única e contínua, que é o que uma emenda escondida nunca chega a ser.
export async function contornarSilhueta(png, opts = {}) {
  const { px = 6, cor = '#141414', lados = 16 } = typeof opts === 'object' ? opts : { px: opts };
  const img = sharp(png);
  const { width, height } = await img.metadata();
  // a máscara é o alpha pintado da cor do traço
  const mascara = await sharp(png).ensureAlpha()
    .composite([{ input: { create: { width, height, channels: 3, background: cor } }, blend: 'in' }])
    .png().toBuffer();
  const anel = [];
  for (let i = 0; i < lados; i++) {
    const a = (i / lados) * Math.PI * 2;
    anel.push({ input: mascara, left: Math.round(Math.cos(a) * px), top: Math.round(Math.sin(a) * px) });
  }
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([...anel, { input: png }]).png().toBuffer();
}
