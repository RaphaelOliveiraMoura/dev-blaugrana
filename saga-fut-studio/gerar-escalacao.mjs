// Gera um CARD DE ESCALACAO por CODIGO (nao por IA), pra ter consistencia total e
// texto perfeito em posts recorrentes de pre-jogo. Os ROSTOS vem das fichas rabisco
// que ja existem (recortados em tokens); o campo, o cabecalho, os nomes, o adversario
// e a data/hora sao renderizados por codigo. Trocar de jogo = trocar o objeto JOGO.
//
//   node gerar-escalacao.mjs            # usa o JOGO de teste abaixo
//
// Saida: quadrinhos/<id>/_escalacao-template.png
import path from 'node:path'
import { avatarImagem, baseImagem } from './shared/personagem.mjs'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { CONTEUDO_DIR } from './server/config.mjs'
import { readDados, writeDados } from './server/store.mjs'

// ---------------------------------------------------------------- DADOS DO JOGO
// Tudo que muda de um jogo pro outro vive aqui. O resto e template fixo.
const JOGO = {
  saidaRel: 'quadrinhos/barca-escalado/_escalacao-template.png',
  titulo: 'ESCALAÇÃO BARÇA 26/27',
  // linha de jogo (a parte que a IA nao fazia bem): adversario + competicao + data/hora
  adversario: 'NOTTINGHAM FOREST',
  // MANDO DE CAMPO: 'casa' (BARCELONA x adversario) ou 'fora' (adversario x BARCELONA).
  // Quem joga em casa vem PRIMEIRO no confronto, e a ordem sai daqui, nao de escrever o
  // titulo na mao: e assim que se le em qualquer tabela, e escrever ao contrario faz o
  // card dizer que o jogo era no Barca.
  // ESTE JOGO E EM CAMPO NEUTRO (Bluenergy Stadium, Udine, num triangular com o Udinese
  // de casa), entao nao existe mandante pra regra proteger: a ordem vira escolha editorial
  // e fica 'casa' pra ler como o site do proprio clube lista. Se um dia o gerador ganhar
  // um 'neutro', e este o caso que ele descreve.
  mando: 'casa',
  competicao: 'FRIULI VENEZIA GIULIA CUP',
  dataHora: '08/08 · 16h',
  // carimbo de borracha diagonal sobre o gramado: diz de que natureza e a escalacao
  // (PROVÁVEL quando e palpite, OFICIAL quando o clube ja divulgou). String vazia
  // (ou ausente) some com o carimbo.
  carimbo: 'PROVÁVEL',
  // formacao por linhas, de tras pra frente. cada jogador: ficha (id), num, nome (com acento livre)
  // 4-2-3-1 PROVAVEL do jogo contra o Nottingham Forest (triangular de Udine, 08/08/2026),
  // com os mesmos onze em Lance, Eurosport e bet365. Segue o time dos garotos do amistoso
  // anterior; De Jong esta fora por 4 meses (ligamento) e Raphinha lesionado.
  // Numeros conferidos na sumula do Birmingham (31/07, BeSoccer).
  // O `pos` de cada jogador manda no LADO em que ele aparece (ver LADO_DA_POS): a ordem
  // em que voce escreve aqui NAO importa. A defesa repete lado a lado o que a ESPN publicou
  // no jogo anterior (Espart direita, Christensen zaga direita, G. Martin zaga esquerda,
  // Jofre esquerda), leitura que o Sports Mole confirma no XI previsto deste jogo.
  //
  // CINCO LINHAS e o limite do template: token (178) + plaquinha (46) pede 224px de gap e
  // a area util tem 1101. Os y abaixo foram calculados, nao estimados, pra distribuir a
  // sobra igualmente; nao mexa num sem refazer a conta dos outros.
  linhas: [
    { y: 0.947, jogadores: [{ id: 'szczesny-riso', num: 25, nome: 'SZCZESNY', pos: 'GOL' }] },
    { y: 0.732, jogadores: [
      { id: 'espart-riso', num: 12, nome: 'ESPART', pos: 'LD' },
      { id: 'christensen-riso', num: 15, nome: 'CHRISTENSEN', pos: 'ZD' },
      { id: 'gerard-martin-riso', num: 18, nome: 'G. MARTÍN', pos: 'ZE' },
      { id: 'jofre-riso', num: 21, nome: 'JOFRE', pos: 'LE' },
    ] },
    { y: 0.517, jogadores: [
      // Duplo pivo. O lado dos dois NAO saiu em fonte nenhuma: Bernal fica na direita, o
      // mesmo lado em que ele apareceu no card do Birmingham.
      { id: 'casado-riso', num: 17, nome: 'CASADÓ', pos: 'ME' },
      { id: 'bernal-riso', num: 22, nome: 'BERNAL', pos: 'MD' },
    ] },
    { y: 0.303, jogadores: [
      { id: 'tunkara-riso', num: 20, nome: 'TUNKARA', pos: 'MEE' },
      { id: 'kluivert-riso', num: 24, nome: 'KLUIVERT', pos: 'SA' },
      { id: 'adeyemi-riso', num: 14, nome: 'ADEYEMI', pos: 'MED' },
    ] },
    { y: 0.088, jogadores: [
      // Adeyemi entrou com o 14: a LaLiga so libera 1 a 25 pro elenco principal e o 27
      // que ele pediu (o do Dortmund) nao passa. Kluivert com o 24, nao com o 9 do pai.
      { id: 'abdelkarim-riso', num: 9, nome: 'ABDELKARIM', pos: 'CA' },
    ] },
  ],
}

