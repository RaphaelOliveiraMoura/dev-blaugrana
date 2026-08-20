// ONDE O BALÃO FICA E QUE TAMANHO TEM. Uma conta só, usada pelos DOIS lados: o desenho que
// vai pro post (server/lib/balao.mjs, medindo com a opentype) e a prévia arrastável do studio
// (src/views/quadrinho/BalaoEditor.jsx, medindo com o canvas do browser).
//
// POR QUE EXISTE: a prévia recalculava o balão por conta própria, em CSS, com números que não
// eram os do desenho. Divergia em tudo que importa — largura FIXA contra caixa que abraça o
// texto, corpo de letra em 5,2% da largura contra 3,4%, entrelinha 1.14 contra 1.18, padding
// em `em` do CSS contra fração da largura, e o rabinho como uma linha tracejada contra um
// triângulo com comprimento limitado. O sintoma pro Raphael foi exatamente o que essa lista
// prevê: "coloco numa posição e fica diferente no quadrinho", e "tento deixar a perninha
// menor e ela sempre fica maior" (a base do balão real ficava mais alta que a da prévia, e a
// perna esticava pra alcançar a mesma ponta).
//
// A MEDIÇÃO É INJETADA de propósito. Medir texto exige a fonte, e as duas pontas têm réguas
// diferentes: no servidor a opentype lê o .ttf, no browser o canvas mede a fonte instalada.
// O que não pode divergir é a GEOMETRIA, e ela mora aqui. As duas réguas leem a mesma família
// no mesmo corpo, então a diferença de medida fica em fração de pixel.
//
// Tudo em FRAÇÃO do retângulo em que o balão é desenhado, nunca px: o mesmo `pos` vale na
// prévia (arte crua), no slide do carrossel (área interna da moldura) e no clipe animado.
import { CAIXA, raioPx } from './caixa-estilo.mjs'
import { posAutomatica } from './balao-pos.mjs'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Quebra o texto medindo a largura REAL na fonte, nunca por contagem de letras.
function quebrar(medir, palavras, fontSize, maxW) {
  const linhas = []
  let atual = ''
  for (const p of palavras) {
    const t = atual ? `${atual} ${p}` : p
    if (medir(t, fontSize) <= maxW || !atual) atual = t
    else { linhas.push(atual); atual = p }
  }
  if (atual) linhas.push(atual)
  return linhas
}

