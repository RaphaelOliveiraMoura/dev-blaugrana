// A ARTE DO PAINEL PRONTA PRA MONTAR: moldura, selo e legendas já desenhados.
//
// POR QUE EXISTE: em 05/08/2026 moldura e legenda saíram do prompt e passaram a ser desenhadas
// no export. O desenho, porém, ficou dentro do caminho do CARROSSEL, e os outros três montadores
// (mosaico, vídeo do quadrinho, quadrinho animado) seguiram lendo `painel.imagem` direto. Só que
// a arte de um quadrinho assim NASCE sangrada e MUDA de propósito: o que esses três montavam
// era a arte crua. O vídeo do o-dia-pedri-legenda-codigo saiu sem moldura e sem legenda nenhuma,
// e o mosaico junto.
//
// Nenhum gate reclamou, e não tinha como: não existe erro ali, o ffmpeg monta o PNG que existe.
// O que quebrou foi uma HERANÇA — antes o acabamento vinha desenhado DENTRO da arte e todo
// consumidor o recebia de graça. Ao mover o acabamento pro export, só um consumidor foi junto.
//
// A REGRA, e é a razão deste arquivo existir: QUEM MONTA NÃO LÊ `painel.imagem`, pede a arte
// aqui. Consumidor novo nasce certo sem ninguém lembrar da regra, e o acabamento tem um lugar
// só pra mudar. O acabamento.test.mjs lê as rotas e reprova quem voltar a montar do PNG cru.
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { run, X264 } from './ffmpeg.mjs'
import { CREME_POST, DIM_POST, normalizarPara } from './imagem.mjs'
import { desenharLegendas, svgDasLegendas } from './legenda.mjs'
import { enquadrar, geometriaDaMoldura, mobiliaSVG } from './moldura.mjs'
import { legendaPorCodigo, molduraDe } from '../../shared/quadrinho-config.mjs'

// O tamanho em que a peça é acabada. Sem formato pedido, é o do PRÓPRIO quadrinho: é o único
// em que a arte cabe inteira, sem faixa lateral nem corte.
export function dimDoQuadrinho(quad, formato = null) {
  return DIM_POST[formato] || DIM_POST[quad?.formato] || DIM_POST['3:4']
}

// As legendas que o CÓDIGO desenha neste painel. Vazio quando quem escreve é a IA — aí o texto
// já está dentro da arte e desenhar de novo daria legenda sobre legenda.
export function legendasDoPainel(quad, painel) {
  if (!legendaPorCodigo(quad)) return []
  return (painel?.legendas || []).map((t) => String(t || '').trim()).filter(Boolean)
}

// Tem acabamento a aplicar? Quadrinho ANTIGO (moldura e legenda pela IA) não tem: a arte dele
// já nasceu acabada, e mexer nela seria moldura dentro de moldura.
export function precisaAcabamento(quad, painel) {
  return molduraDe(quad) === 'codigo' || legendasDoPainel(quad, painel).length > 0
}

// Acaba UM painel e grava em `outAbs`, sempre no tamanho `dim`. É o que o carrossel usa: lá o
// slide precisa existir em disco mesmo quando não há nada a desenhar por cima.
export async function acabarPainel({ quad, painel, baseAbs, dim, outAbs }) {
  if (path.resolve(baseAbs) === path.resolve(outAbs)) {
    // a arte do painel é ORIGINAL (também vira story, print e outro post): acabar por cima dela
    // gruda a moldura no que deveria seguir limpo, e não há como desfazer
    throw new Error('acabarPainel: a saída não pode ser a própria arte do painel')
  }
  // 'codigo' remonta a moldura a partir da arte sangrada; 'ia' e 'nenhuma' só levam ao tamanho
  if (molduraDe(quad) === 'codigo') await enquadrar({ baseAbs, dim, outAbs })
  else await normalizarPara({ src: baseAbs, dim, saida: outAbs })

  const textos = legendasDoPainel(quad, painel)
  if (textos.length) await desenharLegendas({ baseAbs: outAbs, textos })
  return { abs: outAbs, moldura: molduraDe(quad), legendas: textos.length }
}