// ---------------------------------------------------------------- LADO DE CADA POSICAO
// De que lado da TELA cada posicao aparece. Peso negativo = esquerda da imagem.
//
// A convencao e a mesma de qualquer card de escalacao (ESPN, Sofascore, FotMob): o campo
// e visto de tras do gol do PROPRIO time, entao o lado DIREITO do time cai na DIREITA da
// imagem. Lateral-direito a direita, ponta-direita a direita.
//
// Isto existe porque a ordem do array nao carrega essa informacao: escrevendo "LD, ZAG,
// ZAG, LE" da esquerda pra direita sai o time ESPELHADO, e nada acusa. Card espelhado
// passa em qualquer conferencia de nome e numero. Agora o lado e DADO, nao ordem de
// digitacao: cada jogador declara `pos` e o gerador ordena a linha sozinho.
const LADO_DA_POS = {
  GOL: 0,
  LE: -2, ZE: -1, ZAG: 0, ZD: 1, LD: 2,           // defesa
  ME: -1, VOL: 0, MEI: 0, MD: 1,                   // meio
  PE: -2, MEE: -1, CA: 0, SA: 0, MED: 1, PD: 2,    // ataque
}

// ajuste fino de recorte por ficha (quando a heuristica erra):
//   heightK  = fracao da altura do corpo no recorte de busto (default 0.58)
//   widthK   = fracao da largura (default 0.86)
//   topK     = de onde comeca o topo, em fracao da altura (default 0.015)
//   leftBias = desloca o centro horizontal, em fracao da largura (default 0)
const RECORTE = {
  'alvarez-riso':  { leftBias: -0.05 },              // a aranhinha no canto desalinha o trim
  'cucurella-riso': { heightK: 0.60, widthK: 0.98 }, // juba enorme, precisa da largura toda
  'haaland-riso': { heightK: 0.62 },                // mais alto
}

// ---------------------------------------------------------------- TEMA (fixo)
const W = 1152, H = 1536
const HEADER_H = 150, SUB_H = 60, FOOTER_H = 90
const FIELD_TOP = HEADER_H + SUB_H, FIELD_BOT = H - FOOTER_H
const FIELD_H = FIELD_BOT - FIELD_TOP
const TOK_W = 150, TOK_H = 178                 // elipse do token
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const GRASS_A = '#4a7a48', GRASS_B = '#437043', LINE = 'rgba(255,255,255,0.55)'
const PLATE = '#1c1c1c', INK = '#141414', CREAM = '#efe6d3'
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const ROUND = "'Arial Rounded MT Bold', 'SF Pro Rounded', 'Chalkboard SE', sans-serif" // arredondada, imita o traco do barca-escalado

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// CARIMBO de borracha inclinado ("PROVÁVEL"), na moldura dupla classica de carimbo.
// Vai no canto INFERIOR ESQUERDO do gramado, o unico pedaco grande sem token (o goleiro
// fica centralizado). A POSICAO E CALCULADA a partir das linhas (ver vagaDoCarimbo), nao
// fixa: com coordenada fixa ele funcionava no 4-3-3 e atravessava as plaquinhas da zaga
// no 4-2-3-1, porque a quinta linha empurra a defesa justamente pra cima do carimbo, e
// nada acusa isso alem de olhar. O aspecto gasto vem de duas coisas: o filtro de
// turbulencia (que entorta a linha reta e come a tinta) e a opacidade < 1, que deixa o
// gramado atravessar.
// Cor do carimbo: TINTA PRETA. Testado contra creme, branco, dourado, grena e vermelho
// (comparativo em 30/07/2026): o creme e o branco se confundem com as linhas do campo, o
// dourado briga com os aneis dos tokens, o grena e o vermelho somem no verde escuro.
// Trocar por um teste: CARIMBO_COR=#e0a92e node gerar-escalacao.mjs
const CARIMBO = process.env.CARIMBO_COR || '#141414'
const CARIMBO_ANG = -13
// tamanho da moldura do carimbo em corpo cheio (size 58) e o quanto ela ocupa DEPOIS de
// inclinada: um retangulo girado cresce nos dois eixos, e e a caixa girada que precisa
// caber na vaga, nao a reta.
const carimboCaixa = (texto, size = 58) => {
  const k = size / 58
  const w = Math.max(250, 62 + texto.length * 34) * k, h = 116 * k
  const c = Math.abs(Math.cos(CARIMBO_ANG * Math.PI / 180)), s = Math.abs(Math.sin(CARIMBO_ANG * Math.PI / 180))
  return { w, h, extH: w * c + h * s, extV: h * c + w * s }
}
function carimbo(texto, { cx = 318, cy = 1212, ang = CARIMBO_ANG, size = 58 } = {}) {
  if (!texto) return ''
  const k = size / 58
  const { w, h } = carimboCaixa(texto, size)
  const x = cx - w / 2, y = cy - h / 2
  // O "gasto" e leve de proposito: sobre o gramado escuro, comer muita tinta apaga o
  // carimbo (foi o que aconteceu na 1a versao, com grao forte e opacidade 0.82).
  // O que sobrou: displacement pequeno (entorta a reta) + falhas ralas + opacidade alta.
  return `<defs>
      <filter id="carimboGasto" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.026" numOctaves="3" seed="19" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="4" result="grao"/>
        <feColorMatrix in="grao" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.45 0.99" result="mask"/>
        <feComposite in="d" in2="mask" operator="in"/>
      </filter>
    </defs>
    <g transform="rotate(${ang} ${cx} ${cy})" opacity="0.95" filter="url(#carimboGasto)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${12 * k}" fill="none" stroke="${CARIMBO}" stroke-width="${11 * k}"/>
      <rect x="${x + 16 * k}" y="${y + 16 * k}" width="${w - 32 * k}" height="${h - 32 * k}" rx="${7 * k}" fill="none" stroke="${CARIMBO}" stroke-width="${4 * k}"/>
      <text x="${cx}" y="${cy + size * 0.36}" text-anchor="middle" font-family="'Marker Felt', ${ROUND}" font-size="${size}" font-weight="bold" fill="${CARIMBO}" letter-spacing="2">${esc(texto)}</text>
    </g>`
}

