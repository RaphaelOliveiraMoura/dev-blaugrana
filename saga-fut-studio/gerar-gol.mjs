// Gera o CARD DE GOL por CODIGO (nao por IA), no mesmo formato do card BREAKING: fundo liso,
// o autor do gol comemorando no centro, faixa grena com borda amarela embaixo e o placar numa
// tira escura logo acima. Trocar de gol = trocar o objeto GOL.
//
// POR QUE POR CODIGO: placar, minuto e nome de time sao TEXTO, e texto e exatamente onde o
// modelo de imagem erra. Mesmo motivo do gerar-escalacao.mjs. A arte do personagem ja existe
// (a pose de comemoracao da biblioteca dele), o resto e composicao.
//
//   node gerar-gol.mjs                        # usa o GOL abaixo, cria o quadrinho no studio
//   SAIDA=quadrinhos/teste.png node gerar-gol.mjs   # modo dev: so escreve o PNG
//
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { baseImagem, poseImagem } from './shared/personagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { readDados, writeDados } from './server/store.mjs'

// ---------------------------------------------------------------- DADOS DO GOL
// Tudo que muda de um gol pro outro vive aqui. O resto e template fixo.
const GOL = {
  autor: 'abdelkarim-riso',    // slug da ficha (precisa de poses/comemorar.png)
  nome: '',                    // vazio = puxa o nomeReal da ficha no project.json
  num: 9,                      // NUMERO REAL da camisa (regra da casa: e o que da reconhecimento)
  minuto: 60,
  // quantos gols o AUTOR ja tem NESTE jogo (2 = dobradinha). Vira uma bolinha por gol ao lado
  // do nome: o card conta a historia dele no jogo, nao so o lance.
  golsNoJogo: 2,
  adversario: 'BIRMINGHAM',
  competicao: 'AMISTOSO',
  gols: [2, 1],                // [Barca, adversario] DEPOIS do gol
  fora: true,                  // true = o Barca joga fora (inverte a ordem no placar)
  // siglas do placar: vazio = 3 primeiras letras do nome
  siglaCasa: 'BAR',
  siglaAdv: '',
  // publicacao (obrigatoria pra o quadrinho ser aceito)
  titulo: 'DOBRADINHA! Birmingham 1 x 2 Barcelona',
  legenda: 'Hamza Abdelkarim fez os DOIS. Empatou de pênalti aos 42 e virou o jogo aos 60, na estreia ' +
    'dele pelo Barça. 🔵🔴\n\n' +
    'Birmingham 1 x 2 Barcelona, primeiro jogo da pré-temporada, com os campeões do mundo de férias e ' +
    'o time dos garotos em campo.\n\n' +
    'O centroavante egípcio de 18 anos chegou fazendo barulho. Guarda esse nome. 👀\n\n' +
    '#Abdelkarim #HamzaAbdelkarim #Barça #Barcelona #pretemporada #futebol #sagafut'
}

// ---------------------------------------------------------------- TEMA (fixo, o mesmo da casa)
const W = 1152, H = 1536
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414', PLATE = '#1c1c1c'
const PAPEL = '#e7dcc6'
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"
const MARKER = "'Marker Felt', 'Chalkboard SE', sans-serif"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
const sigla = (nome) => semAcento(nome).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
const slugify = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// NOME + NUMERO SEMPRE NA MESMA LINHA: quem varia e o CORPO da fonte, nao o numero de linhas.
// Nome comprido ("HAMZA ABDELKARIM", "ÁLEX GONZÁLEZ") e o caso comum; sem isso ou vaza a
// moldura ou alguem quebra a linha na mao e o numero da camisa desgruda do nome.
// 0.60 = largura media por caractere em relacao ao corpo, medida nas maiusculas da Chalkboard SE.
const fonteQueCabe = (texto, larguraMax, ideal, minima = 24) =>
  Math.max(minima, Math.min(ideal, Math.floor(larguraMax / (String(texto).length * 0.60))))

function star(cx, cy, rO, rI) {
  let p = ''
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rI : rO
    const a = -Math.PI / 2 + i * Math.PI / 5
    p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)
  }
  return p + 'Z'
}

