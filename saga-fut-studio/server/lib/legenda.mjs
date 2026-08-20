// As CAIXAS DE LEGENDA de um painel, desenhadas POR CÓDIGO em vez de pela IA.
//
// POR QUE EXISTE: quem escreve a legenda hoje é o modelo de imagem, e cada geração é um
// sorteio de ortografia. Já saiu "PEDRI PEGO A MOCHILA" (sem o U) num painel aprovado, e
// nenhum gate pega isso — texto errado é arte válida pra qualquer validador. É a mesma
// família de defeito do balão, que a casa já resolveu assim em lib/balao.mjs: texto
// vetorizado pela opentype e composto por cima com sharp.
//
// O QUE MUDA NA PRÁTICA: a arte do painel nasce MUDA (as legendas saem de `falas` e vão
// pro campo `legendas`, que o motor de prompt não lê), e a caixa entra no export. Ganhos
// além da ortografia: reescrever uma legenda deixa de custar geração (era o gasto maior
// da revisão de texto), e a mesma arte serve pra outro idioma depois.
//
// O DESENHO TEM QUE FICAR IGUAL AO DA IA: caixa creme, contorno preto grosso de canto
// arredondado, texto preto em caixa alta centralizado, empilhadas na base do painel.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { carregarFonte, limparNaN } from './balao.mjs'
import { CAIXA, CREME, FONTE_CAIXA, TINTA, contornoPx, raioPx } from '../../shared/caixa-estilo.mjs'

// Proporções medidas nos painéis que a IA desenhou, pra caixa de código pousar no mesmo
// lugar e no mesmo tamanho. Tudo em fração da LARGURA (o painel é sempre retrato).
// O que é COMPARTILHADO com o balão de fala (cor, contorno, canto, corpo, peso) mora em
// lib/caixa-estilo.mjs: os dois desenhos divergiram uma vez e ficaram de famílias diferentes
// no mesmo slide. Aqui ficou só o que é da LEGENDA, que é onde ela pousa e como empilha.
const P = {
  ...CAIXA,
  margemBaixo: 0.085,  // a última caixa fica ACIMA da moldura, com arte aparecendo embaixo
  entreCaixas: 0.016,  // espaço entre duas caixas empilhadas
  larguraMax: 0.72,    // a caixa ABRAÇA o texto e quebra cedo, em vez de esticar até a borda
  maxLinhas: 3,        // acima disso a caixa vira parede e tampa a arte
}


// Quebra o texto em linhas medindo a largura REAL na fonte (não por contagem de letras).
function quebrar(f, texto, fontSize, maxW) {
  const palavras = texto.toUpperCase().split(/\s+/).filter(Boolean)
  const linhas = []
  let atual = ''
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p
    if (f.getAdvanceWidth(tentativa, fontSize) <= maxW || !atual) atual = tentativa
    else { linhas.push(atual); atual = p }
  }
  if (atual) linhas.push(atual)
  return linhas
}

