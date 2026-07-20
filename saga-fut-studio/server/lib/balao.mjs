// Desenha um BALÃO rabiscado com texto POR CIMA da arte parada de um painel.
// A arte base é MUDA (sem balão da IA); aqui o balão é vetorial, então trocar o texto
// não regera a imagem. Usado pela rota /api/balao e pelo CLI coringa-balao.mjs.
//
// O "rabiscado" vem de: contorno trêmulo (perímetro com jitter) desenhado em DUAS
// passadas ligeiramente diferentes (dupla linha de esboço) + fonte manuscrita.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import opentype from 'opentype.js'

// Fonte VETORIZADA: o texto vira path (glifos desenhados), então não depende de
// fontconfig/resvg achar a fonte por nome, e a largura sai exata (medida pela própria
// fonte), o que dá a quebra de linha certa. Catálogo de fontes de traço que o
// opentype consegue vetorizar (single-face .ttf; .ttc não parseia).
export const FONTES_BALAO = [
  { id: 'bradley', nome: 'Bradley Hand — manuscrita', arquivo: '/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf' },
  { id: 'comic', nome: 'Comic Sans — meme clássico', arquivo: '/System/Library/Fonts/Supplemental/Comic Sans MS Bold.ttf' },
  { id: 'chalk', nome: 'Chalkduster — giz rabiscado', arquivo: '/System/Library/Fonts/Supplemental/Chalkduster.ttf' },
  { id: 'rounded', nome: 'SF Rounded — limpa', arquivo: '/System/Library/Fonts/SFNSRounded.ttf' },
  { id: 'tinta', nome: 'Trattatello — tinta', arquivo: '/System/Library/Fonts/Supplemental/Trattatello.ttf' },
]
export const FONTE_BALAO_PADRAO = 'bradley'
const _fontes = new Map()
const fonte = (id) => {
  const def = FONTES_BALAO.find((x) => x.id === id) || FONTES_BALAO[0]
  if (!_fontes.has(def.id)) {
    const b = fs.readFileSync(def.arquivo)
    _fontes.set(def.id, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)))
  }
  return _fontes.get(def.id)
}

// PRNG determinístico semeado pelo texto: o rabisco é estável pro mesmo texto
const hashStr = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
// O opentype.js às vezes cospe um coordenada NaN num ponto de controle de curva
// (bug conhecido em certos glifos/posições). Um único NaN faz o resvg abortar o path
// e o resto do texto some. Aqui trocamos cada NaN pelo último número válido: o desvio
// é de poucos px num ponto de controle, invisível no traço trêmulo, e o path volta a
// ser válido.
const limparNaN = (d) => {
  if (!d.includes('NaN')) return d
  let ultimo = '0'
  return d.replace(/-?\d*\.?\d+|NaN/g, (m) => (m === 'NaN' ? ultimo : (ultimo = m)))
}

