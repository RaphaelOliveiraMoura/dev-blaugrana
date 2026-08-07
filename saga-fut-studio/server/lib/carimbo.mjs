// O CARIMBO DE PROGRESSO ("3/8") num slide de carrossel, desenhado POR CÓDIGO.
//
// Por que existe: a numeração de progresso é o que segura quem está no meio do carrossel
// ("falta pouco") e reduz abandono — está medido na Parte 6 do docs/PESQUISA-VIRALIZACAO.md.
// Pedir o número à IA no prompt do painel seria pedir pra ela errar: número desenhado sai
// torto, sai em fonte diferente a cada painel, e o "3/8" do painel 3 pode virar "3/6".
// Aqui ele sai exato, idêntico em todos os slides, e de graça.
//
// Onde entra: no EXPORT do carrossel (routes/render.mjs, /montar-imagem com carrossel),
// depois de normalizar cada slide. É de propósito no export e não na arte: a arte do painel
// continua limpa e reaproveitável (o mesmo painel vira story, vídeo e print sem número
// grudado), e quem exporta carrossel não tem como esquecer o carimbo — não existe botão
// pra errar. Quem quiser sem número declara `carimbo: false` na request.
//
// A técnica é a mesma do balão (lib/balao.mjs): SVG composto por cima com sharp e o texto
// VETORIZADO pela opentype, então não depende de o sistema achar a fonte pelo nome.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { carregarFonte, limparNaN } from './balao.mjs'

// Os quatro cantos, em fração da imagem.
export const CANTOS = {
  'inferior-direito': { ax: 1, ay: 1 },
  'inferior-esquerdo': { ax: 0, ay: 1 },
  'superior-direito': { ax: 1, ay: 0 },
  'superior-esquerdo': { ax: 0, ay: 0 },
}
// O padrão é o SUPERIOR ESQUERDO: no layout da casa o selo da estrela mora no superior
// direito e as caixas de legenda na base, então sobra este. Trocável por request.
export const CANTO_PADRAO = 'superior-esquerdo'

const CREME = '#f4ead3' // o creme das caixas de legenda da casa
const TINTA = '#1a1a1a'

// A CAIXA que o carimbo ocupa num dado canto, em pixels.
function caixaDoCarimbo(W, H, canto) {
  const { ax, ay } = CANTOS[canto] || CANTOS[CANTO_PADRAO]
  const fontSize = Math.round(W * 0.042)
  const margem = Math.round(W * 0.035)
  // largura estimada por "N/N": o dígito a mais muda pouco e a caixa de medição
  // não precisa ser exata, só cobrir a região
  const w = Math.round(fontSize * 3.2)
  const h = Math.round(fontSize * 1.16 + Math.round(fontSize * 0.34) * 2)
  return {
    left: Math.round(ax === 1 ? W - margem - w : margem),
    top: Math.round(ay === 1 ? H - margem - h : margem),
    width: w,
    height: h,
    fontSize,
    margem,
  }
}

// POR QUE FLUTUANDO, E NÃO NUMA FAIXA RESERVADA: reservar uma tira de rodapé pro número
// resolve a colisão por construção, mas cria uma borda que o Raphael reprovou olhando
// (04/08/2026) — o slide fica com cara de moldura, e o quadrinho encolhe. Então o carimbo
// é adesivo: pousa por cima da arte, no canto, com pílula creme e contorno preto pra ficar
// legível tanto em céu claro quanto em museu escuro.
//
// Procurar "o canto mais vazio" por medição de pixel também foi tentado e descartado: em
// arte que ocupa a página inteira os quatro cantos dão nota parecida, a diferença vira
// ruído, e a escolha caiu em cima da legenda num quadrinho e do selo no outro. Canto fixo
// e previsível (e trocável na mão) entrega mais que heurística que erra sozinha.