// `medir(texto, fontSize)` devolve a largura em px. `pos` é a posição arrastada (ou null pro
// automático). `indice`/`total` só importam quando não há `pos`: a segunda bolha de um painel
// nasce deslocada da primeira.
export function geometriaDoBalao({ W, H, texto, medir, pos = null, indice = 0, total = 1 }) {
  const t = String(texto || '').trim()
  if (!t) return null
  if (!pos && total > 1) pos = posAutomatica(indice, total)

  const temPos = pos && Number.isFinite(pos.x) && Number.isFinite(pos.w)
  const padX = Math.round(W * CAIXA.padX)
  const padY = Math.round(W * CAIXA.padY)
  const larguraAlvo = temPos ? Math.round(clamp(pos.w, 0.18, 0.94) * W) : Math.round(W * 0.72)
  const maxTextW = larguraAlvo - padX * 2
  const maxH = temPos ? Math.round(H * 0.55) : Math.round(H * 0.40) - Math.round(H * 0.055) - padY * 2

  // o corpo encolhe até o texto caber, igual ao da caixa de legenda
  const palavras = t.toUpperCase().split(/\s+/).filter(Boolean)
  const piso = Math.max(10, Math.round(W * CAIXA.fonteMin))
  let fontSize = Math.round(W * CAIXA.fonte), linhas, textW, textH, lineH
  for (;;) {
    linhas = quebrar(medir, palavras, fontSize, maxTextW)
    lineH = fontSize * CAIXA.entrelinha
    textH = linhas.length * lineH
    textW = Math.max(...linhas.map((l) => medir(l, fontSize)))
    if (fontSize <= piso || (textH <= maxH && textW <= maxTextW)) break
    fontSize -= 2
  }

  // A CAIXA ABRAÇA O TEXTO, inclusive com posição arrastada: `pos.w` é TETO, não largura fixa,
  // que é como a caixa de legenda se comporta. Travada em 72% da largura, uma bolha pra dizer
  // "TÁ." era uma mancha creme com três letras no meio.
  const w = Math.min(larguraAlvo, Math.round(textW + padX * 2))
  const h = Math.round(textH + padY * 2)
  const x = temPos ? Math.round(clamp(pos.x, 0, 1 - w / W) * W) : Math.round(W * 0.06)
  const y = temPos ? Math.round(clamp(pos.y, 0, 0.92) * H) : Math.round(H * 0.055)
  const r = raioPx(W, h)

  const alvo = temPos
    ? { x: Math.round(clamp(pos.tipX, 0, 1) * W), y: Math.round(clamp(pos.tipY, 0, 1) * H) }
    : { x: x + Math.round(w * 0.56), y: Math.min(Math.round(H * 0.47), Math.round(y + h + H * 0.12)) }

  // A PONTA APONTA, NÃO ALCANÇA: o comprimento fica entre um piso e um teto, e a DIREÇÃO é
  // preservada (o vetor inteiro é escalado, nunca aparado num eixo só, senão a perninha
  // apontaria pro lado errado justamente no painel com duas pessoas).
  //
  // TETO, pouco mais que a altura da caixa: sem ele, um balão no alto com o falante no meio do
  // quadro estica um triângulo estreito por meio painel, que lê como seta de apontar.
  //
  // PISO baixo, só o bastante pra não inverter: arrastando a mira pra perto (ou pra cima) da
  // base, o vetor encolhia até virar do avesso e a ponta entrava PELO balão. O piso começou
  // valendo 35% da altura da caixa e isso era outro problema: o Raphael queria perninha
  // pequena e o piso não deixava. Hoje ele é o mínimo pra ela continuar sendo um bico.
  const maxPerna = h * 1.15
  const minPerna = h * 0.12

  // A BASE DO TRIÂNGULO ESTREITA JUNTO COM A PERNA. Base larga com perna curta não é perninha
  // pequena, é um amassado na borda de baixo do balão: o desenho fica raso e some no contorno,
  // e a impressão é a de que encurtar não funciona.
  const calcular = (halfW) => {
    const baseX = clamp(alvo.x, x + r + halfW, x + w - r - halfW)
    const dx = alvo.x - baseX
    const dy = Math.max(alvo.y - (y + h), 1) // a ponta vive ABAIXO da base, sempre
    const dist = Math.hypot(dx, dy) || 1
    const k = clamp(dist > maxPerna ? maxPerna / dist : 1, minPerna / dist, 1e9)
    return { baseX, halfW, tipX: Math.round(baseX + dx * k), tipY: Math.round(y + h + dy * k), perna: dist * k }
  }
  // Duas passadas: a primeira mede a perna com a base cheia, a segunda estreita a base pra
  // acompanhá-la. Sem a segunda, `halfW` e o comprimento se definiriam em círculo.
  const larga = Math.round(clamp(w * 0.16, W * 0.028, w * 0.32))
  const tail = calcular(Math.round(clamp(calcular(larga).perna * 0.55, W * 0.016, larga)))

  return {
    x, y, w, h, r, padX, padY, fontSize, linhas, lineH,
    primeiraBase: y + padY + fontSize * 0.82,
    centroX: x + w / 2,
    tail,
  }
}

// O CONTORNO: o retângulo arredondado da caixa de LEGENDA com o rabinho aberto na base, e
// nada mais. Arco de verdade (comando `A`) e não arco poligonizado, que é o que o `rx` do
// <rect> da legenda produz: canto facetado ao lado de canto liso denuncia na hora.
export function caminhoDoBalao(g) {
  const n = (v) => v.toFixed(1)
  const { x, y, w, h, r, tail } = g
  const arco = (px, py) => `A ${n(r)} ${n(r)} 0 0 1 ${n(px)} ${n(py)}`
  const bY = y + h
  const dir = Math.max(x + r, Math.min(tail.baseX + tail.halfW, x + w - r))
  const esq = Math.max(x + r, Math.min(tail.baseX - tail.halfW, x + w - r))
  return [
    `M ${n(x + r)} ${n(y)}`,
    `L ${n(x + w - r)} ${n(y)}`, arco(x + w, y + r),
    `L ${n(x + w)} ${n(bY - r)}`, arco(x + w - r, bY),
    `L ${n(dir)} ${n(bY)}`,
    `L ${n(tail.tipX)} ${n(tail.tipY)}`, // desce até a ponta
    `L ${n(esq)} ${n(bY)}`,              // e volta
    `L ${n(x + r)} ${n(bY)}`, arco(x, bY - r),
    `L ${n(x)} ${n(y + r)}`, arco(x + r, y),
    'Z',
  ].join(' ')
}
