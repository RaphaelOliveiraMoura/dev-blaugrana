// A MOLDURA do painel, redesenhada POR CÓDIGO no export.
//
// POR QUE EXISTE: a moldura é geometria pura (retângulo arredondado + margem + selo), e
// geometria não deveria depender de sorteio. Medido em 05/08/2026 no o-dia-pedri: a margem
// variava de 4,9% a 7,1% da largura entre painéis do MESMO quadrinho, dois painéis noturnos
// inventaram um passe-partout colorido (rosa e cinza) que resistiu a duas rodadas de regra
// no prompt, e o selo da estrela ia de 4% a 16% de diâmetro. Nada disso é arte: é acabamento.
//
// O QUE ELE FAZ: acha a linha preta que o modelo desenhou, recorta SÓ a arte de dentro dela,
// e remonta o painel com margem, espessura, raio e selo idênticos em todos. O que o modelo
// desenhou fora da linha (margem torta, faixa colorida, selo fora de escala) é descartado.
//
// OS NÚMEROS SAEM DA PRÓPRIA IA: são a média dos painéis consistentes do o-dia-pedri
// (1 a 4), pra moldura por código ficar igual à que já foi aprovada, não a uma inventada.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const CREME = '#f4ead3'
const TINTA = '#1a1a1a'
const OURO = '#f2b33a'

export const P = {
  margem: 0.050,     // papel creme entre a linha preta e a borda da imagem
  linha: 0.0065,     // espessura da linha preta
  raio: 0.018,       // raio do canto arredondado
  seloDiam: 0.082,   // diâmetro do selo (o disco creme; a estrela dentro é menor)
  seloDir: 0.115,    // centro do selo, medido da borda DIREITA
  seloTopo: 0.086,   // centro do selo, medido do TOPO (fração da ALTURA)
  // Teto pra espessura da linha detectada: em painel de fundo escuro a arte encosta na
  // linha e a varredura continuaria comendo o desenho. Acima disto, assume a espessura padrão.
  tetoLinha: 0.02,
  // Margem creme MÍNIMA pra aceitar que a arte veio com moldura desenhada. Calibrado medindo
  // o acervo inteiro em 10/08/2026: as molduras reais vão de 7px a 54px numa largura de 1152
  // (0,6% a 4,7%), e o falso positivo da arte sangrada dá SEMPRE 0 ou 1. O limiar fica no vão
  // entre os dois grupos, e de propósito perto do piso: 1,2% parecia seguro e matava 22
  // painéis de moldura fina de verdade. Ver acharArte.
  margemMin: 0.004,
}

// A razão (largura/altura) da área INTERNA da moldura, que é o que a arte precisa ter pra
// preencher sem sobrar creme por dentro E sem ser cortada. Ela NÃO é a razão do post: a
// margem e a linha comem o mesmo número de pixels em cima e nos lados, então um post 3:4
// (0,750) tem área interna 0,727.
export function razaoInterna(dimPost) {
  const m = Math.round(dimPost.w * P.margem)
  const l = Math.max(2, Math.round(dimPost.w * P.linha))
  return (dimPost.w - 2 * (m + l)) / (dimPost.h - 2 * (m + l))
}

// ONDE A ARTE POUSA num slide de tamanho `dim`, com a espessura e o raio da casa. Sai daqui
// pro slide (que cola a arte) e pro vídeo (que escala o clipe até esta caixa), pra moldura
// dos dois nascer da mesma conta.
export function geometriaDaMoldura(dim) {
  const W = dim.w, H = dim.h
  const margem = Math.round(W * P.margem)
  const linha = Math.max(2, Math.round(W * P.linha))
  const raio = Math.round(W * P.raio)
  const x = margem + linha, y = margem + linha
  return { W, H, margem, linha, raio, x, y, w: W - 2 * x, h: H - 2 * y }
}

// A dimensão em que a ARTE deve ser gerada quando a moldura é desenhada por código: mesma
// largura de sempre, altura esticada até a razão interna. Sem isto o `cover` do enquadrar
// corta 3,1% da largura de toda arte — pouco, mas é arte paga que vai pro lixo.
export function dimArteSangrada(dimPainel, dimPost) {
  return { w: dimPainel.w, h: Math.round(dimPainel.w / razaoInterna(dimPost)) }
}

// Onde está a arte dentro do painel: procura a linha preta a partir das quatro bordas e
// devolve o retângulo INTERNO (só o desenho, sem linha e sem margem).
export async function acharArte(abs) {
  const { data, info } = await sharp(abs).raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels: ch } = info
  const escuro = (x, y) => {
    const i = (y * W + x) * ch
    return (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) < 110
  }
  const teto = Math.round(W * P.tetoLinha)
  const padrao = Math.max(2, Math.round(W * P.linha))
  const margemMin = Math.round(W * P.margemMin)
  // caminha até a linha, depois atravessa a linha; se a "linha" for grossa demais é arte escura
  //
  // A margem creme ANTES da linha é o que prova que existe moldura desenhada. Sem esta
  // exigência, arte sangrada de fundo escuro (todo painel noturno) tinha o PRIMEIRO pixel da
  // borda já escuro, a varredura devolvia a espessura padrão e o módulo concluía que havia
  // moldura. Duas consequências silenciosas: uma faixa da arte era recortada fora, e o selo
  // da casa deixava de ser desenhado (ele só entra quando a arte nasceu sangrada). Medido em
  // 10/08/2026: 27 dos 157 painéis do acervo caíam nisso, o o-dia-abidal inteiro entre eles.
  const varrer = (passo, limite) => {
    let i = 0
    while (i < limite && !escuro(...passo(i))) i++      // margem
    if (i >= limite) return null
    if (i < margemMin) return null                      // borda já escura: não é moldura, é arte
    let e = 0
    while (i + e < limite && escuro(...passo(i + e))) e++ // linha
    return i + (e > teto ? padrao : e)
  }
  const cy = Math.round(H / 2), cx = Math.round(W / 2)
  const lim = Math.round(Math.min(W, H) * 0.3)
  const esq = varrer((i) => [i, cy], lim)
  const dir = varrer((i) => [W - 1 - i, cy], lim)
  const topo = varrer((i) => [cx, i], lim)
  const base = varrer((i) => [cx, H - 1 - i], lim)
  if ([esq, dir, topo, base].some((v) => v === null)) return null
  return { left: esq, top: topo, width: W - esq - dir, height: H - topo - base }
}