// perímetro do retângulo arredondado COM o rabinho embutido na base, tudo jitterado
function caminhoBalao({ x, y, w, h, r, tail, jit, rng }) {
  const pts = []
  const J = () => (rng() * 2 - 1) * jit
  const add = (px, py) => pts.push([px + J(), py + J()])
  const edge = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1)
    const n = Math.max(1, Math.round(len / 26))
    for (let i = 0; i < n; i++) { const t = i / n; add(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t) }
  }
  const arc = (cx, cy, a0, a1) => {
    const n = 5
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i / n); add(cx + Math.cos(a) * r, cy + Math.sin(a) * r) }
  }
  const bY = y + h
  edge(x + r, y, x + w - r, y) // topo
  arc(x + w - r, y + r, -Math.PI / 2, 0) // canto sup. direito
  edge(x + w, y + r, x + w, y + h - r) // direita
  arc(x + w - r, y + h - r, 0, Math.PI / 2) // canto inf. direito
  // base (direita -> esquerda) com o rabinho no meio
  edge(x + w - r, bY, tail.baseX + tail.halfW, bY)
  add(tail.tipX, tail.tipY) // desce até a ponta
  add(tail.baseX - tail.halfW, bY) // volta
  edge(tail.baseX - tail.halfW, bY, x + r, bY)
  arc(x + r, y + h - r, Math.PI / 2, Math.PI) // canto inf. esquerdo
  edge(x, y + h - r, x, y + r) // esquerda
  arc(x + r, y + r, Math.PI, Math.PI * 1.5) // canto sup. esquerdo
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`
  return d + ' Z'
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Gera <outAbs> = <baseAbs> com o balão desenhado por cima. Retorna { fontSize, lines }.
// `pos` (opcional): { x, y, w, tipX, tipY } em FRAÇÃO da imagem (0..1). x,y = canto
// superior esquerdo do balão; w = largura; tipX,tipY = ponta do rabinho. A ALTURA sai
// do texto. Sem `pos`, cai no posicionamento automático (encolhe pra caber o texto).
export async function renderBalao({ baseAbs, texto, outAbs, fonte: fonteId = FONTE_BALAO_PADRAO, pos = null }) {
  const t = (texto || '').trim()
  if (!t) throw new Error('texto do balão vazio')
  const meta = await sharp(baseAbs).metadata()
  const W = meta.width, H = meta.height

  const temPos = pos && Number.isFinite(pos.x) && Number.isFinite(pos.w)
  const PADX = Math.round(W * 0.045)
  const PADY = Math.round(W * 0.042)
  // largura-alvo do balão: manual = a que o usuário arrastou; auto = teto de 72%
  const larguraAlvo = temPos ? Math.round(clamp(pos.w, 0.18, 0.94) * W) : Math.round(W * 0.72)

  // quebra de linha + auto-ajuste de fonte, com LARGURA REAL medida pela fonte
  const f = fonte(fonteId)
  const medir = (s, fs_) => f.getAdvanceWidth(s, fs_)
  const words = t.toUpperCase().split(/\s+/)
  const wrap = (fs_, maxW) => {
    const lines = []; let cur = ''
    for (const w of words) {
      const tl = cur ? cur + ' ' + w : w
      if (medir(tl, fs_) <= maxW || !cur) cur = tl
      else { lines.push(cur); cur = w }
    }
    if (cur) lines.push(cur)
    return lines
  }
  const widest = (lines, fs_) => Math.max(...lines.map((l) => medir(l, fs_)))

  const maxTextW = larguraAlvo - PADX * 2
  const maxH = temPos ? Math.round(H * 0.55) : Math.round(H * 0.40) - Math.round(H * 0.055) - PADY * 2
  let fontSize = Math.round(W * 0.066), lines, textW, textH, lineH
  while (fontSize > 22) {
    lines = wrap(fontSize, maxTextW)
    lineH = fontSize * 1.14
    textH = lines.length * lineH
    textW = widest(lines, fontSize)
    if (textH <= maxH && textW <= maxTextW) break
    fontSize -= 2
  }

  // largura final: manual respeita o que foi arrastado; auto encolhe pra caber o texto
  const balloonW = temPos ? larguraAlvo : Math.min(larguraAlvo, Math.round(textW + PADX * 2))
  const balloonH = Math.round(textH + PADY * 2)
  const bx = temPos ? Math.round(clamp(pos.x, 0, 1 - balloonW / W) * W) : Math.round(W * 0.06)
  const by = temPos ? Math.round(clamp(pos.y, 0, 0.92) * H) : Math.round(H * 0.055)
  const r = Math.round(Math.min(balloonH * 0.34, 64))
  const cx = bx + balloonW / 2
  const firstBaseline = by + PADY + fontSize * 0.82

  // rabinho: manual aponta pra ponta arrastada; auto mira a cabeça sem esticar demais
  const tip = temPos
    ? { x: Math.round(clamp(pos.tipX, 0, 1) * W), y: Math.round(clamp(pos.tipY, 0, 1) * H) }
    : { x: bx + Math.round(balloonW * 0.56), y: Math.min(Math.round(H * 0.47), Math.round(by + balloonH + H * 0.12)) }
  const tail = {
    baseX: clamp(tip.x, bx + r + Math.round(balloonW * 0.12), bx + balloonW - r - Math.round(balloonW * 0.12)),
    halfW: Math.round(balloonW * 0.12),
    tipX: tip.x,
    tipY: tip.y,
  }

  const seed = hashStr(t)
  const d1 = caminhoBalao({ x: bx, y: by, w: balloonW, h: balloonH, r, tail, jit: 3.0, rng: mulberry32(seed) })
  const d2 = caminhoBalao({ x: bx, y: by, w: balloonW, h: balloonH, r, tail, jit: 4.6, rng: mulberry32(seed ^ 0x9e3779b9) })

  // texto: cada linha vira um path de glifos, centralizado (largura real da fonte)
  const glifos = lines
    .map((l, i) => {
      const w = medir(l, fontSize)
      const x = cx - w / 2
      const y = firstBaseline + i * lineH
      return `<path d="${limparNaN(f.getPath(l, x, y, fontSize).toPathData(2))}" fill="#1a1a1a"/>`
    })
    .join('\n    ')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <path d="${d1}" fill="#ffffff" stroke="#1a1a1a" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${d2}" fill="none" stroke="#1a1a1a" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
    ${glifos}
</svg>`

  fs.mkdirSync(path.dirname(outAbs), { recursive: true })
  await sharp(baseAbs).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(outAbs)
  return { fontSize, lines }
}
