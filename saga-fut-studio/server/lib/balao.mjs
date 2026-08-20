// Desenha os BALÕES de fala de um painel: a bolha e o texto, em SVG.
//
// Quem chama é o lib/acabamento.mjs, no export. A arte base é MUDA (o prompt manda a IA não
// desenhar fala) e o balão entra depois, vetorial, então trocar o texto não regera a imagem.
// O dado vem de `painel.falas` — a MESMA lista que a aba Conteúdo edita e que, no modo "balão
// pela IA", vira instrução de speech balloon no prompt. Um campo só, dois destinos.
//
// O DESENHO É O DA CAIXA DE LEGENDA, com rabinho: mesma cor, mesmo contorno, mesmo canto,
// mesmo corpo de letra e mesma fonte, tudo lido de lib/caixa-estilo.mjs. As duas peças
// aparecem no mesmo slide, então divergir aqui lê como colagem de dois quadrinhos.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import opentype from 'opentype.js'
import { CAIXA, CREME, FONTE_CAIXA, TINTA, contornoPx } from '../../shared/caixa-estilo.mjs'
import { caminhoDoBalao, geometriaDoBalao } from '../../shared/balao-geometria.mjs'

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
// mesma da caixa de legenda, de propósito (ver lib/caixa-estilo.mjs)
export const FONTE_BALAO_PADRAO = FONTE_CAIXA
const _fontes = new Map()
// exportada porque o CARIMBO de progresso (lib/carimbo.mjs) desenha texto com a mesma
// fonte de traço: um só lugar sabe carregar e cachear os .ttf.
export const carregarFonte = (id) => {
  const def = FONTES_BALAO.find((x) => x.id === id) || FONTES_BALAO[0]
  if (!_fontes.has(def.id)) {
    const b = fs.readFileSync(def.arquivo)
    _fontes.set(def.id, opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)))
  }
  return _fontes.get(def.id)
}

// O opentype.js às vezes cospe um coordenada NaN num ponto de controle de curva
// (bug conhecido em certos glifos/posições). Um único NaN faz o resvg abortar o path
// e o resto do texto some. Exportada porque o carimbo (lib/carimbo.mjs) desenha texto
// com a mesma fonte e pisou exatamente nisto: o '2' do '2/6' sumiu e sobrou um traço.
//
// O CONSERTO É JOGAR FORA O SEGMENTO, NÃO RECICLAR O NÚMERO. A primeira versão trocava
// cada NaN pelo último número válido da string, apostando que o desvio seria de poucos px.
// No carimbo era: são dois dígitos, e o número anterior está a milímetros. Num texto de
// balão não: em "DEIXA EU VER." no corpo 76 o último número válido era o X de uma letra
// anterior, e o `L` remendado virou um traço reto atravessando a frase inteira, com toda a
// cara de texto riscado a caneta. Passou pelo render, pelo export e pela folha de contato.
//
// Removendo o comando inteiro, o contorno fecha direto no ponto seguinte: perde-se um
// vértice do glifo (uma corda no lugar de um canto, invisível no traço trêmulo) em vez de
// ganhar uma linha que não existe. O `M` é a exceção e continua no remendo antigo: ele abre
// o subpath, e removê-lo grudaria o glifo no anterior.
export const limparNaN = (d) => {
  if (!d.includes('NaN')) return d
  let ultimo = '0'
  const remendar = (cmd) => cmd.replace(/-?\d*\.?\d+|NaN/g, (m) => (m === 'NaN' ? ultimo : (ultimo = m)))
  // SEM flag `i` de propósito: o opentype emite só comandos ABSOLUTOS (maiúsculos), e com
  // case-insensitive o `a` de "NaN" seria lido como um comando de arco, partindo o token
  // exatamente no lugar que se quer inspecionar (o filtro virava no-op silencioso).
  return (d.match(/[MLQCSTAHVZ][^MLQCSTAHVZ]*/g) || [])
    .map((cmd) => {
      if (!cmd.includes('NaN')) { const n = cmd.match(/-?\d*\.?\d+/g); if (n) ultimo = n[n.length - 1]; return cmd }
      return cmd.startsWith('M') ? remendar(cmd) : ''
    })
    .join('')
}