// estrela de 5 pontas em path
function star(cx, cy, rO, rI) {
  let p = ''
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rI : rO
    const a = -Math.PI / 2 + i * Math.PI / 5
    p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)
  }
  return p + 'Z'
}

// remove o fundo papel da ficha por FLOOD-FILL a partir das bordas (so tira o fundo
// externo conectado as bordas; preserva branco interno como a camisa do Cucurella/Gordon).
function removerFundo(data, w, h) {
  // cor de fundo = media dos 4 cantos
  const amostra = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]].map(([x,y]) => (y*w+x)*4)
  let br=0,bg=0,bb=0
  for (const i of amostra) { br+=data[i]; bg+=data[i+1]; bb+=data[i+2] }
  br/=4; bg/=4; bb/=4
  const THR = 62*62 // distancia^2 de cor tolerada como "fundo"
  const perto = (i) => { const dr=data[i]-br, dg=data[i+1]-bg, db=data[i+2]-bb; return dr*dr+dg*dg+db*db < THR }
  const visited = new Uint8Array(w*h)
  const stack = []
  for (let x=0;x<w;x++){ stack.push(x, (h-1)*w+x) }
  for (let y=0;y<h;y++){ stack.push(y*w, y*w+w-1) }
  while (stack.length) {
    const p = stack.pop()
    if (visited[p]) continue
    visited[p] = 1
    if (!perto(p*4)) continue
    data[p*4+3] = 0 // transparente
    const x=p%w, y=(p/w)|0
    if (x>0) stack.push(p-1)
    if (x<w-1) stack.push(p+1)
    if (y>0) stack.push(p-w)
    if (y<h-1) stack.push(p+w)
  }
}

// monta o token: disco de fundo (cor da casa) + BUSTO do jogador SEM o fundo,
// recortado numa elipse. Prefere o AVATAR (busto desenhado sob medida, natural);
// se nao houver, cai no recorte da ficha full-body (fallback).
async function recortarBusto(fichaAbs, id, jogador) {
  const cfg = RECORTE[id] || {}
  const avatarAbs = path.join(CONTEUDO_DIR, avatarImagem(id))
  let temAvatar = false
  try { await fs.access(avatarAbs); temAvatar = true } catch {}

  let raw
  if (temAvatar) {
    // avatar ja e um busto bem enquadrado com fundo chapado -> so ajusta ao token
    raw = await sharp(avatarAbs)
      .resize(TOK_W, TOK_H, { fit: 'cover', position: 'top' })
      .ensureAlpha().raw().toBuffer()
  } else {
    const heightK = jogador.heightK ?? cfg.heightK ?? 0.60
    const widthK = jogador.widthK ?? cfg.widthK ?? 0.90
    const topK = jogador.headTop ?? cfg.topK ?? 0.015
    const leftBias = jogador.headLeftBias ?? cfg.leftBias ?? 0
    let corpo
    try { corpo = await sharp(fichaAbs).trim({ threshold: 28 }).toBuffer({ resolveWithObject: true }) } catch { corpo = null }
    const src = corpo ? sharp(corpo.data) : sharp(fichaAbs)
    const m = await src.metadata()
    const bw = m.width, bh = m.height
    const cropH = Math.min(bh, Math.round(bh * heightK))
    const cropW = Math.min(bw, Math.round(bw * widthK))
    const left = Math.min(Math.max(0, Math.round((bw - cropW) / 2 + leftBias * bw)), Math.max(0, bw - cropW))
    const top = Math.max(0, Math.round(bh * topK))
    raw = await src.clone()
      .extract({ left, top, width: cropW, height: Math.min(cropH, bh - top) })
      .resize(TOK_W, TOK_H, { fit: 'cover', position: 'top' })
      .ensureAlpha().raw().toBuffer()
  }
  // tira o fundo (papel da ficha OU o magenta chapado do avatar) por flood-fill
  removerFundo(raw, TOK_W, TOK_H)
  const bustoPng = await sharp(raw, { raw: { width: TOK_W, height: TOK_H, channels: 4 } }).png().toBuffer()
  // 4) disco de fundo (gradiente da casa) + busto por cima + mascara eliptica
  const disco = Buffer.from(`<svg width="${TOK_W}" height="${TOK_H}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="50%" cy="34%" r="80%">
      <stop offset="0%" stop-color="#4a3040"/><stop offset="60%" stop-color="#3a2436"/><stop offset="100%" stop-color="#221826"/>
    </radialGradient></defs>
    <ellipse cx="${TOK_W/2}" cy="${TOK_H/2}" rx="${TOK_W/2}" ry="${TOK_H/2}" fill="url(#g)"/></svg>`)
  const mask = Buffer.from(
    `<svg width="${TOK_W}" height="${TOK_H}"><ellipse cx="${TOK_W/2}" cy="${TOK_H/2}" rx="${TOK_W/2}" ry="${TOK_H/2}" fill="#fff"/></svg>`
  )
  return sharp(disco)
    .composite([{ input: bustoPng, top: 0, left: 0 }, { input: mask, blend: 'dest-in' }])
    .png().toBuffer()
}

// distribui N centros de x na largura util
function centrosX(n) {
  const marg = 34, usable = W - 2 * marg
  return Array.from({ length: n }, (_, i) => Math.round(marg + (i + 0.5) * usable / n))
}

