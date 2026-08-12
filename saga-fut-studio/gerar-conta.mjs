// Gera o carrossel de A CONTA por CODIGO (nao por IA): um numero real absurdo, o duelo dele
// contra a referencia que o torna absurdo, e a fonte. Trocar de peca = trocar o objeto CONTA.
//
// POR QUE POR CODIGO: o que esta peca vende e NUMERO, e numero e exatamente onde o modelo de
// imagem erra (mesmo motivo do gerar-escalacao.mjs e do gerar-quiz.mjs). Aqui o custo de
// geracao e ZERO e o acervo e infinito, porque o coletor do FotMob ja existe e ja confere a
// soma contra o total oficial da temporada.
//
// POR QUE ESTE FORMATO EXISTE (12/08/2026): a serie "O Dia Em Que" tem UM gatilho, a
// curiosidade, e ele nao gera DISCORDANCIA (ninguem debate um fato consumado). A Conta abre
// esse buraco: o numero e conferivel, mas a leitura dele nao e, e e ai que nasce comentario.
//
//   node gerar-conta.mjs                    # gera os PNGs e registra o quadrinho no studio
//   DEV=1 node gerar-conta.mjs              # so escreve os PNGs, nao registra nada
//
// A REGRA QUE NAO SE NEGOCIA: todo numero daqui sai do coletor, nunca da memoria de quem
// escreve. O campo `fonte` de cada lado diz de onde veio e com que comando se confere de novo.
// Numero errado num post de futebol vira tribunal nos comentarios.
//
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { avatarImagem, baseImagem } from './shared/personagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { readDados, writeDados } from './server/store.mjs'

// ---------------------------------------------------------------- A CONTA
// Tudo que muda de uma peca pra outra vive aqui. O resto e template fixo.
//
// REGRA DO FORMATO: 3 slides. O 1 mostra o numero SEM contexto (o swipe e a revelacao), o 2 e o
// duelo, o 3 e a fonte mais a pergunta. Quatro slides ja diluem: o choque e a coisa mais
// peridivel do formato, e cada slide a mais e uma chance de perder a pessoa antes da conta.
const CONTA = {
  id: 'conta-yamal-oviedo',
  selo: 'A CONTA',

  // O NUMERO, sozinho, no slide 1. Sem unidade e sem dono: e isso que faz o swipe.
  numero: '27',
  chamada: 'PARTICIPAÇÕES EM GOL DE UM JOGADOR SÓ NA ÚLTIMA LALIGA',
  provocacao: 'GUARDA ESSE NÚMERO.',

  // O DUELO, no slide 2. O lado A e sempre a pessoa; o lado B e a referencia que faz o numero
  // doer. Os dois levam a mesma unidade, senao a comparacao e desonesta.
  a: {
    ficha: 'yamal-riso',
    valor: '27',
    quem: 'LAMINE YAMAL',
    detalhe: '16 GOLS + 11 ASSISTÊNCIAS',
    rodape: 'EM 28 JOGOS',
  },
  b: {
    escudo: true,
    valor: '26',
    quem: 'O REAL OVIEDO',
    detalhe: 'GOLS DO CLUBE INTEIRO',
    rodape: 'EM 38 JOGOS',
  },

  // O FECHO, no slide 3: a frase que resume, a fonte, e a pergunta que abre o comentario.
  fecho: {
    frase: 'UM JOGADOR DE 18 ANOS PARTICIPOU DE MAIS GOLS QUE UM CLUBE INTEIRO MARCOU.',
    fonte: 'LALIGA 2025/26 · DADOS FOTMOB, CONFERIDOS CONTRA O TOTAL OFICIAL DA TEMPORADA',
    cta: 'ISSO É GENIALIDADE OU LIGA FRACA? COMENTA AÍ',
  },

  titulo: 'Um jogador participou de mais gols que um clube inteiro marcou',
  legenda: 'Lamine Yamal participou de 27 gols na última LaLiga: 16 dele e 11 que ele deu, em 28 jogos. ' +
    'O Real Oviedo, o clube inteiro, marcou 26 em 38 jogos.\n\n' +
    'Ele terminou como maior garçom da liga e foi eleito o jogador da temporada. E enfrentou o Oviedo ' +
    'em janeiro, quando marcou.\n\n' +
    'Isso é genialidade ou é liga fraca? Comenta aí. 🔵🔴\n\n' +
    '#LamineYamal #Barcelona #Barça #LaLiga #RealOviedo #estatisticas #futebol #sagafut',
  contexto: 'PILOTO da série A CONTA (formato novo, 12/08/2026), montado por CODIGO ' +
    '(gerar-conta.mjs), NAO regerar pelo studio. O gatilho da série é o CHOQUE NUMERICO mais ' +
    'DEBATE: o número é conferível, a leitura dele não é, e é dali que sai comentário. É o ' +
    'formato de custo ZERO de geração da casa, e por isso o que sustenta volume.\n\n' +
    'NUMEROS CHECADOS (12/08/2026): Lamine Yamal, LaLiga 2025/26, 16 gols e 11 assistências em ' +
    '28 jogos (soma jogo a jogo pelo coletor, conferida contra o total oficial da temporada: ' +
    '`node scripts/dados/fotmob.mjs jogos 1467236 --liga=LaLiga --temporada=2025/2026`). ' +
    'Confirmado de forma independente por StatMuse e Tribuna, e o site oficial do FC Barcelona ' +
    'registra que ele foi o jogador da temporada da LaLiga 25/26 e o maior assistente da liga. ' +
    'Real Oviedo: 26 gols marcados na temporada, último colocado e rebaixado, pela tabela final ' +
    'da Wikipedia da 2025-26 La Liga (GF 26, GA 60, 29 pontos). Barcelona campeão com 95 gols.\n\n' +
    'DIVERGENCIA REGISTRADA: uma leitura da tabela da Wikipedia devolveu 7 gols para Yamal na ' +
    'temporada. O 7 é o número de gols FORA DE CASA (9 em casa, 7 fora, 16 no total), e não o ' +
    'total. A versão usada é 16, que é a que o coletor soma jogo a jogo e a que a fonte oficial ' +
    'do clube sustenta.\n\n' +
    'NAO USADO no card, por ser detalhe e não caber em três slides: Yamal enfrentou o Oviedo em ' +
    '25/01/2026 e marcou naquele jogo. Ficou só na legenda do post.',
}