// O BALÃO SOZINHO, como SVG de W x H transparente. Separado do compor porque o export
// desenha o balão na ÁREA INTERNA da moldura (um retângulo menor que o slide), e não sobre
// a arte crua: com moldura por código a arte entra recuada, e compor o balão no canvas
// inteiro deslocaria a ponta do rabinho que foi arrastada na tela.
//
// `pos` é sempre FRAÇÃO (0..1) do retângulo em que o balão é desenhado, nunca pixel: é o
// que faz a mesma posição valer na prévia da aba, no slide do carrossel e no clipe animado,
// que têm três tamanhos diferentes.
export function svgDoBalao({ W, H, texto, fonte: fonteId = FONTE_BALAO_PADRAO, pos = null }) {
  const { corpo } = corpoDoBalao({ W, H, texto, fonte: fonteId, pos })
  return { svg: envelopeSVG(W, H, corpo.svg), fontSize: corpo.fontSize, lines: corpo.lines }
}

// TODOS os balões de um painel num SVG só. A fala de um painel é uma lista (dois personagens
// podem falar), então o desenho recebe a lista: um <svg> por bolha se sobreporia como camadas
// separadas e o auto-posicionamento não teria como saber que existe uma segunda bolha.
export function svgDosBaloes({ W, H, falas = [], fonte = FONTE_BALAO_PADRAO }) {
  const uteis = falas.filter((f) => String(f?.texto || '').trim())
  if (!uteis.length) return null
  const corpos = uteis.map((f, i) => corpoDoBalao({
    W, H, texto: f.texto, fonte, pos: f.pos || null, indice: i, total: uteis.length,
  }).corpo.svg)
  return envelopeSVG(W, H, corpos.join('\n  '))
}

const envelopeSVG = (W, H, dentro) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  ${dentro}
</svg>`

// Mede com a opentype, pede a GEOMETRIA ao shared (a mesma que a prévia do studio usa) e
// desenha. O que este arquivo ainda decide sozinho é só a tinta: cor, espessura e os glifos.
function corpoDoBalao({ W, H, texto, fonte: fonteId = FONTE_BALAO_PADRAO, pos = null, indice = 0, total = 1 }) {
  const f = carregarFonte(fonteId)
  const g = geometriaDoBalao({
    W, H, texto, pos, indice, total,
    medir: (s, fs_) => f.getAdvanceWidth(s, fs_),
  })
  if (!g) throw new Error('texto do balão vazio')

  // texto: cada linha vira um path de glifos, centralizado (largura real da fonte). O
  // `stroke` da PRÓPRIA cor é o que engrossa o glifo, igualzinho ao da legenda: as fontes
  // single-face que a opentype vetoriza só têm o peso regular.
  const grossura = (CAIXA.peso * g.fontSize).toFixed(2)
  const glifos = g.linhas
    .map((l, i) => {
      const x = g.centroX - f.getAdvanceWidth(l, g.fontSize) / 2
      const y = g.primeiraBase + i * g.lineH
      return `<path d="${limparNaN(f.getPath(l, x, y, g.fontSize).toPathData(2))}"`
        + ` fill="${TINTA}" stroke="${TINTA}" stroke-width="${grossura}" stroke-linejoin="round"/>`
    })
    .join('\n    ')

  // UM traço só, liso, na espessura e na cor da caixa de legenda (shared/caixa-estilo.mjs).
  const svg = [
    `<path d="${caminhoDoBalao(g)}" fill="${CREME}" stroke="${TINTA}" stroke-width="${contornoPx(W)}"`
      + ' stroke-linejoin="round" stroke-linecap="round"/>',
    glifos,
  ].join('\n  ')

  return { corpo: { svg, fontSize: g.fontSize, lines: g.linhas } }
}

// Gera <outAbs> = <baseAbs> com o balão desenhado por cima. Retorna { fontSize, lines }.
// É a PRÉVIA da aba Balão e o CLI dos coringas: escreve um PNG à parte, sobre a arte crua.
// Quem publica não passa por aqui — no export o balão é acabamento (ver lib/acabamento.mjs),
// desenhado junto com moldura e legenda, senão ele só existiria dentro da própria aba.
export async function renderBalao({ baseAbs, texto, outAbs, fonte = FONTE_BALAO_PADRAO, pos = null }) {
  const meta = await sharp(baseAbs).metadata()
  const { svg, fontSize, lines } = svgDoBalao({ W: meta.width, H: meta.height, texto, fonte, pos })
  fs.mkdirSync(path.dirname(outAbs), { recursive: true })
  await sharp(baseAbs).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(outAbs)
  return { fontSize, lines }
}
