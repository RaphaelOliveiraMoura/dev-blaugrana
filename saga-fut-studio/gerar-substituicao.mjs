// Gera o CARD DE SUBSTITUICAO por CODIGO (sai um, entra outro), na mesma familia visual do
// gerar-gol.mjs. Trocar de substituicao = trocar o objeto SUB.
//
// A LEITURA VEM DA IMAGEM, NAO DO ROTULO: quem SAI entra dessaturado, menor em presenca e com
// seta pequena; quem ENTRA fica colorido, com halo dourado, sombra mais densa e a seta num disco.
// Os dois tem a MESMA ALTURA e pisam na MESMA linha, senao a box fica torta.
//
//   node gerar-substituicao.mjs                          # cria o quadrinho no studio
//   SAIDA=quadrinhos/teste.png node gerar-substituicao.mjs   # modo dev: so escreve o PNG
//
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { baseImagem } from './shared/personagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { readDados, writeDados } from './server/store.mjs'

// ---------------------------------------------------------------- DADOS DA SUBSTITUICAO
const SUB = {
  sai:   { slug: 'kluivert-riso',      nome: '', num: 24 },   // nome vazio = nomeReal da ficha
  entra: { slug: 'alex-gonzalez-riso', nome: '', num: 36 },
  minuto: 62,
  competicao: 'AMISTOSO',
  adversario: 'BIRMINGHAM',
  gols: [2, 1],                 // [Barca, adversario] no momento da troca
  fora: true,                   // Barca jogando fora: o mandante vai primeiro no placar
  siglaCasa: 'BAR',
  siglaAdv: '',
  titulo: '',                   // vazio = montado dos nomes
  legenda: '',                  // vazio = montada dos nomes
}

// ---------------------------------------------------------------- TEMA (o mesmo da casa)
const W = 1152, H = 1536
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414'
const PAPEL = '#e7dcc6'
const VERDE = '#2f7d4f', VERMELHO_APAGADO = '#8a4a42'
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"
const MARKER = "'Marker Felt', 'Chalkboard SE', sans-serif"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
const sigla = (nome) => semAcento(nome).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
const slugify = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// NOME + NUMERO SEMPRE NA MESMA LINHA: o que varia e o CORPO da fonte, nunca o numero de linhas.
// Quebrar em duas linhas desgruda o numero do nome, e o numero real e o que da reconhecimento.
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
const setaCima = (cx, cy, s, cor) => `<path d="M${cx},${cy-s} L${cx+s*0.72},${cy+s*0.28} L${cx+s*0.3},${cy+s*0.28} L${cx+s*0.3},${cy+s} L${cx-s*0.3},${cy+s} L${cx-s*0.3},${cy+s*0.28} L${cx-s*0.72},${cy+s*0.28} Z" fill="${cor}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
const setaBaixo = (cx, cy, s, cor) => `<path d="M${cx},${cy+s} L${cx+s*0.72},${cy-s*0.28} L${cx+s*0.3},${cy-s*0.28} L${cx+s*0.3},${cy-s} L${cx-s*0.3},${cy-s} L${cx-s*0.3},${cy-s*0.28} L${cx-s*0.72},${cy-s*0.28} Z" fill="${cor}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`

function removerFundo(data, w, h) {
  const amostra = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => (y * w + x) * 4)
  let br = 0, bg = 0, bb = 0
  for (const i of amostra) { br += data[i]; bg += data[i + 1]; bb += data[i + 2] }
  br /= 4; bg /= 4; bb /= 4
  const THR = 62 * 62
  const perto = (i) => { const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb; return dr * dr + dg * dg + db * db < THR }
  const visited = new Uint8Array(w * h), stack = []
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