// ---------------------------------------------------------------- TEMA (o mesmo da casa)
const W = 1152, H = 1536
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414'
const PAPEL = '#e7dcc6'
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"

// COLUNA DE SEGURANCA: ao arrastar, o Instagram mostra uma faixa da borda esquerda do próximo
// slide. Nada que seja revelação pode morar ali. Aqui o slide 2 começa pelo número que o slide
// 1 já mostrou, então a borda esquerda é segura de propósito.
const SAFE = 130

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// QUEBRA DE LINHA: o sharp nao mede texto, entao a largura sai de uma estimativa por caractere
// (0.56 do corpo, medido nas maiusculas da Chalkboard SE). O corpo DIMINUI ate caber, porque
// encolher e sempre melhor que estourar a caixa.
function quebrar(texto, larguraMax, corpo, k = 0.56) {
  const max = Math.max(8, Math.floor(larguraMax / (corpo * k)))
  const linhas = []
  let atual = ''
  for (const palavra of String(texto).split(/\s+/)) {
    const teste = atual ? atual + ' ' + palavra : palavra
    if (teste.length <= max) { atual = teste; continue }
    if (atual) linhas.push(atual)
    atual = palavra
  }
  if (atual) linhas.push(atual)
  return linhas
}

function ajustar(texto, larguraMax, corpoIdeal, maxLinhas, corpoMin = 24) {
  let corpo = corpoIdeal
  let linhas = quebrar(texto, larguraMax, corpo)
  while (linhas.length > maxLinhas && corpo > corpoMin) {
    corpo -= 2
    linhas = quebrar(texto, larguraMax, corpo)
  }
  return { corpo, linhas }
}

function bloco(linhas, { x, y, corpo, fill, familia = ROUND, peso = 'bold', anchor = 'middle', lh = 1.18, espaco = 0, traco = null }) {
  return linhas.map((l, i) => {
    const contorno = traco ? ` stroke="${traco}" stroke-width="8" style="paint-order:stroke"` : ''
    return `<text x="${x}" y="${Math.round(y + i * corpo * lh)}" text-anchor="${anchor}" font-family="${familia}" ` +
      `font-size="${corpo}" font-weight="${peso}" fill="${fill}" letter-spacing="${espaco}"${contorno}>${esc(l)}</text>`
  }).join('')
}

