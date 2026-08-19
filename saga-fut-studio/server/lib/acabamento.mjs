// A ARTE DO PAINEL PRONTA PRA MONTAR: moldura, selo, legendas e balões já desenhados.
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
//
// O BALÃO entrou aqui em 10/08/2026 pelo mesmo motivo, e a história se repetiu quase igual: ele
// nascia como um ARQUIVO à parte (posts/balao-<n>.png) que só a aba Balão lia. Dava pra escrever
// a fala, ver o balão na tela, exportar o carrossel e o post sair mudo, sem erro nenhum no meio
// do caminho. Agora o balão é acabamento como a moldura e a legenda: um eixo em quadrinho-config
// decide quem desenha, e o PNG da aba virou só prévia.
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { run, X264 } from './ffmpeg.mjs'
import { CREME_POST, DIM_POST, normalizarPara } from './imagem.mjs'
import { desenharLegendas, svgDasLegendas } from './legenda.mjs'
import { unirCortesRuins } from '../../shared/legenda-corte.mjs'
import { enquadrar, geometriaDaMoldura, mobiliaSVG } from './moldura.mjs'
import { svgDosBaloes, FONTE_BALAO_PADRAO } from './balao.mjs'
import { balaoPorCodigo, legendaPorCodigo, molduraDe } from '../../shared/quadrinho-config.mjs'

// O tamanho em que a peça é acabada. Sem formato pedido, é o do PRÓPRIO quadrinho: é o único
// em que a arte cabe inteira, sem faixa lateral nem corte.
export function dimDoQuadrinho(quad, formato = null) {
  return DIM_POST[formato] || DIM_POST[quad?.formato] || DIM_POST['3:4']
}

// O PAINEL COMPLETO, resolvido pelo NÚMERO dentro do quadrinho.
//
// Os montadores passam um objeto reduzido ({ numero, png, legendas }) porque o que eles têm
// em mãos é o caminho do PNG. Se o acabamento lesse os campos desse objeto, cada campo novo
// (o balão foi o primeiro) precisaria ser copiado nos QUATRO lugares que montam a lista, e
// esquecer um não dá erro: dá slide sem balão. Lendo do `quad`, quem monta não precisa saber
// o que o acabamento consome.
function painelCompleto(quad, painel) {
  const n = Number(painel?.numero)
  return (quad?.paineis || []).find((p) => Number(p.numero) === n) || painel || {}
}

// As legendas que o CÓDIGO desenha neste painel. Vazio quando quem escreve é a IA — aí o texto
// já está dentro da arte e desenhar de novo daria legenda sobre legenda.
//
// A REDE DO CORTE entra aqui: caixa que continua a frase da anterior é JUNTADA antes de virar
// desenho, então o slide não sai com a frase partida em duas caixas nem quando o dado está
// errado. Quem deveria impedir isso é o gate do PUT (shared/legenda-corte.mjs), e com ele ligado
// esta linha é no-op no acervo inteiro — ela existe pro que já está gravado e pro que entrar por
// fora da API. A CAPA é exceção declarada: lá a fórmula da série é manchete + tarja de lugar e
// data, dois blocos que se leem separados de propósito.
export function legendasDoPainel(quad, painel) {
  if (!legendaPorCodigo(quad)) return []
  const textos = (painelCompleto(quad, painel).legendas || []).map((t) => String(t || '').trim()).filter(Boolean)
  const numeros = (quad?.paineis || []).map((p) => Number(p?.numero) || 0).filter((n) => n > 0)
  const capa = numeros.length ? Number(painel?.numero) === Math.min(...numeros) : false
  return unirCortesRuins(textos, { capa })
}

// As FALAS que o código desenha como balão neste painel. Mesma regra da legenda: só quando o
// quadrinho declarou que o balão é por código, senão a fala já está desenhada na arte.
//
// A fonte é `painel.falas`, a MESMA lista que alimenta o prompt no modo "pela IA". Houve um
// campo separado (`balaoTexto`) por um tempo, e o resultado foi duas telas editando o mesmo
// dado em lugares diferentes, cada quadrinho usando um: unificado em 10/08/2026.
//
// Caption não entra: ela é caixa de narração, e quem desenha caixa é o lib/legenda.mjs.
export function balaoDoPainel(quad, painel) {
  if (!balaoPorCodigo(quad)) return null
  const falas = (painelCompleto(quad, painel).falas || [])
    .filter((f) => f && f.tipo !== 'caption' && f.personagem && String(f.texto || '').trim())
  if (!falas.length) return null
  return { falas, fonte: quad?.balaoFonte || FONTE_BALAO_PADRAO }
}

// Tem acabamento a aplicar? Quadrinho ANTIGO (moldura, legenda e balão pela IA) não tem: a
// arte dele já nasceu acabada, e mexer nela seria moldura dentro de moldura.
export function precisaAcabamento(quad, painel) {
  return molduraDe(quad) === 'codigo'
    || legendasDoPainel(quad, painel).length > 0
    || !!balaoDoPainel(quad, painel)
}

// Onde a ARTE vive dentro do slide acabado. Com moldura por código ela entra recuada, e é
// esse retângulo (não o slide inteiro) que serve de referência pro balão: a posição foi
// arrastada sobre a arte, então é a ela que a fração se refere.
function areaDaArte(quad, dim) {
  if (molduraDe(quad) !== 'codigo') return { x: 0, y: 0, w: dim.w, h: dim.h }
  const g = geometriaDaMoldura(dim)
  return { x: g.x, y: g.y, w: g.w, h: g.h }
}

// Os balões como UMA camada pronta pra compor: { input, top, left } ou null.
function camadaDoBalao(quad, painel, dim) {
  const b = balaoDoPainel(quad, painel)
  if (!b) return null
  const a = areaDaArte(quad, dim)
  const svg = svgDosBaloes({ W: a.w, H: a.h, falas: b.falas, fonte: b.fonte })
  return svg ? { input: Buffer.from(svg), top: a.y, left: a.x } : null
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

  // O BALÃO vem ANTES da legenda: a caixa de legenda mora na base do painel e o balão no
  // alto, mas quando os dois se encostam quem tem que ficar por cima é a legenda, que é a
  // camada de leitura do carrossel.
  const balao = camadaDoBalao(quad, painel, dim)
  if (balao) {
    const png = await sharp(outAbs).composite([balao]).png().toBuffer()
    await fs.writeFile(outAbs, png)
  }

  const textos = legendasDoPainel(quad, painel)
  if (textos.length) await desenharLegendas({ baseAbs: outAbs, textos })
  return { abs: outAbs, moldura: molduraDe(quad), legendas: textos.length, balao: !!balao }
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
  // ordem de empilhamento, de baixo pra cima: balão (sobre a arte), moldura (recorta as
  // bordas) e legenda (a camada de leitura, sempre por cima)
  const camadas = []
  const balao = camadaDoBalao(quad, painel, dim)
  if (balao) camadas.push(balao)
  if (molduraDe(quad) === 'codigo') camadas.push({ input: Buffer.from(mobiliaSVG(dim)), top: 0, left: 0 })
  const { svg } = svgDasLegendas({ W: dim.w, H: dim.h, textos: legendasDoPainel(quad, painel) })
  if (svg) camadas.push({ input: Buffer.from(svg), top: 0, left: 0 })
  if (!camadas.length) return null

  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp({ create: { width: dim.w, height: dim.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(camadas)
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