// AS CAIXAS EM SVG, sem tocar em imagem nenhuma. Separado do desenho porque o VÍDEO precisa
// das mesmas caixas por cima de um clipe em movimento, e lá o que dá pra fazer é sobrepor um
// PNG transparente. Saindo do mesmo lugar, a legenda do vídeo não diverge da do slide.
// Devolve { svg, caixas } — `caixas` é a geometria do que foi desenhado.
export function svgDasLegendas({ W, H, textos, fonte = FONTE_CAIXA }) {
  const lista = (textos || []).map((t) => String(t || '').trim()).filter(Boolean)
  if (!lista.length) return { svg: null, caixas: [] }
  const f = carregarFonte(fonte)

  const padX = Math.round(W * P.padX)
  const padY = Math.round(W * P.padY)
  const maxTextoW = Math.round(W * P.larguraMax) - padX * 2

  // A FONTE ENCOLHE ATÉ A LEGENDA CABER EM POUCAS LINHAS. Sem isto, uma legenda longa vira
  // um bloco de quatro linhas que come metade do painel (foi o que aconteceu com "os olheiros
  // do Real Madrid o chamaram para uma semana de testes em Valdebebas"). A IA fazia esse
  // ajuste sozinha; o código precisa fazer explícito. O corpo é o MESMO para todas as caixas
  // do painel: tamanho diferente entre caixas vizinhas lê como erro de diagramação.
  const cabe = (fs_) => lista.every((t) => quebrar(f, t, fs_, maxTextoW).length <= P.maxLinhas)
  let fontSize = Math.round(W * P.fonte)
  const minimo = Math.round(W * P.fonteMin)
  while (fontSize > minimo && !cabe(fontSize)) fontSize -= 2

  const alturaLinha = fontSize * P.entrelinha

  // mede todas antes de posicionar: a pilha cresce de baixo pra cima
  const caixas = lista.map((texto) => {
    const linhas = quebrar(f, texto, fontSize, maxTextoW)
    const larguraTexto = Math.max(...linhas.map((l) => f.getAdvanceWidth(l, fontSize)))
    return {
      linhas,
      larguraTexto,
      w: Math.round(larguraTexto + padX * 2),
      h: Math.round(linhas.length * alturaLinha + padY * 2),
    }
  })

  const alturaTotal = caixas.reduce((s, c) => s + c.h, 0) + Math.round(W * P.entreCaixas) * (caixas.length - 1)
  let y = H - Math.round(W * P.margemBaixo) - alturaTotal

  const partes = []
  for (const c of caixas) {
    const x = Math.round((W - c.w) / 2) // centralizada, como as da IA
    const r = raioPx(W, c.h)
    partes.push(`<rect x="${x}" y="${y}" width="${c.w}" height="${c.h}" rx="${r}" ry="${r}"`
      + ` fill="${CREME}" stroke="${TINTA}" stroke-width="${contornoPx(W)}"/>`)
    c.linhas.forEach((linha, i) => {
      const larg = f.getAdvanceWidth(linha, fontSize)
      const lx = x + (c.w - larg) / 2
      const ly = y + padY + fontSize * 0.82 + i * alturaLinha
      // limparNaN não é opcional: um NaN do opentype derruba o path inteiro (ver balao.mjs)
      const grossura = (P.peso * fontSize).toFixed(2)
      partes.push(`<path d="${limparNaN(f.getPath(linha, lx, ly, fontSize).toPathData(2))}"`
        + ` fill="${TINTA}" stroke="${TINTA}" stroke-width="${grossura}" stroke-linejoin="round"/>`)
    })
    c.x = x; c.y = y
    y += c.h + Math.round(W * P.entreCaixas)
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  ${partes.join('\n  ')}
</svg>`

  // `fontSize` sai junto de propósito: é o que diz se o auto-encolhimento entrou em ação,
  // e altura sozinha não serve de régua (mistura corpo da letra com número de linhas).
  return { svg, caixas: caixas.map(({ x, y, w, h, linhas }) => ({ x, y, w, h, linhas, fontSize })) }
}

// QUANTAS LINHAS CADA CAIXA VAI OCUPAR, sem desenhar nada. Mede pela FONTE REAL, então é o
// mesmo número que o slide vai ter. Existe porque o teto de `P.maxLinhas` é um ALVO do
// auto-encolhimento, não um limite: quando nem o corpo mínimo faz caber, o desenho sai com
// quatro ou cinco linhas em silêncio e a legenda vira uma parede que tampa a arte. Quem
// escreve precisa saber disso na hora de escrever, não na hora de olhar o slide pronto.
export function linhasPorCaixa({ textos, W = 1080, H = 1440, fonte = 'comic' }) {
  const { caixas } = svgDasLegendas({ W, H, textos, fonte })
  return caixas.map((c) => ({ linhas: c.linhas.length, fontSize: c.fontSize, texto: c.linhas.join(' ') }))
}
export const MAX_LINHAS = P.maxLinhas

// Desenha as caixas de legenda por cima de <baseAbs>. `textos` é a lista de legendas do
// painel, na ordem de leitura (a primeira fica em cima). Devolve as caixas desenhadas.
export async function desenharLegendas({ baseAbs, textos, outAbs = null, fonte = 'comic' }) {
  const meta = await sharp(baseAbs).metadata()
  const { svg, caixas } = svgDasLegendas({ W: meta.width, H: meta.height, textos, fonte })
  if (!svg) return []

  const png = await sharp(baseAbs).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer()
  fs.mkdirSync(path.dirname(outAbs || baseAbs), { recursive: true })
  fs.writeFileSync(outAbs || baseAbs, png)
  return caixas
}