// ---------------------------------------------------------------- recorte do busto
// Copiado do gerar-quiz.mjs de propósito: cada gerador de card da casa é autocontido, e a
// alternativa (um shared de cards) só se paga quando houver um terceiro consumidor.
function removerMagenta(data, w, h) {
  for (let i = 0; i < w * h * 4; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r - g > 55 && b - g > 55) data[i + 3] = 0
  }
}

function removerFundo(data, w, h) {
  const amostra = []
  for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 24))) amostra.push(x * 4)
  for (let y = 0; y < Math.floor(h * 0.15); y += Math.max(1, Math.floor(h / 24))) {
    amostra.push(y * w * 4, (y * w + w - 1) * 4)
  }
  let br = 0, bg = 0, bb = 0
  for (const i of amostra) { br += data[i]; bg += data[i + 1]; bb += data[i + 2] }
  br /= amostra.length; bg /= amostra.length; bb /= amostra.length
  const THR = 70 * 70
  const perto = (i) => {
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb
    return dr * dr + dg * dg + db * db < THR
  }
  const visited = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
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

async function busto(id, tamBruto) {
  const tam = Math.round(tamBruto)
  const avatarAbs = path.join(CONTEUDO_DIR, avatarImagem(id))
  const fichaAbs = path.join(CONTEUDO_DIR, baseImagem(id))
  const temAvatar = await fs.access(avatarAbs).then(() => true).catch(() => false)
  if (!temAvatar && !(await fs.access(fichaAbs).then(() => true).catch(() => false))) {
    // FALTA DE ARTE E ERRO FATAL, NAO AVISO: card de dado sem o rosto vira número solto.
    throw new Error(`sem ficha (base.png) nem avatar pra "${id}"`)
  }

  let raw
  if (temAvatar) {
    raw = await sharp(avatarAbs).resize(tam, tam, { fit: 'cover', position: 'top' }).ensureAlpha().raw().toBuffer()
  } else {
    const m = await sharp(fichaAbs).metadata()
    const t = await sharp(fichaAbs).trim({ threshold: 28 }).toBuffer({ resolveWithObject: true }).catch(() => null)
    const offX = t ? -(t.info.trimOffsetLeft || 0) : 0
    const offY = t ? -(t.info.trimOffsetTop || 0) : 0
    const bw = t ? t.info.width : m.width
    const bh = t ? t.info.height : m.height
    const lado = Math.min(m.width, m.height, Math.round(bh * 0.58))
    const left = Math.min(Math.max(0, Math.round(offX + bw / 2 - lado / 2)), m.width - lado)
    const top = Math.min(Math.max(0, Math.round(offY - lado * 0.06)), m.height - lado)
    raw = await sharp(fichaAbs).extract({ left, top, width: lado, height: lado })
      .resize(tam, tam).ensureAlpha().raw().toBuffer()
  }
  removerMagenta(raw, tam, tam)
  removerFundo(raw, tam, tam)
  const png = await sharp(raw, { raw: { width: tam, height: tam, channels: 4 } }).png().toBuffer()

  const disco = Buffer.from(`<svg width="${tam}" height="${tam}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="50%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#4a3040"/><stop offset="60%" stop-color="#3a2436"/><stop offset="100%" stop-color="#221826"/>
    </radialGradient></defs>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="url(#g)"/></svg>`)
  const mask = Buffer.from(`<svg width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="#fff"/></svg>`)
  const anel = Buffer.from(`<svg width="${tam}" height="${tam}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2 - 5}" fill="none" stroke="${INK}" stroke-width="9"/>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2 - 13}" fill="none" stroke="${GOLD}" stroke-width="4"/></svg>`)

  return sharp(disco)
    .composite([{ input: png, top: 0, left: 0 }, { input: mask, blend: 'dest-in' }, { input: anel, top: 0, left: 0 }])
    .png().toBuffer()
}