// Carimba <indice>/<total> num slide JÁ pronto. Escreve por cima do próprio arquivo
// (o slide é derivado da arte, não é original), ou em `saida` se for passado.
// Devolve { texto, x, y, w, h } com a caixa desenhada, ou null quando não carimba.
export async function carimbarProgresso({ abs, indice, total, canto = CANTO_PADRAO, saida = null }) {
  // carrossel de um slide só não tem progresso pra mostrar: "1/1" é ruído
  if (!Number.isInteger(indice) || !Number.isInteger(total) || total < 2) return null
  const { ax, ay } = CANTOS[canto] || CANTOS[CANTO_PADRAO]

  const meta = await sharp(abs).metadata()
  const W = meta.width, H = meta.height
  const texto = `${indice}/${total}`

  // tudo derivado da largura, pra ficar igual em qualquer formato de post (4:5, 1:1, 9:16)
  const { fontSize, margem } = caixaDoCarimbo(W, H, canto)
  const padX = Math.round(fontSize * 0.62)
  const padY = Math.round(fontSize * 0.34)

  const f = carregarFonte('bradley')
  const textoW = f.getAdvanceWidth(texto, fontSize)
  const cxW = Math.round(textoW + padX * 2)
  const cxH = Math.round(fontSize * 1.16 + padY * 2)

  const x = Math.round(ax === 1 ? W - margem - cxW : margem)
  const y = Math.round(ay === 1 ? H - margem - cxH : margem)
  const r = Math.round(cxH * 0.34)
  // baseline: a fonte manuscrita sobe pouco, então centraliza pelo corpo do glifo
  const baseline = y + padY + fontSize * 0.84
  // limparNaN NÃO é opcional: o opentype cospe NaN em certos glifos e um só NaN faz o
  // renderizador abortar o path inteiro. Sem isto o '2/6' do slide 2 saiu como um traço.
  const d = limparNaN(f.getPath(texto, x + (cxW - textoW) / 2, baseline, fontSize).toPathData(2))

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x}" y="${y}" width="${cxW}" height="${cxH}" rx="${r}" ry="${r}"
        fill="${CREME}" stroke="${TINTA}" stroke-width="${Math.max(3, Math.round(W * 0.005))}"/>
  <path d="${d}" fill="${TINTA}"/>
</svg>`

  // buffer no meio do caminho: ler e escrever o MESMO arquivo direto pelo sharp corrompe
  const png = await sharp(abs).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer()
  fs.writeFileSync(saida || abs, png)
  return { texto, x, y, w: cxW, h: cxH }
}

// A MESMA sequência, mas em CÓPIAS numa pasta de trabalho, devolvendo o que usar no lugar
// dos originais. É o que o VÍDEO precisa: no carrossel o slide já é um derivado e pode
// receber o carimbo por cima, mas o vídeo monta a partir da arte do painel, e essa arte é
// original — carimbar nela grudaria o "2/5" no PNG que também vira story, mosaico e print.
//
// Por que o vídeo carimba: é o MESMO post noutro formato. Sem o número, o painel 2 de 5 lê
// como o fim do quadrinho e a pessoa sai antes da virada; é a mesma retenção que o carimbo
// do carrossel compra (docs/PESQUISA-VIRALIZACAO.md, Parte 6). E aqui ele não pode ficar
// como opção esquecível: entra por construção em quem monta vídeo de painéis.
//
// O carimbo é dimensionado em fração da LARGURA da arte, e a arte ocupa a largura inteira
// do 9:16 (o `decrease` do segmento sempre bate na largura), então ele sai do mesmo tamanho
// relativo que sai no slide do carrossel.
//
// Devolve { usar, carimbo }: `usar` são os caminhos na ordem de entrada (a cópia carimbada,
// ou o próprio original quando não há o que carimbar) e `carimbo` é o resumo pra resposta.
export async function carimbarCopias({ pngs, dir, canto = CANTO_PADRAO }) {
  const total = pngs.length
  // painel sozinho não tem progresso: "1/1" é ruído, e o vídeo de um painel só é um post
  // isolado — carimbar "3/8" nele seria mentir sobre um carrossel que não está ali
  if (total < 2) return { usar: [...pngs], carimbo: null }

  const usar = []
  for (const [i, src] of pngs.entries()) {
    const saida = path.join(dir, `carimbo-${i + 1}.png`)
    const marca = await carimbarProgresso({ abs: src, indice: i + 1, total, canto, saida })
    usar.push(marca ? saida : src)
  }
  return { usar, carimbo: { total, canto } }
}
