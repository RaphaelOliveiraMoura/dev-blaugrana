// Gera o CARD DE FIM DE JOGO por CODIGO, na mesma familia do gerar-gol.mjs e do
// gerar-substituicao.mjs. Trocar de jogo = trocar o objeto JOGO.
//
// O ASSUNTO E O RESULTADO, nao um jogador: por isso o placar por extenso e a linha maior do
// card e os personagens (tres, dos que ENTRARAM EM CAMPO) sao a reacao a ele, nao o tema.
//
// O QUE O CODIGO DERIVA SOZINHO (nao passe na mao):
//   · a cor da faixa sai do placar: grena venceu, navy empatou, chumbo perdeu
//   · a POSE sai do placar: comemoracao na vitoria, pose neutra no empate e na derrota
//   · o mandante vai sempre a ESQUERDA do placar (campo `fora`)
//   · gol repetido do mesmo jogador vira "NOME 42' e 60'", nao duas entradas
//
//   node gerar-fim-de-jogo.mjs                          # cria o quadrinho no studio
//   SAIDA=quadrinhos/teste.png node gerar-fim-de-jogo.mjs   # modo dev: so escreve o PNG
//
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { baseImagem, poseImagem } from './shared/personagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { readDados, writeDados } from './server/store.mjs'

// ---------------------------------------------------------------- DADOS DO JOGO
const JOGO = {
  adversario: 'BIRMINGHAM',
  siglaAdv: '',                 // vazio = 3 primeiras letras
  nomeBarca: 'BARCELONA',
  gols: [2, 2],                 // [Barca, adversario]
  fora: true,                   // Barca jogando fora: o mandante vai primeiro
  competicao: 'AMISTOSO',
  local: "ST. ANDREW'S",
  fecho: 'EMPATE NA ESTREIA',   // a unica linha que nenhum dado produz; '' some com ela
  // marcadores: gol repetido do mesmo jogador e agrupado pelo codigo
  golsAdv: [{ nome: 'PRISKE', min: 31 }, { nome: 'SOLÍS', min: 68 }],
  golsBarca: [{ nome: 'ABDELKARIM', min: 42 }, { nome: 'ABDELKARIM', min: 60 }],
  // TRES personagens, e eles TEM QUE TER JOGADO. o do meio e o destaque (fica maior).
  trio: ['adeyemi-riso', 'abdelkarim-riso', 'kluivert-riso'],
  titulo: '',                   // vazio = montado do placar
  legenda: '',                  // vazio = montada do placar + marcadores
}

// ---------------------------------------------------------------- TEMA (o mesmo da casa)
const W = 1152, H = 1536
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414', CHUMBO = '#3a3a3a'
const PAPEL = '#e7dcc6'
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"
const MARKER = "'Marker Felt', 'Chalkboard SE', sans-serif"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
const sigla = (nome) => semAcento(nome).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
const slugify = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// o CORPO da fonte sai da largura disponivel: nome de time comprido encolhe o texto,
// nunca quebra linha nem vaza a moldura
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