// O selo da casa: disco creme com anel preto e uma estrela dourada. Desenhado aqui porque
// a IA variava o diâmetro de 4% a 16% e às vezes o cortava na borda.
function seloSVG(cx, cy, d, linha) {
  const r = d / 2
  const rs = r * 0.58 // a estrela dentro do disco
  const pts = Array.from({ length: 10 }, (_, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    const raio = i % 2 === 0 ? rs : rs * 0.44
    return `${(cx + Math.cos(ang) * raio).toFixed(1)},${(cy + Math.sin(ang) * raio).toFixed(1)}`
  }).join(' ')
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREME}" stroke="${TINTA}" stroke-width="${linha}"/>`
    + `<polygon points="${pts}" fill="${OURO}" stroke="${TINTA}" stroke-width="${(linha * 0.55).toFixed(1)}" stroke-linejoin="round"/>`
}

// retângulo de cantos arredondados como PATH (o `rx` do <rect> não serve aqui: pra virar
// buraco ele precisa ser um subpath dentro do mesmo path do creme)
function pathArredondado(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  return `M${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}`
    + `V${y + h - rr}A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}`
    + `H${x + rr}A${rr},${rr} 0 0 1 ${x},${y + h - rr}`
    + `V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}Z`
}

// A MOLDURA SOZINHA, sem a arte: o creme de fora (com o buraco arredondado por onde a arte
// aparece), a linha preta e o selo. Tudo transparente dentro do buraco.
//
// Existe separada porque o VÍDEO precisa da mesma moldura por cima de um clipe em movimento,
// e lá não há PNG pra recortar e remontar — o que dá pra fazer é sobrepor este desenho. Ao
// sair daqui nos dois casos, a moldura do vídeo não tem como divergir da do slide.
export function mobiliaSVG(dim, { comSelo = true } = {}) {
  const g = geometriaDaMoldura(dim)
  const { W, H, margem: m, linha, raio } = g
  const meia = linha / 2
  const selo = comSelo
    ? seloSVG(W - Math.round(W * P.seloDir), Math.round(H * P.seloTopo), Math.round(W * P.seloDiam), linha)
    : ''
  // evenodd: o retângulo da imagem inteira menos o retângulo interno = só a margem fica creme
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" fill="${CREME}" d="M0,0H${W}V${H}H0Z ${pathArredondado(g.x, g.y, g.w, g.h, Math.max(0, raio - linha))}"/>
  <rect x="${m + meia}" y="${m + meia}" width="${W - 2 * m - linha}" height="${H - 2 * m - linha}"
        rx="${raio}" ry="${raio}" fill="none" stroke="${TINTA}" stroke-width="${linha}"/>
  ${selo}
</svg>`
}

// Remonta o painel com a moldura da casa. `dim` é o tamanho final do slide.
export async function enquadrar({ baseAbs, dim, outAbs, comSelo = null }) {
  // Arte SANGRADA (sem moldura desenhada) é o caso normal quando o quadrinho usa moldura
  // por código: o prompt manda o desenho ocupar a imagem inteira. Aí não há o que recortar.
  const meta = await sharp(baseAbs).metadata()
  const achada = await acharArte(baseAbs)
  const arte = achada || { left: 0, top: 0, width: meta.width, height: meta.height }
  // Arte ANTIGA (gerada com moldura) já traz o selo DENTRO do quadro, e o recorte o preserva:
  // desenhar outro por cima deixa dois selos sobrepostos, que foi o que a primeira versão fez.
  // Sem escolha explícita, o selo só é desenhado quando a arte nasceu sangrada.
  const desenharSelo = comSelo === null ? !achada : comSelo

  const g = geometriaDaMoldura(dim)

  // a arte PREENCHE a área interna (cobre e corta o excesso): sobra creme dentro da moldura
  // seria uma segunda margem, exatamente o defeito que este módulo existe pra matar. Ela
  // entra INTEIRA e quadrada; quem arredonda o canto é o creme da mobília, por cima.
  const recorte = await sharp(baseAbs).extract(arte).resize(g.w, g.h, { fit: 'cover' }).png().toBuffer()
  const mobilia = Buffer.from(mobiliaSVG(dim, { comSelo: desenharSelo }))

  const png = await sharp({ create: { width: g.W, height: g.H, channels: 3, background: CREME } })
    .composite([{ input: recorte, top: g.y, left: g.x }, { input: mobilia, top: 0, left: 0 }])
    .png().toBuffer()
  fs.mkdirSync(path.dirname(outAbs), { recursive: true })
  fs.writeFileSync(outAbs, png)
  return { arte, margem: g.margem, linha: g.linha, raio: g.raio }
}