// corpo inteiro recortado da ficha. `apagado` dessatura (e o tratamento de quem SAI)
async function corpo(slug, alturaAlvo, { apagado = false } = {}) {
  const abs = path.join(CONTEUDO_DIR, baseImagem(slug))
  const t = await sharp(abs).trim({ threshold: 28 }).toBuffer({ resolveWithObject: true })
  const { data, info } = await sharp(t.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  removerFundo(data, info.width, info.height)
  // o grayscale vem DEPOIS do flood-fill: antes dele o raw sai com 1 canal e o flood-fill,
  // que assume RGBA, le fora dos limites
  let img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  if (apagado) img = img.grayscale().modulate({ brightness: 1.12 })
  const cortado = await sharp(await img.png().toBuffer()).trim().png().toBuffer()
  const m = await sharp(cortado).metadata()
  return {
    buf: await sharp(cortado).resize({ height: alturaAlvo }).png().toBuffer(),
    w: Math.round(m.width * (alturaAlvo / m.height)), h: alturaAlvo,
  }
}

async function main() {
  // ---------------------------------------------------------------- gates
  // Card de substituicao com UM dos dois faltando nao e um card pior, e um card errado.
  const faltando = []
  for (const p of [SUB.sai, SUB.entra]) {
    const abs = path.join(CONTEUDO_DIR, baseImagem(p.slug))
    if (!(await fs.access(abs).then(() => true).catch(() => false))) faltando.push(p.slug)
  }
  if (faltando.length) {
    throw new Error(`sem ficha (base.png) pra: ${faltando.join(', ')}\n` +
      `conserto: cadastre o personagem no studio e rode "node gerar-ficha.mjs <id>".`)
  }
  for (const p of [SUB.sai, SUB.entra]) {
    if (!p.num) throw new Error(`faltou o numero da camisa de "${p.slug}" — e o que da reconhecimento sem citar o nome.`)
  }

  const dados = await readDados().catch(() => null)
  const nomeDe = (p) => (p.nome || dados?.personagens?.find((x) => x.id === p.slug)?.nomeReal
    || dados?.personagens?.find((x) => x.id === p.slug)?.nome || p.slug).toUpperCase()
  const nomeSai = nomeDe(SUB.sai), nomeEntra = nomeDe(SUB.entra)

  const sigAdv = SUB.siglaAdv || sigla(SUB.adversario)
  const [gBarca, gAdv] = SUB.gols
  const placar = SUB.fora
    ? `${sigAdv} ${gAdv}-${gBarca} ${SUB.siglaCasa}`
    : `${SUB.siglaCasa} ${gBarca}-${gAdv} ${sigAdv}`

  // ---------------------------------------------------------------- composicao
  const ALT = 640                        // MESMA altura pros dois
  const colY = 250, colH = 900
  const chao = colY + colH - 90           // a linha em que os DOIS pisam
  const topo = chao - ALT
  const cxSai = 300, cxEntra = 852
  const ySeta = colY + colH + 70

  const sai = await corpo(SUB.sai.slug, ALT, { apagado: true })
  const entra = await corpo(SUB.entra.slug, ALT)

  const defs = `<defs>
    <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="borrao" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
  </defs>`
  const svg = (c) => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}${c}</svg>`)
  const sombra = (cx, y, w, op) => `<ellipse cx="${cx}" cy="${y}" rx="${Math.round(w * 0.42)}" ry="22" fill="${INK}" opacity="${op}" filter="url(#borrao)"/>`

  const fundo = `
    <rect width="${W}" height="${H}" fill="${PAPEL}"/>
    <rect x="60" y="${colY}" width="480" height="${colH}" rx="26" fill="#4a4a4a" opacity="0.14"/>
    <rect x="${W - 540}" y="${colY}" width="480" height="${colH}" rx="26" fill="${GARNET}" opacity="0.16"/>
    <circle cx="${cxEntra}" cy="${chao - ALT / 2}" r="270" fill="${GOLD}" opacity="0.20"/>
    ${sombra(cxSai, chao - 6, sai.w, 0.10)}
    ${sombra(cxEntra, chao - 6, entra.w, 0.24)}`

  const linhaSai = `${nomeSai} ${SUB.sai.num}`
  const linhaEntra = `${nomeEntra} ${SUB.entra.num}`
  const frente = `
    <g filter="url(#rough)"><rect x="86" y="110" width="${W - 172}" height="120" fill="${NAVY}" stroke="${GOLD}" stroke-width="8"/></g>
    <text x="${W / 2}" y="192" text-anchor="middle" font-family="${ROUND}" font-size="62" font-weight="bold" fill="#fff" letter-spacing="5">SUBSTITUIÇÃO</text>
    ${setaBaixo(cxSai, ySeta, 38, VERMELHO_APAGADO)}
    <circle cx="${cxEntra}" cy="${ySeta}" r="60" fill="${VERDE}" stroke="${INK}" stroke-width="6"/>
    ${setaCima(cxEntra, ySeta, 40, '#ffffff')}
    <circle cx="${W / 2}" cy="${ySeta}" r="58" fill="${GOLD}" stroke="${INK}" stroke-width="7"/>
    <text x="${W / 2}" y="${ySeta + 18}" text-anchor="middle" font-family="${ROUND}" font-size="44" font-weight="bold" fill="${INK}">${SUB.minuto}'</text>
    <text x="${cxSai}" y="${ySeta + 132}" text-anchor="middle" font-family="${ROUND}" font-size="${fonteQueCabe(linhaSai, 470, 38)}" font-weight="bold" fill="#6a6a6a">${esc(linhaSai)}</text>
    <text x="${cxEntra}" y="${ySeta + 136}" text-anchor="middle" font-family="${ROUND}" font-size="${fonteQueCabe(linhaEntra, 500, 46)}" font-weight="bold" fill="${GARNET}">${esc(nomeEntra)} <tspan fill="${NAVY}">${SUB.entra.num}</tspan></text>
    <text x="${W / 2}" y="${H - 120}" text-anchor="middle" font-family="${MARKER}" font-size="34" font-weight="bold" fill="${INK}" opacity="0.7" letter-spacing="2">${esc(SUB.competicao)} · ${placar}</text>
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="${INK}" stroke-width="14"/>
    <circle cx="${W - 96}" cy="96" r="46" fill="${CREAM}" stroke="${INK}" stroke-width="7"/>
    <path d="${star(W - 96, 96, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
    <text x="${W - 56}" y="${H - 46}" text-anchor="end" font-family="${ROUND}" font-size="30" font-weight="bold" fill="${GARNET}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">@devblaugrana</text>`

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([
      { input: svg(fundo), top: 0, left: 0 },
      { input: sai.buf, left: Math.round(cxSai - sai.w / 2), top: topo },
      { input: entra.buf, left: Math.round(cxEntra - entra.w / 2), top: topo },
      { input: svg(frente), top: 0, left: 0 },
    ]).png().toBuffer()

  if (process.env.SAIDA) {
    const outAbs = path.join(CONTEUDO_DIR, process.env.SAIDA)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await sharp(png).png().toFile(outAbs)
    console.log('OK (dev) ->', outAbs)
    return
  }

  const p2 = (n) => String(n).padStart(2, '0')
  const now = new Date()
  const stamp = `${String(now.getFullYear()).slice(2)}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`
  const id = `sub-${slugify(SUB.entra.slug.replace(/-riso$/, ''))}-${stamp}`
  const outRel = `quadrinhos/${id}/paineis/1.png`
  const outAbs = path.join(CONTEUDO_DIR, outRel)
  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp(png).png().toFile(outAbs)
  console.log('painel ->', outAbs)

  const titulo = SUB.titulo || `Sai ${nomeSai}, entra ${nomeEntra}`
  const legenda = SUB.legenda ||
    `Mudança do Barça aos ${SUB.minuto} minutos: sai ${nomeSai}, entra ${nomeEntra}. 🔵🔴\n\n` +
    `${SUB.competicao.toLowerCase()} · ${placar}\n\n` +
    `#Barça #Barcelona #futebol #sagafut`

  const quad = {
    id, titulo: id, tipo: 'charge', selo: 'Substituição', status: 'pronto',
    // A FAMÍLIA da peça, pro studio listar ela na categoria das montadas por código (que
    // continua mostrando a peça DEPOIS de publicada: a anterior é o gabarito da próxima).
    // Declarado, e não adivinhado pelo selo: o selo é rótulo de exibição e um quadrinho de
    // história pode usar o mesmo (`vaga-na-ponta` tem selo "Escalação" e é desenhado pela IA).
    porCodigo: 'substituicao',
    estiloId: 'rabisco-riso', estiloExtra: '', formato: '3:4', cenarioFixo: false,
    // ACABAMENTO DECLARADO: este card é montado inteiro por código e já sai pronto, então
    // não leva a moldura nem as legendas que o studio desenha nos quadrinhos de história
    // (o padrão de quadrinho novo). Declarado no dado, e não deixado em branco, pra ele não
    // ser arrastado por uma futura mudança de padrão: aqui o certo é 'nenhuma', não a ausência.
    moldura: 'nenhuma', legendaPorCodigo: false, carimboProgresso: false,
    elenco: [SUB.sai.slug, SUB.entra.slug],
    contexto: `Card de SUBSTITUICAO montado por CODIGO (gerar-substituicao.mjs), NAO regerar pelo studio. ` +
      `${SUB.minuto}': sai ${nomeSai} (${SUB.sai.num}), entra ${nomeEntra} (${SUB.entra.num}). ${SUB.competicao} · ${placar}.`,
    legenda,
    paineis: [{
      numero: 1, roteiro: 'Card de substituicao (montado por codigo).', falas: [],
      promptImagem: '(card montado por codigo, nao regerar)', imagem: outRel, status: 'pronto',
    }],
    publicacao: {
      titulo,
      tiktok: `${nomeEntra} em campo. ${SUB.minuto}' 🔵🔴 #Barça #FCBarcelona`,
      instagram: `Sai ${nomeSai}, entra ${nomeEntra} aos ${SUB.minuto}'. 🔵🔴 #Barça #FCBarcelona`,
      twitter: `${SUB.minuto}': sai ${nomeSai}, entra ${nomeEntra}`,
      youtube: { titulo: '', descricao: '' },
    },
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

main().catch((e) => { console.error(e.message || e); process.exit(1) })