// A POSE ja vem com alpha; a BASE vem com o papel da ficha, que precisa sair por flood-fill
// (sem isso cada personagem aparece dentro de um retangulo claro de papel).
async function corpo(rel, alturaAlvo) {
  const abs = path.join(CONTEUDO_DIR, rel)
  const meta = await sharp(abs).metadata()
  let img = sharp(abs)
  if (!meta.hasAlpha) {
    const tr = await img.trim({ threshold: 28 }).toBuffer({ resolveWithObject: true })
    const { data, info } = await sharp(tr.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    removerFundo(data, info.width, info.height)
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  }
  const cortado = await sharp(await img.png().toBuffer()).trim().png().toBuffer()
  const m = await sharp(cortado).metadata()
  return {
    buf: await sharp(cortado).resize({ height: alturaAlvo }).png().toBuffer(),
    w: Math.round(m.width * (alturaAlvo / m.height)), h: alturaAlvo,
  }
}

// quem marcou, agrupado por jogador: dois gols do mesmo cara viram uma entrada so
const listaGols = (gols) => {
  const porNome = new Map()
  for (const g of gols) porNome.set(g.nome, [...(porNome.get(g.nome) || []), `${g.min}'`])
  return [...porNome].map(([nome, mins]) => `${nome} ${mins.join(' e ')}`).join(' · ')
}

async function main() {
  const [gBarca, gAdv] = JOGO.gols
  const venceu = gBarca > gAdv, empatou = gBarca === gAdv
  const cor = venceu ? GARNET : empatou ? NAVY : CHUMBO

  // ---------------------------------------------------------------- gates
  if (!Array.isArray(JOGO.trio) || JOGO.trio.length !== 3) {
    throw new Error('o trio precisa de exatamente 3 personagens (e os tres tem que ter entrado em campo).')
  }
  // A POSE SAI DO RESULTADO: so vitoria comemora. Empate e derrota usam a pose neutra da ficha,
  // porque personagem festejando embaixo de um placar de empate desmente o proprio card.
  const artes = []
  const semFicha = [], semComemorar = []
  for (const slug of JOGO.trio) {
    const base = baseImagem(slug)
    if (!(await fs.access(path.join(CONTEUDO_DIR, base)).then(() => true).catch(() => false))) { semFicha.push(slug); continue }
    if (!venceu) { artes.push(base); continue }
    const pose = poseImagem(slug, 'comemorar')
    if (await fs.access(path.join(CONTEUDO_DIR, pose)).then(() => true).catch(() => false)) artes.push(pose)
    else semComemorar.push(slug)
  }
  if (semFicha.length) {
    throw new Error(`sem ficha (base.png) pra: ${semFicha.join(', ')}\n` +
      `conserto: cadastre o personagem no studio e rode "node gerar-ficha.mjs <id>".`)
  }
  if (semComemorar.length) {
    throw new Error(`vitoria pede pose de comemoracao, e falta pra: ${semComemorar.join(', ')}\n` +
      semComemorar.map((s) => `conserto: node scripts/asset.mjs pose ${s} comemorar`).join('\n'))
  }

  const sigAdv = JOGO.siglaAdv || sigla(JOGO.adversario)
  const nomeEsq = JOGO.fora ? JOGO.adversario : JOGO.nomeBarca
  const nomeDir = JOGO.fora ? JOGO.nomeBarca : JOGO.adversario
  const gEsq = JOGO.fora ? gAdv : gBarca
  const gDir = JOGO.fora ? gBarca : gAdv
  const golsEsq = JOGO.fora ? JOGO.golsAdv : JOGO.golsBarca
  const golsDir = JOGO.fora ? JOGO.golsBarca : JOGO.golsAdv
  const corEsq = JOGO.fora ? INK : GARNET
  const corDir = JOGO.fora ? GARNET : INK

  // ---------------------------------------------------------------- composicao
  const ALT_MEIO = 570, ALT_LADO = 490
  const chao = 850
  const cxs = [230, W / 2, W - 230]
  const [esqP, meioP, dirP] = [
    await corpo(artes[0], ALT_LADO),
    await corpo(artes[1], ALT_MEIO),
    await corpo(artes[2], ALT_LADO),
  ]

  const defs = `<defs>
    <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="borrao" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>`
  const svg = (c) => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}${c}</svg>`)
  const sombra = (cx, y, w, op) => `<ellipse cx="${cx}" cy="${y}" rx="${Math.round(w * 0.42)}" ry="20" fill="${INK}" opacity="${op}" filter="url(#borrao)"/>`

  const fundo = `
    <rect width="${W}" height="${H}" fill="${PAPEL}"/>
    ${sombra(cxs[0], chao - 6, esqP.w, 0.14)}
    ${sombra(cxs[1], chao - 6, meioP.w, 0.20)}
    ${sombra(cxs[2], chao - 6, dirP.w, 0.14)}`

  const linhaPlacar = `${nomeEsq} ${gEsq} - ${gDir} ${nomeDir}`
  const fPlacar = fonteQueCabe(linhaPlacar, W - 190, 76)
  const fFaixa = 190, yFaixa = 905
  const yPlacar = yFaixa + fFaixa + 84
  const MARG = 96
  const frente = `
    <text x="${W / 2}" y="168" text-anchor="middle" font-family="${MARKER}" font-size="38" font-weight="bold" fill="${INK}" opacity="0.65" letter-spacing="3">${esc(JOGO.competicao)}${JOGO.local ? ` · ${esc(JOGO.local)}` : ''}</text>
    <g filter="url(#rough)"><rect x="86" y="${yFaixa}" width="${W - 172}" height="${fFaixa}" fill="${cor}" stroke="${GOLD}" stroke-width="9"/></g>
    <text x="${W / 2}" y="${yFaixa + 127}" text-anchor="middle" font-family="${ROUND}" font-size="96" font-weight="bold" fill="#fff" letter-spacing="5">FIM DE JOGO</text>
    <text x="${W / 2}" y="${yPlacar}" text-anchor="middle" font-family="${ROUND}" font-size="${fPlacar}" font-weight="bold" fill="${INK}" letter-spacing="0.5">${esc(nomeEsq)} <tspan fill="${GARNET}" font-size="${Math.round(fPlacar * 1.24)}">${gEsq}</tspan> <tspan fill="${GOLD}">-</tspan> <tspan fill="${GARNET}" font-size="${Math.round(fPlacar * 1.24)}">${gDir}</tspan> ${esc(nomeDir)}</text>
    <line x1="${MARG + 20}" y1="${yPlacar + 26}" x2="${W - MARG - 20}" y2="${yPlacar + 26}" stroke="${GOLD}" stroke-width="5" opacity="0.85"/>
    <text x="${MARG}" y="${yPlacar + 92}" text-anchor="start" font-family="${MARKER}" font-size="${fonteQueCabe(listaGols(golsEsq), 470, 34)}" font-weight="bold" fill="${corEsq}" opacity="${JOGO.fora ? 0.75 : 1}">${esc(listaGols(golsEsq))}</text>
    <text x="${W - MARG}" y="${yPlacar + 92}" text-anchor="end" font-family="${MARKER}" font-size="${fonteQueCabe(listaGols(golsDir), 470, 34)}" font-weight="bold" fill="${corDir}" opacity="${JOGO.fora ? 1 : 0.75}">${esc(listaGols(golsDir))}</text>
    ${JOGO.fecho ? `<text x="${W / 2}" y="${yPlacar + 206}" text-anchor="middle" font-family="${MARKER}" font-size="42" font-weight="bold" fill="${cor}" letter-spacing="1">${esc(JOGO.fecho)}</text>` : ''}
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="${INK}" stroke-width="14"/>
    <circle cx="${W - 96}" cy="96" r="46" fill="${CREAM}" stroke="${INK}" stroke-width="7"/>
    <path d="${star(W - 96, 96, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
    <text x="${W - 56}" y="${H - 46}" text-anchor="end" font-family="${ROUND}" font-size="30" font-weight="bold" fill="${GARNET}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">@devblaugrana</text>`

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([
      { input: svg(fundo), top: 0, left: 0 },
      { input: esqP.buf, left: Math.round(cxs[0] - esqP.w / 2), top: chao - ALT_LADO },
      { input: dirP.buf, left: Math.round(cxs[2] - dirP.w / 2), top: chao - ALT_LADO },
      { input: meioP.buf, left: Math.round(cxs[1] - meioP.w / 2), top: chao - ALT_MEIO },
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
  const id = `fim-${slugify(JOGO.adversario)}-${stamp}`
  const outRel = `quadrinhos/${id}/paineis/1.png`
  const outAbs = path.join(CONTEUDO_DIR, outRel)
  await fs.mkdir(path.dirname(outAbs), { recursive: true })
  await sharp(png).png().toFile(outAbs)
  console.log('painel ->', outAbs)

  const linhaSimples = `${nomeEsq} ${gEsq} x ${gDir} ${nomeDir}`
  const titulo = JOGO.titulo || linhaSimples
  const resultado = venceu ? 'Vitória do Barça' : empatou ? 'Empate' : 'Derrota do Barça'
  const legenda = JOGO.legenda ||
    `${resultado}. ${linhaSimples}, ${JOGO.competicao.toLowerCase()}${JOGO.local ? ` no ${JOGO.local}` : ''}. 🔵🔴\n\n` +
    `Gols do Barça: ${listaGols(JOGO.golsBarca) || 'nenhum'}.\n` +
    `${JOGO.adversario}: ${listaGols(JOGO.golsAdv) || 'nenhum'}.\n\n` +
    `#Barça #Barcelona #futebol #sagafut`

  const quad = {
    id, titulo: id, tipo: 'charge', selo: 'Fim de jogo', status: 'pronto',
    // A FAMÍLIA da peça, pro studio listar ela na categoria das montadas por código (que
    // continua mostrando a peça DEPOIS de publicada: a anterior é o gabarito da próxima).
    // Declarado, e não adivinhado pelo selo: o selo é rótulo de exibição e um quadrinho de
    // história pode usar o mesmo (`vaga-na-ponta` tem selo "Escalação" e é desenhado pela IA).
    porCodigo: 'fim-de-jogo',
    estiloId: 'rabisco-riso', estiloExtra: '', formato: '3:4', cenarioFixo: false,
    // ACABAMENTO DECLARADO: este card é montado inteiro por código e já sai pronto, então
    // não leva a moldura nem as legendas que o studio desenha nos quadrinhos de história
    // (o padrão de quadrinho novo). Declarado no dado, e não deixado em branco, pra ele não
    // ser arrastado por uma futura mudança de padrão: aqui o certo é 'nenhuma', não a ausência.
    moldura: 'nenhuma', legendaPorCodigo: false, carimboProgresso: false,
    elenco: [...JOGO.trio],
    contexto: `Card de FIM DE JOGO montado por CODIGO (gerar-fim-de-jogo.mjs), NAO regerar pelo studio. ` +
      `${linhaSimples} · ${JOGO.competicao}. Gols: ${listaGols(JOGO.golsBarca)} (Barça) / ${listaGols(JOGO.golsAdv)} (${JOGO.adversario}).`,
    legenda,
    paineis: [{
      numero: 1, roteiro: 'Card de fim de jogo (montado por codigo).', falas: [],
      promptImagem: '(card montado por codigo, nao regerar)', imagem: outRel, status: 'pronto',
    }],
    publicacao: {
      titulo,
      tiktok: `${linhaSimples} 🔵🔴 #Barça #FCBarcelona`,
      instagram: `${resultado}. ${linhaSimples} 🔵🔴 #Barça #FCBarcelona`,
      twitter: linhaSimples,
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