// A ARTE QUE OS MONTADORES CONSOMEM. Recebe [{ numero, png, legendas }] com o PNG cru do painel
// e devolve a mesma lista com `png` apontando pra arte ACABADA — materializada em `dir`, que é
// uma pasta de trabalho, nunca o acervo.
//
// Quando não há acabamento a aplicar (quadrinho antigo), devolve o próprio original: sem cópia,
// sem reencode e sem mudar em nada o que o acervo já produz hoje.
export async function artesParaMontar({ quad, paineis, dim = null, dir }) {
  const alvo = dim || dimDoQuadrinho(quad)
  const saida = []
  for (const p of paineis) {
    if (!precisaAcabamento(quad, p)) { saida.push({ ...p, acabada: false }); continue }
    const outAbs = path.join(dir, `acabada-${p.numero}.png`)
    await acabarPainel({ quad, painel: p, baseAbs: p.png, dim: alvo, outAbs })
    saida.push({ ...p, png: outAbs, acabada: true })
  }
  return saida
}

// O ACABAMENTO SOZINHO, em PNG transparente: a moldura (com o buraco por onde a arte aparece)
// e as caixas de legenda. É o que o vídeo ANIMADO precisa — lá a arte se mexe, então não há PNG
// pra recortar e remontar, e o caminho é sobrepor este desenho ao clipe. Devolve null quando
// não há nada a desenhar.
export async function pngDoAcabamento({ quad, painel, dim, outAbs }) {
  const camadas = []
  if (molduraDe(quad) === 'codigo') camadas.push(Buffer.from(mobiliaSVG(dim)))
  const { svg } = svgDasLegendas({ W: dim.w, H: dim.h, textos: legendasDoPainel(quad, painel) })
  if (svg) camadas.push(Buffer.from(svg))
  if (!camadas.length) return null

  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp({ create: { width: dim.w, height: dim.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(camadas.map((input) => ({ input, top: 0, left: 0 })))
    .png().toFile(outAbs)
  return outAbs
}

// O MESMO acabamento, num CLIPE. O painel animado (Grok) nasce da arte CRUA de propósito: o
// modelo borra a moldura e apaga texto desenhado, que é o defeito já conhecido do balão. Então
// ele anima a arte nua e a moldura entra aqui, depois, por cima do vídeo pronto.
//
// A conta é a mesma do slide: o clipe é escalado até a área INTERNA da moldura, pousa nela com
// o creme em volta, e o PNG do acabamento cobre o resto. Sem acabamento a aplicar, devolve o
// clipe de entrada intacto.
export async function acabarClipe({ quad, painel, inAbs, outAbs, dim = null, dir }) {
  const alvo = dim || dimDoQuadrinho(quad)
  const pngAcab = await pngDoAcabamento({
    quad, painel, dim: alvo, outAbs: path.join(dir, `acab-${painel.numero}.png`),
  })
  if (!pngAcab) return inAbs

  const g = geometriaDaMoldura(alvo)
  const encaixe = molduraDe(quad) === 'codigo'
    ? `scale=${g.w}:${g.h}:force_original_aspect_ratio=increase,crop=${g.w}:${g.h},`
      + `pad=${alvo.w}:${alvo.h}:${g.x}:${g.y}:color=${CREME_POST}`
    : `scale=${alvo.w}:${alvo.h}:force_original_aspect_ratio=increase,crop=${alvo.w}:${alvo.h}`
  const fc = `[0:v]${encaixe},setsar=1[base];[base][1:v]overlay=0:0[v]`
  await run('ffmpeg', ['-y', '-i', inAbs, '-i', pngAcab, '-filter_complex', fc,
    '-map', '[v]', '-map', '0:a?', ...X264, outAbs])
  return outAbs
}