// BOLINHA DE GOL: uma bola por gol do autor NESTE jogo. Desenhada (nao emoji) pra viver na
// mesma linguagem do resto do card: contorno preto grosso, miolo creme, gomo central escuro.
// Fica ao lado do nome porque o que ela conta e "quantos ele fez", nao "quantos o time fez".
function bola(cx, cy, r) {
  const p = (ang, k = 1) => {
    const a = (ang - 90) * Math.PI / 180
    return `${(cx + r * k * Math.cos(a)).toFixed(1)} ${(cy + r * k * Math.sin(a)).toFixed(1)}`
  }
  // o pentagono central + costuras CURTAS e FINAS: com traco grosso ate a borda a bola vira
  // roda de carro (foi o que aconteceu na primeira versao)
  const gomo = [0, 72, 144, 216, 288].map((a, i) => (i ? 'L' : 'M') + p(a, 0.40)).join(' ') + 'Z'
  const traco = [36, 108, 180, 252, 324].map((a) => {
    const [x1, y1] = p(a, 0.46).split(' ')
    const [x2, y2] = p(a, 0.74).split(' ')
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${Math.max(1.5, r * 0.09)}" stroke-linecap="round"/>`
  }).join('')
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${CREAM}" stroke="${INK}" stroke-width="${Math.max(2.5, r * 0.2)}"/>
    <path d="${gomo}" fill="${INK}"/>
    ${traco}
  </g>`
}
// fileira de bolinhas centrada em cx
function bolinhas(qtd, cx, cy, r = 20, gap = 12) {
  if (!qtd || qtd < 2) return ''   // 1 gol nao precisa de contador: o card inteiro ja e sobre ele
  const passo = r * 2 + gap
  const x0 = cx - (qtd * passo - gap) / 2 + r
  return Array.from({ length: qtd }, (_, i) => bola(x0 + i * passo, cy, r)).join('')
}

// Fundo por FLOOD-FILL a partir das bordas (mesma funcao do gerar-escalacao): so tira o fundo
// externo conectado as bordas, preserva branco interno (meiao, chuteira).
function removerFundo(data, w, h) {
  const amostra = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => (y * w + x) * 4)
  let br = 0, bg = 0, bb = 0
  for (const i of amostra) { br += data[i]; bg += data[i + 1]; bb += data[i + 2] }
  br /= 4; bg /= 4; bb /= 4
  const THR = 62 * 62
  const perto = (i) => { const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb; return dr * dr + dg * dg + db * db < THR }
  const visited = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x) }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1) }
  while (stack.length) {
    const p = stack.pop()
    if (visited[p]) continue
    visited[p] = 1
    if (!perto(p * 4)) continue
    data[p * 4 + 3] = 0
    const x = p % w, y = (p / w) | 0
    if (x > 0) stack.push(p - 1)
    if (x < w - 1) stack.push(p + 1)
    if (y > 0) stack.push(p - w)
    if (y < h - 1) stack.push(p + w)
  }
}

// A pose da biblioteca ja sai fatiada (fundo transparente, ancorada no pe). O flood-fill so entra
// quando o arquivo veio sem alpha, pra o card nao aparecer com um retangulo de fundo atras.
async function recortarAutor(absPose, alturaAlvo) {
  const meta = await sharp(absPose).metadata()
  let img = sharp(absPose)
  if (!meta.hasAlpha) {
    const t = await img.trim({ threshold: 28 }).toBuffer({ resolveWithObject: true })
    const { data, info } = await sharp(t.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    removerFundo(data, info.width, info.height)
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  }
  const cortado = await sharp(await img.png().toBuffer()).trim().png().toBuffer()
  const m = await sharp(cortado).metadata()
  const escala = alturaAlvo / m.height
  return {
    buf: await sharp(cortado).resize({ height: Math.round(alturaAlvo) }).png().toBuffer(),
    w: Math.round(m.width * escala), h: Math.round(alturaAlvo),
  }
}

async function main() {
  // ---------------------------------------------------------------- gates (antes de compor nada)
  //
  // FALTA DE ARTE E ERRO FATAL, NAO AVISO. O card de escalacao ja saiu uma vez inteiro vazio,
  // com codigo de saida 0, porque a arte tinha mudado de pasta e o gerador so imprimiu um warn.
  // Card de gol sem o autor do gol nao e um card pior: e um card errado.
  const baseAbs = path.join(CONTEUDO_DIR, baseImagem(GOL.autor))
  if (!(await fs.access(baseAbs).then(() => true).catch(() => false))) {
    throw new Error(`sem ficha (base.png) pra "${GOL.autor}".\n` +
      `conserto: cadastre o personagem no studio e gere a ficha antes.`)
  }
  const poseRel = poseImagem(GOL.autor, 'comemorar')
  const poseAbs = path.join(CONTEUDO_DIR, poseRel)
  if (!(await fs.access(poseAbs).then(() => true).catch(() => false))) {
    throw new Error(`"${GOL.autor}" nao tem pose de comemoracao (${poseRel}).\n` +
      `conserto: node scripts/asset.mjs pose ${GOL.autor} comemorar\n` +
      `(o card nao aceita a pose parada da ficha: personagem plantado no meio do quadro comemorando` +
      ` gol e o cutout fantasma que ja foi reprovado)`)
  }

  const dados = await readDados().catch(() => null)
  const ficha = dados?.personagens?.find((p) => p.id === GOL.autor)
  const nome = (GOL.nome || ficha?.nomeReal || ficha?.nome || GOL.autor).toUpperCase()
  if (!GOL.num) throw new Error('faltou o numero da camisa (GOL.num) — e o que da reconhecimento sem citar o nome.')

  const sigCasa = GOL.siglaCasa || 'BAR'
  const sigAdv = GOL.siglaAdv || sigla(GOL.adversario)
  // o placar sempre le "mandante primeiro": jogando fora, o Barca vai pra direita
  const [gCasa, gFora] = GOL.gols
  const placar = GOL.fora
    ? `${sigAdv} <tspan font-size="62">${gFora}</tspan> <tspan fill="#8a8a8a">-</tspan> <tspan fill="${GOLD}" font-size="62">${gCasa}</tspan> ${sigCasa}`
    : `${sigCasa} <tspan fill="${GOLD}" font-size="62">${gCasa}</tspan> <tspan fill="#8a8a8a">-</tspan> <tspan font-size="62">${gFora}</tspan> ${sigAdv}`

  // ---------------------------------------------------------------- composicao (3 camadas)
  // FUNDO -> arte -> FRENTE. As faixas TEM que vir depois do personagem (senao o pe dele fica
  // por cima da faixa) e o fundo TEM que vir antes (senao engole o personagem inteiro).
  const faixaY = H - 330, faixaH = 176
  const placarY = faixaY - 126
  const alturaAutor = 880
  const p = await recortarAutor(poseAbs, alturaAutor)
  const topoAutor = 150
  const peAutor = topoAutor + p.h

  const defs = `<defs>
    <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="borrao" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>`
  const svg = (corpo) => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}${corpo}</svg>`)

  const fundo = `
    <rect width="${W}" height="${H}" fill="${PAPEL}"/>
    <circle cx="${W / 2}" cy="${H / 2 - 180}" r="470" fill="${NAVY}" opacity="0.07"/>
    <ellipse cx="${W / 2}" cy="${peAutor - 12}" rx="${Math.round(p.w * 0.42)}" ry="26" fill="${INK}" opacity="0.20" filter="url(#borrao)"/>`

  const frente = `
    <g filter="url(#rough)">
      <rect x="150" y="${placarY}" width="${W - 300}" height="100" rx="14" fill="${PLATE}" stroke="${INK}" stroke-width="6"/>
      <rect x="150" y="${placarY}" width="${W - 300}" height="100" rx="14" fill="none" stroke="${GOLD}" stroke-width="3"/>
    </g>
    <text x="${W / 2}" y="${placarY + 68}" text-anchor="middle" font-family="${ROUND}" font-size="54" font-weight="bold" fill="${CREAM}" letter-spacing="1">
      ${placar}<tspan fill="${GOLD}" font-size="34" dx="34">•&#160;&#160;${GOL.minuto}'</tspan>
    </text>
    <g filter="url(#rough)">
      <rect x="86" y="${faixaY}" width="${W - 172}" height="${faixaH}" fill="${GARNET}" stroke="${GOLD}" stroke-width="8"/>
    </g>
    <text x="${W / 2 - 64}" y="${faixaY + 124}" text-anchor="middle" font-family="${ROUND}" font-size="122" font-weight="bold" fill="#ffffff" letter-spacing="4">GOOOL</text>
    ${bolinhas(GOL.golsNoJogo, 940, faixaY + faixaH / 2, 34, 16)}
    <text x="${W / 2}" y="${faixaY + faixaH + 68}" text-anchor="middle" font-family="${MARKER}" font-size="${fonteQueCabe(`${nome} ${GOL.num}`, W - 200, 46)}" font-weight="bold" fill="${GARNET}" letter-spacing="2">${esc(nome)} <tspan fill="${NAVY}">${GOL.num}</tspan></text>
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="${INK}" stroke-width="14"/>
    <circle cx="${W - 96}" cy="96" r="46" fill="${CREAM}" stroke="${INK}" stroke-width="7"/>
    <path d="${star(W - 96, 96, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
    <text x="${W - 56}" y="${H - 46}" text-anchor="end" font-family="${ROUND}" font-size="30" font-weight="bold" fill="${GARNET}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">@devblaugrana</text>`

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([
      { input: svg(fundo), top: 0, left: 0 },
      { input: p.buf, left: Math.round(W / 2 - p.w / 2), top: topoAutor },
      { input: svg(frente), top: 0, left: 0 },
    ]).png().toBuffer()

  // ---------------------------------------------------------------- saida
  // modo DEV: so escreve o PNG, nao registra quadrinho nenhum
  if (process.env.SAIDA) {
    const outAbs = path.join(CONTEUDO_DIR, process.env.SAIDA)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await sharp(png).png().toFile(outAbs)
    console.log('OK (dev) ->', outAbs)
    return
  }

  // modo PADRAO: cada gol vira um QUADRINHO NOVO (pasta propria) que aparece no studio
  const p2 = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const stamp = `${String(now.getFullYear()).slice(2)}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`
  const id = `gol-${slugify(GOL.autor.replace(/-riso$/, ''))}-${stamp}`
  const outRel = `quadrinhos/${id}/paineis/1.png`
  const outAbs = path.join(CONTEUDO_DIR, outRel)
  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp(png).png().toFile(outAbs)
  console.log('painel ->', outAbs)

  // TITULO E LEGENDA sao obrigatorios pra o quadrinho ser aceito (validarPayload do studio):
  // por isso tem default montado do placar, e nao um campo em branco esperando alguem lembrar.
  const nomeReal = ficha?.nomeReal || ficha?.nome || nome
  const linhaPlacar = GOL.fora
    ? `${GOL.adversario} ${gFora} x ${gCasa} Barcelona`
    : `Barcelona ${gCasa} x ${gFora} ${GOL.adversario}`
  const titulo = GOL.titulo || `GOL! ${linhaPlacar}`
  const legenda = GOL.legenda ||
    `${nomeReal} marcou aos ${GOL.minuto} minutos. ${linhaPlacar}, ${GOL.competicao.toLowerCase()}. 🔵🔴\n\n` +
    `#Barça #FCBarcelona #${slugify(nomeReal).replace(/-/g, '')} #futebol #sagafut`

  const quad = {
    id, titulo: id, tipo: 'charge', selo: 'Gol', status: 'pronto',
    estiloId: 'rabisco-riso', estiloExtra: '', formato: '3:4', cenarioFixo: false,
    // ACABAMENTO DECLARADO: este card é montado inteiro por código e já sai pronto, então
    // não leva a moldura nem as legendas que o studio desenha nos quadrinhos de história
    // (o padrão de quadrinho novo). Declarado no dado, e não deixado em branco, pra ele não
    // ser arrastado por uma futura mudança de padrão: aqui o certo é 'nenhuma', não a ausência.
    moldura: 'nenhuma', legendaPorCodigo: false, carimboProgresso: false,
    elenco: [GOL.autor],
    contexto: `Card de GOL montado por CODIGO (gerar-gol.mjs), NAO regerar pelo studio. ` +
      `${linhaPlacar} · ${GOL.competicao} · gol de ${nomeReal} (${GOL.num}) aos ${GOL.minuto}'.`,
    legenda,
    paineis: [{
      numero: 1, roteiro: 'Card de gol (montado por codigo).', falas: [],
      promptImagem: '(card montado por codigo, nao regerar)', imagem: outRel, status: 'pronto',
    }],
    publicacao: {
      titulo,
      tiktok: `GOOOL! ${linhaPlacar} 🔵🔴 #Barça #FCBarcelona`,
      instagram: `GOOOL DO BARÇA! ${linhaPlacar} 🔵🔴 #Barça #FCBarcelona`,
      twitter: `GOOOL! ${linhaPlacar}`,
      youtube: { titulo: '', descricao: '' },
    },
  }

  // o studio mantem o project.json em memoria e sobrescreve o disco no proximo save:
  // com ele aberto, gravar direto no disco some sem aviso. Por isso a API vem primeiro.
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

main().catch((e) => { console.error(e.message || e); process.exit(1) })