// ESCUDO GENERICO do adversário, desenhado por código: um brasão liso, sem cor de clube real e
// sem sigla. A regra da casa proíbe escudo real na ARTE GERADA porque o modelo desenhava o
// verdadeiro; aqui é composição, e a escolha é editorial: o lado B da conta é sempre "um clube",
// e desenhar o escudo real dele transformaria a peça em provocação a um time específico.
//
// Ele vai DENTRO do mesmo disco escuro com anel dourado do busto, e não solto ao lado dele. Na
// primeira versão o brasão flutuava sozinho e lia como maior e mais alto que o rosto, mesmo com
// o centro no mesmo y: forma de escudo é mais alta que larga, e o olho compara a silhueta, não a
// caixa. Com os dois no mesmo disco, os lados da conta pesam igual, que é o ponto da peça.
function brasao(cx, cy, tam) {
  const w = tam * 0.52, h = w * 1.08, x = cx - w / 2, y = cy - h / 2, r = w * 0.11
  const forma = `M${x} ${y + r} a${r} ${r} 0 0 1 ${r} ${-r} L${x + w - r} ${y} ` +
    `a${r} ${r} 0 0 1 ${r} ${r} L${x + w} ${y + h * 0.50} ` +
    `C${x + w} ${y + h * 0.83} ${x + w * 0.66} ${y + h} ${cx} ${y + h} ` +
    `C${x + w * 0.34} ${y + h} ${x} ${y + h * 0.83} ${x} ${y + h * 0.50} Z`
  const bolaR = w * 0.22
  const gomo = [0, 72, 144, 216, 288].map((a, i) => {
    const rad = (a - 90) * Math.PI / 180
    return (i ? 'L' : 'M') + (cx + bolaR * 0.44 * Math.cos(rad)).toFixed(1) + ' ' +
      (cy + bolaR * 0.44 * Math.sin(rad)).toFixed(1)
  }).join(' ') + 'Z'
  const rd = tam / 2
  return `<g>
    <defs><radialGradient id="gb" cx="50%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#4a3040"/><stop offset="60%" stop-color="#3a2436"/><stop offset="100%" stop-color="#221826"/>
    </radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${rd}" fill="url(#gb)"/>
    <path d="${forma}" fill="#4a4a4a" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="${cx}" cy="${cy}" r="${bolaR}" fill="${CREAM}" stroke="${INK}" stroke-width="6"/>
    <path d="${gomo}" fill="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${rd - 5}" fill="none" stroke="${INK}" stroke-width="9"/>
    <circle cx="${cx}" cy="${cy}" r="${rd - 13}" fill="none" stroke="${GOLD}" stroke-width="4"/>
  </g>`
}

function moldura(fundo) {
  return `<rect width="${W}" height="${H}" fill="${fundo}"/>
    <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${INK}" stroke-width="9" rx="26"/>`
}

// Selo da série no topo, o mesmo lugar em todo slide: é ele que faz a peça ser reconhecida
// como parte de uma série já no terceiro post.
function selo(n, total) {
  const fx = W / 2, fy = 108, fw = 430, fh = 76
  return `<rect x="${fx - fw / 2}" y="${fy - fh / 2}" width="${fw}" height="${fh}" rx="${fh / 2}"
      fill="${GOLD}" stroke="${INK}" stroke-width="8"/>
    <text x="${fx}" y="${fy + 17}" text-anchor="middle" font-family="${ROUND}" font-size="44"
      font-weight="bold" fill="${INK}" letter-spacing="6">${esc(CONTA.selo)}</text>
    <text x="${W - 74}" y="${fy + 16}" text-anchor="end" font-family="${ROUND}" font-size="34"
      font-weight="bold" fill="${CREAM}" opacity="0.7">${n}/${total}</text>`
}