async function main() {
  // ---- base primaria: FUNDO PRONTO (campo + header + footer + moldura, desenhado pela IA, VAZIO).
  // O codigo so compoe os tokens e o TEXTO por cima. Se nao existir, cai no campo rabisco / SVG.
  const FUNDO = process.env.FUNDO || 'fundo-escalacao.png'
  const fundoAbs = path.join(CONTEUDO_DIR, 'assets', FUNDO)
  let temFundoPronto = false
  try { await fs.access(fundoAbs); temFundoPronto = true } catch {}
  // ---- fallback: campo rabisco recortado na area do campo
  const campoAbs = path.join(CONTEUDO_DIR, 'assets', process.env.CAMPO || 'campo-rabisco.png')
  let temCampo = false
  if (!temFundoPronto) { try { await fs.access(campoAbs); temCampo = true } catch {} }
  // area de jogo (onde vao os tokens). No fundo pronto o gramado fica entre a arquibancada e o footer.
  const fieldTop = temFundoPronto ? 322 : FIELD_TOP
  const fieldBot = temFundoPronto ? 1334 : FIELD_BOT
  const fieldH = fieldBot - fieldTop
  const midY = fieldTop + fieldH / 2
  const desenhaCampoSvg = !temFundoPronto && !temCampo
  const stripes = !desenhaCampoSvg ? '' : Array.from({ length: 8 }, (_, i) =>
    `<rect x="0" y="${(fieldTop + i * fieldH / 8).toFixed(1)}" width="${W}" height="${(fieldH / 8).toFixed(1)}" fill="${i % 2 ? GRASS_B : GRASS_A}"/>`
  ).join('')
  const linhasSvg = !desenhaCampoSvg ? '' : `<g fill="none" stroke="${LINE}" stroke-width="4">
      <rect x="46" y="${fieldTop + 16}" width="${W - 92}" height="${fieldH - 32}"/>
      <line x1="46" y1="${midY}" x2="${W - 46}" y2="${midY}"/>
      <circle cx="${W/2}" cy="${midY}" r="120"/>
      <rect x="${W/2 - 220}" y="${fieldBot - 16 - 150}" width="440" height="150"/>
      <rect x="${W/2 - 110}" y="${fieldBot - 16 - 60}" width="220" height="60"/>
      <rect x="${W/2 - 220}" y="${fieldTop + 16}" width="440" height="150"/>
    </g>`
  // ---- chrome (header + linha de jogo + footer); default 'rabisco' (imita o barca-escalado)
  const CHROME = process.env.CHROME || 'rabisco'
  const HANDLE = JOGO.handle || '@devblaugrana'
  const bodyFont = CHROME === 'rabisco' ? ROUND : FONT // fonte das plaquinhas/numeros combina com o header
  // O CONFRONTO, sempre com o MANDANTE na frente (ver `mando` la em cima). Uma funcao so,
  // usada pelo header, pela linha de jogo e pelo texto do post, pra nao existir um lugar
  // onde a ordem possa sair diferente do outro.
  const confronto = (barca, sep = 'x') => {
    const par = JOGO.mando === 'casa' ? [barca, JOGO.adversario] : [JOGO.adversario, barca]
    return { texto: `${par[0]} ${sep} ${par[1]}`, casa: par[0], visitante: par[1] }
  }
  const linhaJogo = `${esc(confronto('BARÇA').casa)} <tspan fill="${GOLD}">x</tspan> ${esc(confronto('BARÇA').visitante)}  <tspan fill="${GOLD}">•</tspan>  ${esc(JOGO.competicao)}  <tspan fill="${GOLD}">•</tspan>  ${esc(JOGO.dataHora)}`
  const subFaixa = `<rect x="0" y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${NAVY}"/>
    <text x="${W/2}" y="${HEADER_H + SUB_H/2 + 11}" text-anchor="middle" font-family="${FONT}" font-size="29" font-weight="800" fill="${CREAM}" letter-spacing="1">${linhaJogo}</text>`
  // @devblaugrana sempre no CANTO INFERIOR DIREITO (pedido do Raphael)
  const handleCanto = (fill = GOLD, font = FONT) => `<text x="${W - 40}" y="${H - 26}" text-anchor="end" font-family="${font}" font-size="28" font-weight="800" fill="${fill}" letter-spacing="0.5">${esc(HANDLE)}</text>`

  // SOMENTE TEXTO, posicionado sobre as faixas ja desenhadas no fundo pronto.
  //
  // As coordenadas abaixo foram MEDIDAS no assets/fundo-escalacao.png (varrendo os pixels
  // vermelhos da faixa em 1152x1536), nao estimadas no olho. A versao estimada punha o
  // titulo com a base em 86 quando o centro da faixa e 84: base nao e centro, um texto de
  // corpo 70 nasce ~24px acima do lugar. Se o asset de fundo mudar, remedir.
  const FAIXA_TOPO = { y0: 26, y1: 142, x0: 26, x1: 1124 }   // faixa vermelha do header
  const FAIXA_PE = { y0: 1423, y1: 1510 }                     // faixa vermelha do rodape
  const ESTRELA_X = 1030                                      // onde a estrela dourada comeca
  const meio = (f) => (f.y0 + f.y1) / 2
  // base do texto pra ele ficar CENTRADO na faixa: metade da altura de maiuscula (~0.35em)
  // abaixo do centro, que e o que o olho le como centralizado.
  const baseCentrada = (faixa, corpo) => Math.round(meio(faixa) + corpo * 0.35)

  const chromeTexto = () => {
    const ts = `stroke="${INK}" stroke-width="4" style="paint-order:stroke"`
    const tf = process.env.TFONT || 'Marker Felt'   // fonte do header
    // TITULO = so o confronto. A palavra "ESCALAÇÃO" saiu daqui: o card inteiro e um campo
    // com onze rostos, ninguem precisa da legenda dizendo que aquilo e uma escalacao, e ela
    // roubava a largura que o confronto queria.
    //
    // O CORPO E CALCULADO, nao fixo: sem isso, "BIRMINGHAM x BARCELONA" e "ELCHE x BARÇA"
    // sairiam do mesmo tamanho, e um dos dois ia ficar errado (ou estourando a margem, ou
    // perdido no meio do header). Estima a largura pelo numero de caracteres (o 0.586 saiu
    // medindo o titulo renderizado nesta fonte) e cresce ate encher a largura util.
    //
    // O titulo fica CENTRADO NA FAIXA (centro medido: 575). Quem cede e o corpo, nao a
    // posicao: a estrela dourada do fundo comeca em 1030, entao a metade que o texto pode
    // ocupar de cada lado e limitada por ela, e o corpo cresce so ate encostar nesse limite.
    // Centralizar e descontar a estrela do tamanho e melhor que descentralizar o texto pra
    // caber maior (foi o que se tentou antes, e o titulo ficou visivelmente torto na faixa).
    // O header ficou so pro confronto: competicao e horario desceram pro rodape (canto
    // esquerdo, do lado oposto ao @devblaugrana), que estava vazio.
    const cx = Math.round((FAIXA_TOPO.x0 + FAIXA_TOPO.x1) / 2)
    const maxW = 2 * (ESTRELA_X - 22 - cx)
    const { casa, visitante } = confronto('BARCELONA')
    const nChars = `${casa} x ${visitante}`.length
    const tsz = Number(process.env.TSZ || Math.max(34, Math.min(78, Math.floor(maxW / (nChars * 0.586)))))
    const titulo = `${esc(casa)} <tspan fill="${GOLD}">x</tspan> ${esc(visitante)}`
    const sub = `${esc(JOGO.competicao)}  ·  ${esc(JOGO.dataHora)}`
    const subSz = 30
    return `
      <text x="${cx}" y="${baseCentrada(FAIXA_TOPO, tsz)}" text-anchor="middle" font-family="${tf}" font-size="${tsz}" font-weight="bold" fill="${CREAM}" ${ts} letter-spacing="0.5">${titulo}</text>
      <text x="52" y="${baseCentrada(FAIXA_PE, subSz)}" text-anchor="start" font-family="${tf}" font-size="${subSz}" font-weight="bold" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke" letter-spacing="1.2">${sub}</text>
      <text x="${W - 52}" y="${baseCentrada(FAIXA_PE, 32)}" text-anchor="end" font-family="'Comic Sans MS'" font-size="32" font-weight="bold" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">${esc(HANDLE)}</text>`
  }

  // construtor parametrizado por FONTE, pra testar tipografias mantendo um layout base solido
  const chromeFonte = (o) => {
    const { font, titleSize = 54, upper = false, ls = 1.5, headerFill = GARNET, titleFill = CREAM,
            subFill = NAVY, footFill = GARNET, footFg = CREAM, stars = true, border = GOLD, handleFill = GOLD } = o
    const titulo = upper ? esc(JOGO.titulo.toUpperCase()) : esc(JOGO.titulo)
    const starsSvg = stars
      ? `<path d="${star(64, HEADER_H/2, 19, 8)}" fill="${border}" stroke="${INK}" stroke-width="2"/><path d="${star(W - 64, HEADER_H/2, 19, 8)}" fill="${border}" stroke="${INK}" stroke-width="2"/>`
      : ''
    return `<rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="${headerFill}"/>
      <rect x="0" y="0" width="${W}" height="7" fill="${border}"/>
      <rect x="0" y="${HEADER_H - 5}" width="${W}" height="5" fill="${border}"/>
      ${starsSvg}
      <text x="${W/2}" y="${HEADER_H/2 + titleSize*0.35}" text-anchor="middle" font-family="${font}" font-size="${titleSize}" font-weight="bold" fill="${titleFill}" letter-spacing="${ls}">${titulo}</text>
      <rect x="0" y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${subFill}"/>
      <text x="${W/2}" y="${HEADER_H + SUB_H/2 + 11}" text-anchor="middle" font-family="${font}" font-size="28" font-weight="bold" fill="${CREAM}" letter-spacing="1">${linhaJogo}</text>
      <rect x="0" y="${H - 74}" width="${W}" height="74" fill="${footFill}"/>
      <rect x="0" y="${H - 74}" width="${W}" height="5" fill="${border}"/>
      <text x="44" y="${H - 28}" text-anchor="start" font-family="${font}" font-size="36" font-weight="bold" fill="${footFg}" letter-spacing="1">SAGA FUT</text>
      ${handleCanto(handleFill, font)}`
  }

  function chrome(v) {
    if (v === 'rabisco') { // como o barca-escalado: faixas de BORDA A BORDA, traco DESENHADO (nao-linear), bordas RETAS
      const ts = `stroke="${INK}" stroke-width="4" style="paint-order:stroke"`
      // filtro que distorce levemente as linhas retas -> aspecto de traco a mao (so nas FORMAS, nao no texto)
      const rough = `<defs><filter id="rough" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="2" seed="7" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G"/>
        </filter></defs>`
      return `${rough}
        <g filter="url(#rough)">
          <rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="${GARNET}"/>
          <rect x="0" y="${HEADER_H - 7}" width="${W}" height="7" fill="${INK}"/>
          <rect x="0" y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${NAVY}"/>
          <rect x="0" y="${H - FOOTER_H}" width="${W}" height="${FOOTER_H}" fill="${GARNET}"/>
          <rect x="0" y="${H - FOOTER_H}" width="${W}" height="7" fill="${INK}"/>
          <path d="${star(W - 92, HEADER_H/2, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
          <path d="${star(364, H - FOOTER_H/2, 20, 9)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
          <rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="${INK}" stroke-width="10"/>
        </g>
        <text x="${W/2 - 24}" y="${HEADER_H/2 + 19}" text-anchor="middle" font-family="${ROUND}" font-size="56" font-weight="bold" fill="${CREAM}" ${ts} letter-spacing="1">${esc(JOGO.titulo)}</text>
        <text x="${W/2}" y="${HEADER_H + SUB_H/2 + 12}" text-anchor="middle" font-family="${ROUND}" font-size="27" font-weight="bold" fill="${CREAM}" letter-spacing="0.5">${linhaJogo}</text>
        <text x="56" y="${H - FOOTER_H/2 + 12}" text-anchor="start" font-family="${ROUND}" font-size="42" font-weight="bold" fill="${CREAM}" ${ts} letter-spacing="1">SAGA FUT</text>
        <text x="${W - 44}" y="${H - FOOTER_H/2 + 11}" text-anchor="end" font-family="${ROUND}" font-size="32" font-weight="bold" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">${esc(HANDLE)}</text>`
    }
    if (v === 'impact')    return chromeFonte({ font: 'Impact', upper: true, ls: 2, titleSize: 64, handleFill: GOLD })
    if (v === 'editorial') return chromeFonte({ font: 'Didot', headerFill: CREAM, titleFill: GARNET, subFill: GARNET, footFill: CREAM, footFg: GARNET, stars: false, border: GARNET, titleSize: 54, handleFill: GARNET })
    if (v === 'emblema')   return chromeFonte({ font: 'Copperplate', upper: true, ls: 5, titleSize: 40, handleFill: GOLD })
    if (v === 'slab')      return chromeFonte({ font: 'Rockwell', headerFill: NAVY, subFill: GARNET, titleSize: 52, handleFill: GOLD })
    if (v === 'marker')    return chromeFonte({ font: 'Chalkboard SE', titleSize: 46, handleFill: GOLD })
    if (v === 'vintage') {
      // header CLARO cor de papel, borda dupla grena, titulo grena (casa com o rabisco)
      return `<rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="${CREAM}"/>
        <rect x="10" y="10" width="${W - 20}" height="${HEADER_H - 20}" fill="none" stroke="${GARNET}" stroke-width="5"/>
        <rect x="18" y="18" width="${W - 36}" height="${HEADER_H - 36}" fill="none" stroke="${GARNET}" stroke-width="2"/>
        <path d="${star(70, HEADER_H/2, 17, 7)}" fill="${GARNET}"/>
        <path d="${star(W - 70, HEADER_H/2, 17, 7)}" fill="${GARNET}"/>
        <text x="${W/2}" y="${HEADER_H/2 + 19}" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="900" fill="${GARNET}" letter-spacing="1">${esc(JOGO.titulo)}</text>
        <rect x="0" y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${GARNET}"/>
        <text x="${W/2}" y="${HEADER_H + SUB_H/2 + 11}" text-anchor="middle" font-family="${FONT}" font-size="29" font-weight="800" fill="${CREAM}" letter-spacing="1">${linhaJogo}</text>
        <rect x="0" y="${H - FOOTER_H}" width="${W}" height="${FOOTER_H}" fill="${CREAM}"/>
        <rect x="0" y="${H - FOOTER_H + 6}" width="${W}" height="3" fill="${GARNET}"/>
        <text x="44" y="${H - FOOTER_H/2 + 16}" text-anchor="start" font-family="${FONT}" font-size="40" font-weight="900" fill="${GARNET}" letter-spacing="2">SAGA FUT</text>
        <path d="${star(322, H - FOOTER_H/2 + 1, 16, 7)}" fill="${GARNET}"/>
        ${handleCanto(GARNET)}`
    }
    if (v === 'clean') {
      // minimalista: faixas finas, muito respiro, titulo leve com linha dourada
      const hb = 118
      return `<rect x="0" y="0" width="${W}" height="${hb}" fill="${NAVY}"/>
        <rect x="0" y="${hb}" width="${W}" height="4" fill="${GOLD}"/>
        <text x="${W/2}" y="${hb/2 + 16}" text-anchor="middle" font-family="${FONT}" font-size="50" font-weight="700" fill="${CREAM}" letter-spacing="6">${esc((JOGO.titulo).toUpperCase())}</text>
        <text x="${W/2}" y="${hb + 40}" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="700" fill="${CREAM}" letter-spacing="2">${linhaJogo}</text>
        <rect x="0" y="${H - 64}" width="${W}" height="64" fill="${NAVY}"/>
        <rect x="0" y="${H - 64}" width="${W}" height="3" fill="${GOLD}"/>
        <text x="44" y="${H - 24}" text-anchor="start" font-family="${FONT}" font-size="26" font-weight="700" fill="${CREAM}" letter-spacing="4">SAGA FUT</text>
        ${handleCanto(GOLD)}`
    }
    // 'angular' (default): esportivo, barras diagonais douradas + titulo italico
    const barras = (cx, dir) => [0,1,2].map(i => {
      const x = cx + dir * i * 26
      return `<path d="M${x},0 l18,0 l${-34*dir},${HEADER_H} l-18,0 z" fill="${GOLD}"/>`
    }).join('')
    return `<rect x="0" y="0" width="${W}" height="${HEADER_H}" fill="${GARNET}"/>
      <rect x="0" y="0" width="${W}" height="7" fill="${GOLD}"/>
      <rect x="0" y="${HEADER_H - 6}" width="${W}" height="6" fill="${GOLD}"/>
      <g opacity="0.9">${barras(40, 1)}${barras(W - 40, -1)}</g>
      <text x="${W/2}" y="${HEADER_H/2 + 20}" text-anchor="middle" font-family="${FONT}" font-size="56" font-weight="900" font-style="italic" fill="${CREAM}" letter-spacing="1">${esc(JOGO.titulo)}</text>
      <rect x="0" y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${NAVY}"/>
      <path d="M0,${HEADER_H} l70,0 l-70,${SUB_H} z" fill="${GOLD}" opacity="0.8"/>
      <text x="${W/2}" y="${HEADER_H + SUB_H/2 + 11}" text-anchor="middle" font-family="${FONT}" font-size="29" font-weight="800" font-style="italic" fill="${CREAM}" letter-spacing="1">${linhaJogo}</text>
      <rect x="0" y="${H - 74}" width="${W}" height="74" fill="${GARNET}"/>
      <rect x="0" y="${H - 74}" width="${W}" height="5" fill="${GOLD}"/>
      <text x="44" y="${H - 26}" text-anchor="start" font-family="${FONT}" font-size="38" font-weight="900" font-style="italic" fill="${CREAM}" letter-spacing="1">SAGA FUT</text>
      <path d="${star(300, H - 42, 16, 7)}" fill="${GOLD}"/>
      ${handleCanto(GOLD)}`
  }

  const baseSvg = temFundoPronto
    ? `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${chromeTexto()}</svg>`
    : `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        ${temCampo ? '' : `<rect width="${W}" height="${H}" fill="${GRASS_A}"/>`}
        ${stripes}
        ${linhasSvg}
        ${chrome(CHROME)}
        ${CHROME === 'rabisco' ? '' : `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${INK}" stroke-width="9"/>`}
      </svg>`

  // camada de fundo: o fundo pronto (asset inteiro) OU o campo rabisco recortado na faixa do campo
  const fundoComps = []
  if (temFundoPronto) {
    fundoComps.push({ input: await sharp(fundoAbs).resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer(), top: 0, left: 0 })
  } else if (temCampo) {
    fundoComps.push({ input: await sharp(campoAbs).resize(W, fieldH, { fit: 'cover', position: 'centre' }).toBuffer(), top: fieldTop, left: 0 })
  }
  let png = await sharp({ create: { width: W, height: H, channels: 4, background: GRASS_A } })
    .composite([...fundoComps, { input: Buffer.from(baseSvg), top: 0, left: 0 }])
    .png().toBuffer()

  // ---- rostos + overlay (aneis, badges de numero, plaquinhas de nome)
  //
  // FALTA DE FICHA E ERRO FATAL, nao aviso. Antes daqui isso era um console.warn e o card
  // saia mesmo assim, com um buraco no lugar do jogador: quando a arte migrou de
  // `personagens/<slug>.png` pra `personagens/<slug>/base.png` o gerador ficou apontando
  // pro caminho velho e imprimiu "sem ficha" pros ONZE, entregando um card totalmente
  // vazio com codigo de saida 0. Card de escalacao so tem uma forma certa: os onze.
  const rostoComps = []
  let overlay = ''
  const semFicha = []
  for (const linha of JOGO.linhas) {
    for (const j of linha.jogadores) {
      try { await fs.access(path.join(CONTEUDO_DIR, baseImagem(j.id))) } catch { semFicha.push(j.id) }
    }
  }
  if (semFicha.length) {
    throw new Error(`sem ficha (base.png) pra: ${semFicha.join(', ')}\n` +
      `conserto: cadastre o personagem e rode "node gerar-ficha.mjs <id>" pra cada um.`)
  }
  // ORDENA CADA LINHA PELO LADO. Posicao sem `pos` declarado e erro: sem ela o gerador
  // teria que adivinhar o lado pela ordem de digitacao, que foi como o time saiu
  // espelhado da primeira vez.
  for (const linha of JOGO.linhas) {
    const sem = linha.jogadores.filter((j) => LADO_DA_POS[j.pos] === undefined)
    if (sem.length) {
      throw new Error(`sem posicao declarada (ou desconhecida) pra: ${sem.map((j) => `${j.nome} (${j.pos ?? 'nada'})`).join(', ')}\n` +
        `conserto: ponha "pos" em cada jogador, uma de: ${Object.keys(LADO_DA_POS).join(', ')}.`)
    }
    linha.jogadores.sort((a, b) => LADO_DA_POS[a.pos] - LADO_DA_POS[b.pos])
  }
  // caixa ocupada por cada token (elipse + plaquinha), pra saber depois onde sobrou vaga
  const ocupado = []
  for (const linha of JOGO.linhas) {
    const cy = Math.round(fieldTop + linha.y * fieldH)
    const xs = centrosX(linha.jogadores.length)
    for (let i = 0; i < linha.jogadores.length; i++) {
      const j = linha.jogadores[i]
      const cx = xs[i]
      ocupado.push({ cx, cy, base: cy + TOK_H / 2 + 46 })
      const fichaAbs = path.join(CONTEUDO_DIR, baseImagem(j.id))
      const rostoEl = await recortarBusto(fichaAbs, j.id, j)
      rostoComps.push({ input: rostoEl, left: Math.round(cx - TOK_W/2), top: Math.round(cy - TOK_H/2) })
      // anel + badge numero + plaquinha nome
      const plW = Math.max(120, 22 + j.nome.length * 17)
      overlay += `
        <ellipse cx="${cx}" cy="${cy}" rx="${TOK_W/2}" ry="${TOK_H/2}" fill="none" stroke="${GOLD}" stroke-width="7"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${TOK_W/2 - 4}" ry="${TOK_H/2 - 4}" fill="none" stroke="${INK}" stroke-width="2"/>
        <circle cx="${cx - TOK_W/2 + 20}" cy="${cy + TOK_H/2 - 18}" r="22" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
        <text x="${cx - TOK_W/2 + 20}" y="${cy + TOK_H/2 - 10}" text-anchor="middle" font-family="${bodyFont}" font-size="26" font-weight="900" fill="${INK}">${j.num}</text>
        <rect x="${cx - plW/2}" y="${cy + TOK_H/2 + 8}" width="${plW}" height="38" rx="9" fill="${PLATE}" stroke="${GOLD}" stroke-width="2"/>
        <text x="${cx}" y="${cy + TOK_H/2 + 34}" text-anchor="middle" font-family="${bodyFont}" font-size="25" font-weight="800" fill="${CREAM}" letter-spacing="0.5">${esc(j.nome)}</text>`
    }
  }
  // VAGA DO CARIMBO, calculada do layout. A vaga e a FAIXA DO GOLEIRO: ele fica sozinho e
  // centralizado, entao sobra uma tira inteira a esquerda dele, entre a plaquinha mais
  // baixa da linha de cima e o rodape. Isso se ajusta sozinho a qualquer formacao, que e o
  // que a coordenada fixa nao fazia: no 4-3-3 ela caia na vaga, no 4-2-3-1 caia em cima da
  // zaga. Se a vaga apertar, quem cede e o TAMANHO do carimbo, nao a posicao.
  const rodapeTop = temFundoPronto ? FAIXA_PE.y0 : H - FOOTER_H
  const cyBaixo = Math.max(...ocupado.map((o) => o.cy))
  const acima = ocupado.filter((o) => o.cy < cyBaixo)
  const vagaTopo = acima.length ? Math.max(...acima.map((o) => o.base)) : fieldTop
  const vagaDir = Math.min(...ocupado.filter((o) => o.cy === cyBaixo).map((o) => o.cx - TOK_W / 2)) - 14
  const vagaEsq = 34
  const cheia = carimboCaixa(JOGO.carimbo || '')
  const k = Math.min(1, (rodapeTop - vagaTopo - 16) / cheia.extV, (vagaDir - vagaEsq) / cheia.extH)
  const posCarimbo = {
    cx: Math.round((vagaEsq + vagaDir) / 2),
    cy: Math.round((vagaTopo + rodapeTop) / 2),
    size: Math.round(58 * Math.max(0.55, k)),
  }
  // o carimbo entra DEPOIS dos tokens no overlay: e ele que precisa parecer estampado por
  // cima da arte, nao escondido atras dela.
  const overlaySvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${overlay}${carimbo(JOGO.carimbo, posCarimbo)}</svg>`

  // modo DEV: se SAIDA setada, so salva o PNG naquele caminho e nao registra quadrinho
  if (process.env.SAIDA) {
    const outAbs = path.join(CONTEUDO_DIR, process.env.SAIDA)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await sharp(png).composite([...rostoComps, { input: Buffer.from(overlaySvg), top: 0, left: 0 }]).png().toFile(outAbs)
    console.log('OK (dev) ->', outAbs)
    return
  }

  // modo PADRAO: cada geracao vira um QUADRINHO NOVO (pasta propria) que aparece no studio
  const p2 = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const stamp = `${String(now.getFullYear()).slice(2)}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`
  const advSlug = JOGO.adversario.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const id = `escalacao-${advSlug}-${stamp}`
  const outRel = `quadrinhos/${id}/paineis/1.png`
  const outAbs = path.join(CONTEUDO_DIR, outRel)
  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp(png).composite([...rostoComps, { input: Buffer.from(overlaySvg), top: 0, left: 0 }]).png().toFile(outAbs)
  console.log('painel ->', outAbs)

  // registra o quadrinho pro studio LISTAR (via API se aberto; senao grava no disco)
  const elenco = [...new Set(JOGO.linhas.flatMap((l) => l.jogadores.map((j) => j.id)))]
  const quad = {
    id, titulo: id, tipo: 'charge', selo: 'Escalação', status: 'pronto',
    // A FAMÍLIA da peça, pro studio listar ela na categoria das montadas por código (que
    // continua mostrando a peça DEPOIS de publicada: a anterior é o gabarito da próxima).
    // Declarado, e não adivinhado pelo selo: o selo é rótulo de exibição e um quadrinho de
    // história pode usar o mesmo (`vaga-na-ponta` tem selo "Escalação" e é desenhado pela IA).
    porCodigo: 'escalacao',
    estiloId: 'rabisco-riso', estiloExtra: '', formato: '3:4', cenarioFixo: false,
    // ACABAMENTO DECLARADO: este card é montado inteiro por código e já sai pronto, então
    // não leva a moldura nem as legendas que o studio desenha nos quadrinhos de história
    // (o padrão de quadrinho novo). Declarado no dado, e não deixado em branco, pra ele não
    // ser arrastado por uma futura mudança de padrão: aqui o certo é 'nenhuma', não a ausência.
    moldura: 'nenhuma', legendaPorCodigo: false, carimboProgresso: false,
    elenco,
    // o confronto no texto do post sai na MESMA ordem do header (mandante na frente)
    contexto: `Card de escalacao montado por CODIGO (gerar-escalacao.mjs), NAO regerar pelo studio. ${confronto('Barcelona').texto} · ${JOGO.competicao} · ${JOGO.dataHora}. Barca ${JOGO.mando === 'casa' ? 'em casa' : 'fora de casa'}.`,
    legenda: `Escalação do Barcelona para ${confronto('Barcelona').texto} · ${JOGO.competicao} · ${JOGO.dataHora}. 🔵🔴`,
    paineis: [{ numero: 1, roteiro: 'Card de escalacao (montado por codigo).', falas: [], promptImagem: '(card montado por codigo, nao regerar)', imagem: outRel, status: 'pronto' }],
    publicacao: { titulo: `Escalação ${confronto('Barcelona').texto}`, tiktok: '', instagram: '', twitter: '', youtube: { titulo: '', descricao: '' } },
  }
  const API = 'http://localhost:4600/api/dados'
  try {
    const d = await (await fetch(API)).json()
    d.quadrinhos = (d.quadrinhos || []).filter((q) => q.id !== id)
    d.quadrinhos.push(quad)
    const r = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    if (!r.ok) throw new Error('PUT ' + r.status)
    console.log('quadrinho registrado no studio (via API):', id)
  } catch (e) {
    const d = await readDados()
    d.quadrinhos = (d.quadrinhos || []).filter((q) => q.id !== id)
    d.quadrinhos.push(quad)
    await writeDados(d)
    console.log('quadrinho gravado no disco (studio fechado):', id, '|', e.message)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