// ---------------------------------------------------------------- os três slides
async function slideNumero(total) {
  const cha = ajustar(CONTA.chamada, W - SAFE * 2, 56, 3)
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${moldura(GARNET)}
    ${selo(1, total)}
    <text x="${W / 2}" y="${H * 0.50}" text-anchor="middle" font-family="${ROUND}" font-size="520"
      font-weight="bold" fill="${GOLD}" stroke="${INK}" stroke-width="18"
      style="paint-order:stroke">${esc(CONTA.numero)}</text>
    ${bloco(cha.linhas, { x: W / 2, y: H * 0.635, corpo: cha.corpo, fill: CREAM })}
    <text x="${W / 2}" y="${H * 0.855}" text-anchor="middle" font-family="${ROUND}" font-size="52"
      font-weight="bold" fill="${GOLD}" letter-spacing="3">${esc(CONTA.provocacao)}</text>
    <text x="${W / 2}" y="${H * 0.915}" text-anchor="middle" font-family="${ROUND}" font-size="38"
      font-weight="bold" fill="${CREAM}" opacity="0.75">ARRASTA →</text>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function slideDuelo(total) {
  const colL = W * 0.27, colR = W * 0.73
  const yDisco = H * 0.335, disco = 300
  const yValor = H * 0.60, yQuem = H * 0.685, yDet = H * 0.745, yRod = H * 0.80

  const lado = (c, x) => {
    const det = ajustar(c.detalhe, W * 0.42, 36, 2)
    return `
      <text x="${x}" y="${yValor}" text-anchor="middle" font-family="${ROUND}" font-size="190"
        font-weight="bold" fill="${GOLD}" stroke="${INK}" stroke-width="12"
        style="paint-order:stroke">${esc(c.valor)}</text>
      <text x="${x}" y="${yQuem}" text-anchor="middle" font-family="${ROUND}" font-size="46"
        font-weight="bold" fill="${CREAM}">${esc(c.quem)}</text>
      ${bloco(det.linhas, { x, y: yDet, corpo: det.corpo, fill: CREAM })}
      <text x="${x}" y="${yRod}" text-anchor="middle" font-family="${ROUND}" font-size="32"
        font-weight="bold" fill="${GOLD}" opacity="0.85">${esc(c.rodape)}</text>`
  }

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${moldura(NAVY)}
    ${selo(2, total)}
    <line x1="${W / 2}" y1="${H * 0.20}" x2="${W / 2}" y2="${H * 0.84}" stroke="${INK}" stroke-width="7" opacity="0.45"/>
    ${CONTA.b.escudo ? brasao(colR, yDisco, disco) : ''}
    ${lado(CONTA.a, colL)}
    ${lado(CONTA.b, colR)}
    <circle cx="${W / 2}" cy="${yValor - 60}" r="66" fill="${GARNET}" stroke="${INK}" stroke-width="9"/>
    <text x="${W / 2}" y="${yValor - 36}" text-anchor="middle" font-family="${ROUND}" font-size="82"
      font-weight="bold" fill="${CREAM}">&gt;</text>
    <text x="${W / 2}" y="${H * 0.895}" text-anchor="middle" font-family="${ROUND}" font-size="40"
      font-weight="bold" fill="${CREAM}" opacity="0.8">NA MESMA LIGA, NA MESMA TEMPORADA</text>
  </svg>`

  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const av = await busto(CONTA.a.ficha, disco)
  return sharp(png).composite([{
    input: av, left: Math.round(colL - disco / 2), top: Math.round(yDisco - disco / 2),
  }]).png().toBuffer()
}

async function slideFecho(total) {
  const fr = ajustar(CONTA.fecho.frase, W - SAFE * 2, 76, 5)
  const fo = ajustar(CONTA.fecho.fonte, W - SAFE * 2, 30, 3)
  const ct = ajustar(CONTA.fecho.cta, W - SAFE * 2, 50, 2)
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${moldura(GARNET)}
    ${selo(3, total)}
    ${bloco(fr.linhas, { x: W / 2, y: H * 0.35, corpo: fr.corpo, fill: CREAM, lh: 1.22 })}
    <rect x="${SAFE}" y="${H * 0.615}" width="${W - SAFE * 2}" height="7" fill="${GOLD}" opacity="0.7"/>
    ${bloco(fo.linhas, { x: W / 2, y: H * 0.685, corpo: fo.corpo, fill: CREAM, lh: 1.3, espaco: 1 })}
    ${bloco(ct.linhas, { x: W / 2, y: H * 0.84, corpo: ct.corpo, fill: GOLD, lh: 1.2, traco: INK })}
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ---------------------------------------------------------------- main
async function main() {
  const total = 3
  const pngs = [await slideNumero(total), await slideDuelo(total), await slideFecho(total)]

  const dir = path.join(CONTEUDO_DIR, 'quadrinhos', CONTA.id, 'paineis')
  await fs.mkdir(dir, { recursive: true })

  const paineis = []
  for (let i = 0; i < pngs.length; i++) {
    const rel = `quadrinhos/${CONTA.id}/paineis/${i + 1}.png`
    await sharp(pngs[i]).png().toFile(path.join(CONTEUDO_DIR, rel))
    paineis.push({
      numero: i + 1,
      roteiro: ['O número sozinho, sem dono: o swipe é a revelação.',
        'O duelo: a pessoa contra a referência que faz o número doer.',
        'A frase que resume, a fonte, e a pergunta que abre o comentário.'][i],
      falas: [],
      legendas: [],
      promptImagem: '(card montado por codigo, nao regerar)',
      imagem: rel,
      status: 'pronto',
    })
  }
  console.log(`${pngs.length} slides ->`, dir)

  if (process.env.DEV) { console.log('modo DEV: quadrinho nao registrado'); return }

  const quad = {
    id: CONTA.id, titulo: CONTA.id, tipo: 'carrossel', selo: CONTA.selo, status: 'pronto',
    // A FAMÍLIA da peça, pro studio listar ela na categoria das montadas por código (que
    // continua mostrando a peça DEPOIS de publicada: a anterior é o gabarito da próxima).
    // Declarado, e não adivinhado pelo selo: o selo é rótulo de exibição e um quadrinho de
    // história pode usar o mesmo (`vaga-na-ponta` tem selo "Escalação" e é desenhado pela IA).
    porCodigo: 'conta',
    estiloId: 'rabisco-riso', estiloExtra: '', formato: '3:4', cenarioFixo: false,
    // ACABAMENTO DECLARADO: montado inteiro por codigo, ja sai com moldura, selo e carimbo
    // proprios. Nao leva o acabamento que o studio desenha nos quadrinhos de historia.
    moldura: 'nenhuma', legendaPorCodigo: false, carimboProgresso: false,
    elenco: [CONTA.a.ficha].filter(Boolean),
    contexto: CONTA.contexto, legenda: CONTA.legenda, paineis,
    videoMusica: 'epico-take-a-chance.mp3',
    trilhaSugestoes: [
      { arquivo: 'epico-take-a-chance.mp3', porque: 'o card é um soco de três slides: a faixa entra junto com o número e não sobra tempo pra respirar' },
      { arquivo: 'zoeira-monkeys-spinning-monkeys.mp3', porque: 'se a leitura for deboche do lado que perdeu a comparação, o som de meme entrega o tom e ainda dá alcance no TikTok' },
      { arquivo: 'gloria-reign.mp3', porque: 'se o peso for na consagração do jogador e não no contraste, vira homenagem em vez de provocação' },
    ],
    publicacao: {
      titulo: CONTA.titulo,
      tiktok: CONTA.legenda, instagram: CONTA.legenda, twitter: CONTA.titulo,
      youtube: { titulo: '', descricao: '' },
    },
  }

  // o studio mantem o project.json em memoria e sobrescreve o disco no proximo save:
  // com ele aberto, gravar direto no disco some sem aviso. Por isso a API vem primeiro.
  const API = 'http://localhost:4600/api/dados'
  try {
    const d = await (await fetch(API)).json()
    d.quadrinhos = (d.quadrinhos || []).filter((q) => q.id !== CONTA.id)
    d.quadrinhos.push(quad)
    if (Array.isArray(d.quadrinhoOrder) && !d.quadrinhoOrder.includes(CONTA.id)) d.quadrinhoOrder.unshift(CONTA.id)
    const r = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    if (!r.ok) throw new Error('PUT ' + r.status)
    console.log('quadrinho registrado no studio (via API):', CONTA.id)
  } catch (e) {
    const d = await readDados()
    d.quadrinhos = (d.quadrinhos || []).filter((q) => q.id !== CONTA.id)
    d.quadrinhos.push(quad)
    await writeDados(d)
    console.log('quadrinho gravado no disco (studio fechado):', CONTA.id, '|', e.message)
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
