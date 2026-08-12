// Gera o CARROSSEL DE QUIZ por CODIGO (nao por IA): pergunta num slide, resposta no
// seguinte, ate o placar final. Trocar de quiz = trocar o objeto QUIZ.
//
// POR QUE POR CODIGO: o conteudo aqui e NOTICIA (valor, clube, data, clausula), e noticia
// tem prazo de validade de horas. Gerar 8 paineis na IA custaria o dia inteiro e o assunto
// esfria antes de sair; alem disso o que este formato vende e TEXTO, e texto e exatamente
// onde o modelo de imagem erra. Mesmo motivo do gerar-escalacao.mjs e do gerar-gol.mjs.
//
//   node gerar-quiz.mjs                    # gera os PNGs e registra o quadrinho no studio
//   DEV=1 node gerar-quiz.mjs              # so escreve os PNGs, nao registra nada
//
import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { avatarImagem, baseImagem } from './shared/personagem.mjs'
import { CONTEUDO_DIR } from './server/config.mjs'
import { readDados, writeDados } from './server/store.mjs'

// ---------------------------------------------------------------- O QUIZ
// Tudo que muda de um quiz pro outro vive aqui. O resto e template fixo.
//
// REGRA DO FORMATO: 3 rodadas (pergunta + resposta) = 8 slides com capa e fecho, que e o
// otimo do carrossel (7 a 10). 4 rodadas viram 10 slides e a ultima quase ninguem ve.
const QUIZ = {
  id: 'quiz-janela-260808',
  selo: 'ADIVINHA',
  capa: {
    titulo: 'VOCÊ ACOMPANHA MESMO A JANELA DO BARÇA?',
    sub: '3 perguntas. Sem Google.',
    escudo: true,   // escudo da casa desenhado por codigo; troque por `ficha: '<slug>'` pra usar um personagem
  },
  rodadas: [
    {
      ficha: 'araujo-riso',
      contexto: 'Araújo saiu emprestado pro Liverpool.',
      pergunta: 'QUAL A OPÇÃO DE COMPRA?',
      dica: 'chuta: 35, 55 ou 80 milhões',
      resposta: '55 MILHÕES',
      detalhe: 'E a compra NÃO é obrigatória. O Liverpool ainda banca 100% do salário e não pagou ' +
        'taxa de empréstimo nenhuma. Contrato dele com o Barça vai até 2031.',
    },
    {
      // rodada de MULTIPLA ESCOLHA: cada opcao leva o busto de quem ela cita, pra o slide ser
      // lido em 2 segundos sem depender de ler as tres linhas inteiras.
      pergunta: 'UMA DESSAS TRÊS É MENTIRA.',
      opcoes: [
        { letra: 'A', ficha: 'rodri-riso', texto: 'Rodri tem preferência pelo Barcelona' },
        { letra: 'B', ficha: 'ferran-riso', texto: 'Ferran pretende ir pro PSG' },
        { letra: 'C', ficha: 'alvarez-atletico-riso', texto: 'O Barcelona desistiu do Álvarez' },
      ],
      resposta: 'É A LETRA C',
      detalhe: 'O Barça não desistiu: o Deco foi a Madri falar com o empresário do argentino. O ' +
        'Atlético se recusa a negociar e já reclamou na RFEF e na FIFA. As outras duas são verdade.',
      fichaResposta: 'alvarez-atletico-riso',
    },
    {
      // sem ficha no acervo (Ansu Fati nao e personagem da casa): o slide usa a CAMISA 10
      // desenhada por codigo. Melhor que inventar caricatura ou pedir ficha nova pra um
      // jogador que ja saiu do clube.
      camisa: 10,
      pergunta: 'QUANTO O BARÇA RECEBEU PELO ANSU FATI?',
      dica: 'chuta: 5, 11 ou 25 milhões',
      resposta: '11 MILHÕES',
      detalhe: 'O Monaco ativou a opção de compra e ele assinou até 2030. Na última temporada ' +
        'fez 12 gols em 30 jogos na Ligue 1.',
    },
  ],
  fecho: {
    titulo: 'QUANTAS VOCÊ ACERTOU?',
    faixas: [
      ['3', 'você acompanha mesmo'],
      ['2', 'você lê só manchete'],
      ['0-1', 'bem-vindo de volta, sumido'],
    ],
    cta: 'COMENTA AÍ',
  },
  // publicacao (obrigatoria pra o quadrinho ser aceito pelo studio)
  titulo: 'Você acompanha mesmo a janela do Barça?',
  legenda: 'Três perguntas sobre a janela do Barcelona pra você testar se está por dentro.\n\n' +
    'Ronald Araújo foi emprestado ao Liverpool com opção de compra de 55 milhões, sem obrigação, ' +
    'e com os ingleses pagando o salário inteiro. Rodri já acertou os termos pessoais e prefere o ' +
    'Barça. Ferran Torres deu o sim ao PSG. E o Barcelona segue atrás de Julián Álvarez, com o ' +
    'Atlético reclamando na RFEF e na FIFA. Ansu Fati saiu por 11 milhões pro Monaco.\n\n' +
    'Quantas você acertou? Comenta aí. 🔵🔴\n\n' +
    '#Barcelona #Barça #FCBarcelona #Araujo #Rodri #FerranTorres #JulianAlvarez #AnsuFati ' +
    '#mercadodabola #futebol #devblaugrana',
  contexto: 'Carrossel de QUIZ montado por CODIGO (gerar-quiz.mjs), NAO regerar pelo studio. ' +
    'Fatos checados em 08/08/2026: (1) Araujo emprestado ao Liverpool por uma temporada, opcao ' +
    'de compra de EUR 55 mi NAO obrigatoria, Liverpool paga 100% do salario e nao ha taxa de ' +
    'emprestimo, contrato com o Barca ate 2031, exames medicos em 08/08 (Romano via Barca ' +
    'Universal / Football365). (2) Rodri acertou termos pessoais e prefere o Barca ao Madrid; ' +
    'Barca oferece 50, City pede 60-70 (Barca Blaugranes). (3) Ferran deu o sim ao PSG, Barca ' +
    'ouve a partir de 50 mi, prazo pratico 12/08 (Fichajes / Forbes). (4) Barca NAO desistiu de ' +
    'Julian Alvarez: Deco foi a Madri falar com o empresario, Atletico se recusa a negociar e ' +
    'reclamou na RFEF e na FIFA, contrato ate 2030 (Depor). (5) Ansu Fati vendido ao Monaco por ' +
    'EUR 11 mi, contrato ate 2030, 12 gols em 30 jogos na Ligue 1 (Flashscore / Goal). ' +
    'VALIDADE CURTA: os itens de Ferran e Rodri podem virar a qualquer momento.',
}

// ---------------------------------------------------------------- TEMA (o mesmo da casa)
const W = 1152, H = 1536
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414', PLATE = '#1c1c1c'
const PAPEL = '#e7dcc6'
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"
const MARKER = "'Marker Felt', 'Chalkboard SE', sans-serif"

// COLUNA DE SEGURANCA: ao arrastar, o Instagram mostra uma faixa da borda esquerda do
// proximo slide. Se a resposta morar ali, o swipe entrega o gabarito antes da hora.
// Todo texto de resposta comeca depois desta margem.
const SAFE = 150

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')

function star(cx, cy, rO, rI) {
  let p = ''
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rI : rO
    const a = -Math.PI / 2 + i * Math.PI / 5
    p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)
  }
  return p + 'Z'
}

// QUEBRA DE LINHA: o sharp nao mede texto, entao a largura sai de uma estimativa por
// caractere (0.56 do corpo, medido nas maiusculas da Chalkboard SE). O corpo DIMINUI ate o
// texto caber no numero de linhas pedido, porque enunciado comprido e a regra, nao a excecao.
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

function ajustar(texto, larguraMax, corpoIdeal, maxLinhas, corpoMin = 26) {
  let corpo = corpoIdeal
  let linhas = quebrar(texto, larguraMax, corpo)
  while (linhas.length > maxLinhas && corpo > corpoMin) {
    corpo -= 2
    linhas = quebrar(texto, larguraMax, corpo)
  }
  return { corpo, linhas }
}

function bloco(linhas, { x, y, corpo, fill, familia = ROUND, peso = 'bold', anchor = 'middle', lh = 1.18, espaco = 0 }) {
  return linhas.map((l, i) =>
    `<text x="${x}" y="${Math.round(y + i * corpo * lh)}" text-anchor="${anchor}" font-family="${familia}" ` +
    `font-size="${corpo}" font-weight="${peso}" fill="${fill}" letter-spacing="${espaco}">${esc(l)}</text>`
  ).join('')
}

// MAGENTA DO AVATAR: o avatar vem com chroma key magenta chapado. O flood-fill sozinho deixa
// uma franja rosa nas bordas antialiasadas (magenta misturado com o contorno preto), e ela
// aparece como um fio roxo em volta da cabeca. Aqui o teste e por MATIZ, nao por distancia:
// magenta e o unico tom em que R e B sobem juntos e G fica pra tras, o que nao acontece em
// nenhuma cor do personagem (a camisa grena tem R alto mas B baixo).
function removerMagenta(data, w, h) {
  for (let i = 0; i < w * h * 4; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r - g > 55 && b - g > 55) data[i + 3] = 0
  }
}

// ---------------------------------------------------------------- recorte do busto
// Flood-fill do gerar-escalacao, com uma correcao: a cor do fundo sai do TOPO, nao da media
// dos quatro cantos. No recorte de cabeca e ombros os cantos de baixo caem na camisa, e a
// media entre papel e camisa nao e parecida com nenhum dos dois, entao nada era removido e o
// busto saia com o retangulo bege da ficha dentro do disco (foi o que aconteceu com Rodri e
// Alvarez, os dois sem avatar).
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

// Busto num disco, do jeito dos tokens da escalacao. Prefere o AVATAR (busto desenhado sob
// medida); sem avatar, recorta a cabeca da ficha full-body.
async function busto(id, tamBruto) {
  // o tamanho chega calculado do vao que sobrou no slide, entao vem fracionario: o sharp
  // recusa dimensao nao inteira e o gerador morre no meio.
  const tam = Math.round(tamBruto)
  const avatarAbs = path.join(CONTEUDO_DIR, avatarImagem(id))
  const fichaAbs = path.join(CONTEUDO_DIR, baseImagem(id))
  const temAvatar = await fs.access(avatarAbs).then(() => true).catch(() => false)
  if (!temAvatar && !(await fs.access(fichaAbs).then(() => true).catch(() => false))) {
    // FALTA DE ARTE E ERRO FATAL, NAO AVISO: o card de escalacao ja saiu inteiro vazio uma vez
    // porque a arte mudou de pasta e o gerador so imprimiu um warn.
    throw new Error(`sem ficha (base.png) nem avatar pra "${id}"`)
  }

  let raw
  if (temAvatar) {
    raw = await sharp(avatarAbs).resize(tam, tam, { fit: 'cover', position: 'top' }).ensureAlpha().raw().toBuffer()
  } else {
    // FICHA FULL-BODY: a janela do busto sai do BOUNDING BOX do personagem, nao de fracoes da
    // imagem. Neste estilo a cabeca ocupa quase 45% da altura do corpo e e mais larga que o
    // tronco, entao qualquer recorte "por porcentagem da imagem" ou corta o queixo ou devolve
    // o boneco inteiro de longe. E a janela e QUADRADA, recortada da imagem ORIGINAL (que tem
    // papel de sobra dos lados), pra o resize nao cortar nem esticar nada.
    const m = await sharp(fichaAbs).metadata()
    const t = await sharp(fichaAbs).trim({ threshold: 28 }).toBuffer({ resolveWithObject: true }).catch(() => null)
    const offX = t ? -(t.info.trimOffsetLeft || 0) : 0
    const offY = t ? -(t.info.trimOffsetTop || 0) : 0
    const bw = t ? t.info.width : m.width
    const bh = t ? t.info.height : m.height
    // 0.58 da altura do corpo, nao 0.46: a janela mais fechada enche o disco so com a cara e
    // fica destoando dos personagens que TEM avatar (esses vem com cabeca e ombros e sobra
    // fundo). O mesmo carrossel mistura os dois, entao o enquadramento tem que casar.
    const lado = Math.min(m.width, m.height, Math.round(bh * 0.58))
    const left = Math.min(Math.max(0, Math.round(offX + bw / 2 - lado / 2)), m.width - lado)
    const top = Math.min(Math.max(0, Math.round(offY - lado * 0.06)), m.height - lado)
    raw = await sharp(fichaAbs)
      .extract({ left, top, width: lado, height: lado })
      .resize(tam, tam)
      .ensureAlpha().raw().toBuffer()
  }
  removerMagenta(raw, tam, tam)
  removerFundo(raw, tam, tam)
  const png = await sharp(raw, { raw: { width: tam, height: tam, channels: 4 } }).png().toBuffer()

  const disco = Buffer.from(`<svg width="${tam}" height="${tam}" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="g" cx="50%" cy="32%" r="80%">
      <stop offset="0%" stop-color="#4a3040"/><stop offset="60%" stop-color="#3a2436"/><stop offset="100%" stop-color="#221826"/>
    </radialGradient></defs>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="url(#g)"/></svg>`)
  const mask = Buffer.from(
    `<svg width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2}" fill="#fff"/></svg>`)
  const anel = Buffer.from(`<svg width="${tam}" height="${tam}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2 - 5}" fill="none" stroke="${INK}" stroke-width="9"/>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${tam / 2 - 13}" fill="none" stroke="${GOLD}" stroke-width="4"/></svg>`)

  return sharp(disco)
    .composite([{ input: png, top: 0, left: 0 }, { input: mask, blend: 'dest-in' }, { input: anel, top: 0, left: 0 }])
    .png().toBuffer()
}

// CAMISA desenhada por codigo, pro slide de quem nao tem ficha no acervo (jogador que ja saiu).
// Listras da casa, numero grande, sem escudo nenhum (regra da casa: nada de marca real).
function camisa(cx, cy, larg, num) {
  const h = larg * 1.18, x = cx - larg / 2, y = cy - h / 2
  const corpo = `M${x + larg * 0.22} ${y} L${x + larg * 0.78} ${y} L${x + larg} ${y + h * 0.20} ` +
    `L${x + larg * 0.86} ${y + h * 0.34} L${x + larg * 0.86} ${y + h} L${x + larg * 0.14} ${y + h} ` +
    `L${x + larg * 0.14} ${y + h * 0.34} L${x} ${y + h * 0.20} Z`
  const listras = [0.20, 0.40, 0.60].map((f) =>
    `<rect x="${x + larg * f}" y="${y + h * 0.04}" width="${larg * 0.10}" height="${h * 0.96}" fill="${NAVY}"/>`).join('')
  // GOLA: meia-lua preenchida na cor do papel. Na primeira versao era so um arco de contorno e
  // lia como um rasgo preto no meio do peito.
  const golaR = larg * 0.13
  return `<g>
    <clipPath id="camisaClip"><path d="${corpo}"/></clipPath>
    <path d="${corpo}" fill="${GARNET}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <g clip-path="url(#camisaClip)">${listras}</g>
    <path d="${corpo}" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M${cx - golaR} ${y - 2} a${golaR} ${golaR * 0.92} 0 0 0 ${golaR * 2} 0 Z"
      fill="${PAPEL}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <text x="${cx}" y="${y + h * 0.80}" text-anchor="middle" font-family="${ROUND}" font-size="${Math.round(h * 0.44)}"
      font-weight="bold" fill="${GOLD}" stroke="${INK}" stroke-width="6" style="paint-order:stroke">${num}</text>
  </g>`
}

// ESCUDO desenhado por codigo, no traco da casa (contorno grosso, cores do tema), pra nao
// destoar do resto do carrossel. Se voce preferir o arquivo oficial, basta por um PNG com
// fundo transparente em `assets/escudo.png`: o gerador usa ele e ignora este desenho.
//
// A regra da casa que proibe escudo real vale pra GERACAO por IA (o promptRules existe porque
// o modelo desenhava o verdadeiro no peito e no placar). Aqui e composicao por codigo, e a
// escolha e editorial.
const ESCUDO_ARQUIVO = 'assets/escudo.png'

function escudo(cx, cy, larg) {
  const w = larg, h = larg * 1.08, x = cx - w / 2, y = cy - h / 2, r = w * 0.11
  const forma = `M${x} ${y + r} a${r} ${r} 0 0 1 ${r} ${-r} L${x + w - r} ${y} ` +
    `a${r} ${r} 0 0 1 ${r} ${r} L${x + w} ${y + h * 0.50} ` +
    `C${x + w} ${y + h * 0.83} ${x + w * 0.66} ${y + h} ${cx} ${y + h} ` +
    `C${x + w * 0.34} ${y + h} ${x} ${y + h * 0.83} ${x} ${y + h * 0.50} Z`
  const faixaY = y + h * 0.38, faixaH = h * 0.16
  const topoH = faixaY - y
  // superior esquerdo: cruz de Sant Jordi. superior direito: senyera (4 barras).
  const cruz = `<rect x="${x}" y="${y}" width="${w / 2}" height="${topoH}" fill="#f3efe6"/>
    <rect x="${x + w * 0.19}" y="${y}" width="${w * 0.12}" height="${topoH}" fill="#c8302c"/>
    <rect x="${x}" y="${y + topoH * 0.38}" width="${w / 2}" height="${topoH * 0.26}" fill="#c8302c"/>`
  const senyera = `<rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${topoH}" fill="#f2c500"/>` +
    [0.03, 0.16, 0.29, 0.42].map((f) =>
      `<rect x="${x + w / 2 + w * f}" y="${y}" width="${w * 0.065}" height="${topoH}" fill="#c8302c"/>`).join('')
  // base: 7 listras finas, como no escudo de verdade (5 largas lia como bandeira)
  const listras = Array.from({ length: 7 }, (_, i) =>
    `<rect x="${x + (w / 7) * i}" y="${faixaY + faixaH}" width="${w / 7}" height="${h * 0.48}"
      fill="${i % 2 ? NAVY : GARNET}"/>`).join('')
  const bolaR = w * 0.135, bolaY = y + h * 0.755
  const gomo = [0, 72, 144, 216, 288].map((a, i) => {
    const rad = (a - 90) * Math.PI / 180
    return (i ? 'L' : 'M') + (cx + bolaR * 0.44 * Math.cos(rad)).toFixed(1) + ' ' +
      (bolaY + bolaR * 0.44 * Math.sin(rad)).toFixed(1)
  }).join(' ') + 'Z'
  return `<g>
    <clipPath id="escudoClip"><path d="${forma}"/></clipPath>
    <g clip-path="url(#escudoClip)">
      ${cruz}${senyera}${listras}
      <rect x="${x}" y="${faixaY}" width="${w}" height="${faixaH}" fill="#f2c500"/>
      <text x="${cx}" y="${faixaY + faixaH * 0.80}" text-anchor="middle" font-family="${ROUND}"
        font-size="${Math.round(faixaH * 0.86)}" font-weight="bold" fill="${GARNET}" letter-spacing="${w * 0.02}">FCB</text>
      <circle cx="${cx}" cy="${bolaY}" r="${bolaR}" fill="#f3efe6" stroke="${INK}" stroke-width="6"/>
      <path d="${gomo}" fill="${INK}"/>
      <rect x="${x}" y="${faixaY}" width="${w}" height="${faixaH}" fill="none" stroke="${INK}" stroke-width="7"/>
      <line x1="${x}" y1="${topoH * 0 + y + topoH}" x2="${x + w}" y2="${y + topoH}" stroke="${INK}" stroke-width="7"/>
      <line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + topoH}" stroke="${INK}" stroke-width="7"/>
    </g>
    <path d="${forma}" fill="none" stroke="${INK}" stroke-width="13" stroke-linejoin="round"/>
  </g>`
}

// ---------------------------------------------------------------- moldura da casa
const defs = `<defs>
  <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
    <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="borrao" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>`

const svg = (corpo) => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}${corpo}</svg>`)

// SETA DE CONTINUA, na borda direita e no meio da altura. Sem ela o slide parece a peca
// inteira: o carrossel do Instagram so mostra os pontinhos, que somem no fundo claro, e quem
// chega pelo Explore nem repara que ha mais. Some no ultimo slide, senao promete o que nao tem.
// Fica em x = W-96 com raio 36: a moldura interna termina em W-21, entao sobram ~39px de
// respiro entre a pastilha e o traco, e ela ainda nao encosta na area util do texto (W-110).
const seta = () => {
  const cx = W - 96, cy = H / 2, r = 36
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${GARNET}" stroke="${INK}" stroke-width="6"/>
    <path d="M${cx - 11} ${cy - 15} L${cx + 7} ${cy} L${cx - 11} ${cy + 15}" fill="none" stroke="${CREAM}"
      stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`
}

// CARIMBO DE PROGRESSO no canto superior ESQUERDO (o selo da estrela mora no direito):
// numeracao reduz abandono no meio do carrossel.
const moldura = (n, total) => `
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="${INK}" stroke-width="14"/>
  ${n < total ? seta() : ''}
  <circle cx="${W - 96}" cy="96" r="46" fill="${CREAM}" stroke="${INK}" stroke-width="7"/>
  <path d="${star(W - 96, 96, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
  <text x="96" y="112" text-anchor="middle" font-family="${ROUND}" font-size="38" font-weight="bold"
    fill="${GARNET}" stroke="${CREAM}" stroke-width="6" style="paint-order:stroke">${n}/${total}</text>
  <text x="${W - 56}" y="${H - 44}" text-anchor="end" font-family="${ROUND}" font-size="28" font-weight="bold"
    fill="${GARNET}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">@devblaugrana</text>`

// O halo tem que ser quase invisivel: a 0.06 ele virava uma bolha cinza no meio do papel,
// com borda visivel, e competia com o conteudo.
const fundoBase = `
  <rect width="${W}" height="${H}" fill="${PAPEL}"/>
  <radialGradient id="halo" cx="50%" cy="42%" r="62%">
    <stop offset="0%" stop-color="${NAVY}" stop-opacity="0.05"/>
    <stop offset="100%" stop-color="${NAVY}" stop-opacity="0"/>
  </radialGradient>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>`

// etiqueta escura do topo ("PERGUNTA 1", "RESPOSTA 1")
const etiqueta = (texto, cor) => `
  <g filter="url(#rough)">
    <rect x="${SAFE}" y="176" width="${W - SAFE * 2}" height="86" rx="12" fill="${cor}" stroke="${INK}" stroke-width="6"/>
  </g>
  <text x="${W / 2}" y="236" text-anchor="middle" font-family="${ROUND}" font-size="44" font-weight="bold"
    fill="${CREAM}" letter-spacing="4">${esc(texto)}</text>`

// ---------------------------------------------------------------- os slides
async function slideCapa(cfg, n, total) {
  const t = ajustar(cfg.titulo, W - SAFE * 2, 96, 4, 56)
  const camadas = []
  let arte = ''
  if (cfg.escudo) {
    // arquivo oficial ganha do desenho, se existir
    const abs = path.join(CONTEUDO_DIR, ESCUDO_ARQUIVO)
    if (await fs.access(abs).then(() => true).catch(() => false)) {
      const alvo = 440
      const png = await sharp(abs).resize({ height: alvo, fit: 'inside' }).png().toBuffer()
      const m = await sharp(png).metadata()
      camadas.push({ input: png, left: Math.round(W / 2 - m.width / 2), top: Math.round(1130 - m.height / 2) })
    } else {
      arte = escudo(W / 2, 1130, 430)
    }
  } else {
    camadas.push({ input: await busto(cfg.ficha, 560), left: Math.round(W / 2 - 280), top: 860 })
  }
  const corpo = `${fundoBase}
    <g filter="url(#rough)"><rect x="${SAFE - 40}" y="150" width="${W - (SAFE - 40) * 2}" height="86" fill="${GARNET}"/></g>
    <text x="${W / 2}" y="212" text-anchor="middle" font-family="${MARKER}" font-size="52" font-weight="bold"
      fill="${CREAM}" letter-spacing="10">${esc(cfg.selo)}</text>
    ${bloco(t.linhas, { x: W / 2, y: 356, corpo: t.corpo, fill: INK })}
    <text x="${W / 2}" y="${356 + t.linhas.length * t.corpo * 1.18 + 46}" text-anchor="middle"
      font-family="${MARKER}" font-size="46" fill="${GARNET}">${esc(cfg.sub)}</text>
    <ellipse cx="${W / 2}" cy="1390" rx="210" ry="26" fill="${INK}" opacity="0.16" filter="url(#borrao)"/>
    ${arte}`
  return sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([
      { input: svg(corpo), top: 0, left: 0 },
      ...camadas,
      { input: svg(moldura(n, total)), top: 0, left: 0 },
    ]).png().toBuffer()
}

async function slidePergunta(r, idx, n, total) {
  const camadas = []
  let corpo = fundoBase + etiqueta(`PERGUNTA ${idx}`, PLATE)

  if (r.opcoes) {
    // multipla escolha: uma faixa por opcao, com o busto de quem ela cita
    const p = ajustar(r.pergunta, W - SAFE * 2, 76, 2, 48)
    corpo += bloco(p.linhas, { x: W / 2, y: 386, corpo: p.corpo, fill: INK })
    const tam = 168, y0 = 520, passo = 280
    for (let i = 0; i < r.opcoes.length; i++) {
      const o = r.opcoes[i]
      const y = y0 + i * passo
      const t = ajustar(o.texto, W - 580, 44, 3, 30)
      corpo += `
        <g filter="url(#rough)"><rect x="${SAFE}" y="${y}" width="${W - SAFE * 2}" height="${tam + 40}" rx="18"
          fill="${CREAM}" stroke="${INK}" stroke-width="6"/></g>
        <text x="${SAFE + 246}" y="${y + tam / 2 + 22}" text-anchor="start" font-family="${MARKER}" font-size="58"
          font-weight="bold" fill="${GARNET}">${o.letra})</text>
        ${bloco(t.linhas, {
          x: SAFE + 332, y: y + tam / 2 + 32 - (t.linhas.length - 1) * t.corpo * 0.6,
          corpo: t.corpo, fill: INK, anchor: 'start', peso: 'normal', familia: ROUND,
        })}`
      camadas.push({ input: await busto(o.ficha, tam), left: SAFE + 20, top: y + 20 })
    }
  } else {
    // CONTEXTO em corpo pequeno, PERGUNTA em corpo grande. Enunciado que junta o fato e a
    // pergunta numa frase so vira um bloco de 4 ou 5 linhas em caixa alta, e caixa alta grande
    // e o que menos se le rapido. Quebrado em dois, o gancho fica na linha que importa.
    let yTexto = 380
    if (r.contexto) {
      const c = ajustar(r.contexto, W - SAFE * 2, 40, 3, 30)
      corpo += bloco(c.linhas, { x: W / 2, y: yTexto, corpo: c.corpo, fill: NAVY, peso: 'normal', familia: MARKER })
      yTexto += c.linhas.length * c.corpo * 1.18 + 42
    }
    const p = ajustar(r.pergunta, W - SAFE * 2, 86, 4, 52)
    corpo += bloco(p.linhas, { x: W / 2, y: yTexto, corpo: p.corpo, fill: INK })
    // A ARTE CABE NO QUE SOBRA, e nao o contrario: com tamanho fixo a dica ficava POR BAIXO do
    // busto (o enunciado de 5 linhas empurra a arte pra baixo e nao havia limite).
    const yArte = yTexto + p.linhas.length * p.corpo * 1.18 + 50
    const fimArte = r.dica ? H - 240 : H - 160
    const vao = Math.max(180, fimArte - yArte)
    if (r.ficha) {
      const tam = Math.min(470, vao)
      camadas.push({
        input: await busto(r.ficha, tam),
        left: Math.round(W / 2 - tam / 2),
        top: Math.round(yArte + (vao - tam) / 2),
      })
    } else if (r.camisa) {
      const larg = Math.min(400, Math.round(vao / 1.18))
      corpo += camisa(W / 2, yArte + vao / 2, larg, r.camisa)
    }
    if (r.dica) {
      corpo += `<text x="${W / 2}" y="${H - 168}" text-anchor="middle" font-family="${MARKER}" font-size="42"
        fill="${NAVY}">${esc(r.dica)}</text>`
    }
  }

  corpo += `<text x="${W / 2}" y="${H - 96}" text-anchor="middle" font-family="${MARKER}" font-size="34"
    fill="${GARNET}" opacity="0.85">escolhe antes de arrastar</text>`

  return sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([{ input: svg(corpo), top: 0, left: 0 }, ...camadas, { input: svg(moldura(n, total)), top: 0, left: 0 }])
    .png().toBuffer()
}

async function slideResposta(r, idx, n, total) {
  const camadas = []
  const resp = ajustar(r.resposta, W - SAFE * 2, 128, 2, 72)
  const det = ajustar(r.detalhe, W - SAFE * 2, 42, 7, 30)

  // a RESPOSTA mora na faixa grena, e a faixa comeca depois da coluna de seguranca
  const faixaY = 360, faixaH = 60 + resp.linhas.length * resp.corpo * 1.18
  let corpo = fundoBase + etiqueta(`RESPOSTA ${idx}`, GARNET) + `
    <g filter="url(#rough)">
      <rect x="${SAFE}" y="${faixaY}" width="${W - SAFE * 2}" height="${Math.round(faixaH)}" rx="16"
        fill="${GARNET}" stroke="${GOLD}" stroke-width="8"/>
    </g>
    ${bloco(resp.linhas, { x: W / 2, y: faixaY + resp.corpo + 24, corpo: resp.corpo, fill: '#ffffff', espaco: 2 })}
    ${bloco(det.linhas, { x: W / 2, y: faixaY + faixaH + 86, corpo: det.corpo, fill: INK, peso: 'normal' })}`

  const ficha = r.fichaResposta || r.ficha
  const yArte = faixaY + faixaH + 86 + det.linhas.length * det.corpo * 1.18 + 40
  if (ficha) {
    const tam = Math.min(420, Math.max(240, H - 150 - yArte))
    camadas.push({ input: await busto(ficha, tam), left: Math.round(W / 2 - tam / 2), top: Math.round(yArte) })
  } else if (r.camisa) {
    corpo += camisa(W / 2, yArte + 180, 300, r.camisa)
  }

  return sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([{ input: svg(corpo), top: 0, left: 0 }, ...camadas, { input: svg(moldura(n, total)), top: 0, left: 0 }])
    .png().toBuffer()
}

async function slideFecho(cfg, n, total) {
  const t = ajustar(cfg.titulo, W - SAFE * 2, 96, 2, 60)
  let corpo = fundoBase + bloco(t.linhas, { x: W / 2, y: 320, corpo: t.corpo, fill: INK })
  const y0 = 520, passo = 190
  cfg.faixas.forEach(([nota, texto], i) => {
    const y = y0 + i * passo
    const cor = [GARNET, NAVY, PLATE][i] || PLATE
    corpo += `
      <g filter="url(#rough)"><rect x="${SAFE}" y="${y}" width="${W - SAFE * 2}" height="140" rx="18"
        fill="${CREAM}" stroke="${INK}" stroke-width="6"/></g>
      <circle cx="${SAFE + 60}" cy="${y + 70}" r="58" fill="${cor}" stroke="${INK}" stroke-width="6"/>
      <text x="${SAFE + 60}" y="${y + 89}" text-anchor="middle" font-family="${ROUND}" font-size="${nota.length > 2 ? 42 : 56}"
        font-weight="bold" fill="${CREAM}">${esc(nota)}</text>
      <text x="${SAFE + 150}" y="${y + 88}" text-anchor="start" font-family="${ROUND}" font-size="42"
        fill="${INK}">${esc(texto)}</text>`
  })
  corpo += `
    <g filter="url(#rough)"><rect x="${SAFE + 60}" y="${H - 320}" width="${W - (SAFE + 60) * 2}" height="120" rx="60"
      fill="${GOLD}" stroke="${INK}" stroke-width="8"/></g>
    <text x="${W / 2}" y="${H - 238}" text-anchor="middle" font-family="${ROUND}" font-size="60" font-weight="bold"
      fill="${INK}" letter-spacing="4">${esc(cfg.cta)}</text>`
  return sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
    .composite([{ input: svg(corpo), top: 0, left: 0 }, { input: svg(moldura(n, total)), top: 0, left: 0 }])
    .png().toBuffer()
}

// ---------------------------------------------------------------- main
async function main() {
  const total = 2 + QUIZ.rodadas.length * 2
  const dir = path.join(CONTEUDO_DIR, 'quadrinhos', QUIZ.id, 'paineis')
  await fs.mkdir(dir, { recursive: true })

  const pngs = []
  pngs.push(await slideCapa({ ...QUIZ.capa, selo: QUIZ.selo }, 1, total))
  for (let i = 0; i < QUIZ.rodadas.length; i++) {
    const r = QUIZ.rodadas[i]
    pngs.push(await slidePergunta(r, i + 1, 2 + i * 2, total))
    pngs.push(await slideResposta(r, i + 1, 3 + i * 2, total))
  }
  pngs.push(await slideFecho(QUIZ.fecho, total, total))

  const paineis = []
  for (let i = 0; i < pngs.length; i++) {
    const rel = `quadrinhos/${QUIZ.id}/paineis/${i + 1}.png`
    await sharp(pngs[i]).png().toFile(path.join(CONTEUDO_DIR, rel))
    paineis.push({
      numero: i + 1,
      roteiro: 'Slide de quiz (montado por codigo).',
      falas: [],
      promptImagem: '(card montado por codigo, nao regerar)',
      imagem: rel,
      status: 'pronto',
    })
  }
  console.log(`${pngs.length} slides ->`, path.join(CONTEUDO_DIR, 'quadrinhos', QUIZ.id, 'paineis'))

  if (process.env.DEV) { console.log('modo DEV: quadrinho nao registrado'); return }

  const elenco = [...new Set(QUIZ.rodadas.flatMap((r) =>
    [r.ficha, r.fichaResposta, ...(r.opcoes || []).map((o) => o.ficha)]).concat(QUIZ.capa.ficha).filter(Boolean))]

  const quad = {
    id: QUIZ.id, titulo: QUIZ.id, tipo: 'carrossel', selo: QUIZ.selo, status: 'pronto',
    // A FAMÍLIA da peça, pro studio listar ela na categoria das montadas por código (que
    // continua mostrando a peça DEPOIS de publicada: a anterior é o gabarito da próxima).
    // Declarado, e não adivinhado pelo selo: o selo é rótulo de exibição e um quadrinho de
    // história pode usar o mesmo (`vaga-na-ponta` tem selo "Escalação" e é desenhado pela IA).
    porCodigo: 'quiz',
    estiloId: 'rabisco-riso', estiloExtra: '', formato: '3:4', cenarioFixo: false,
    // ACABAMENTO DECLARADO: montado inteiro por codigo, ja sai com moldura, selo e carimbo
    // de progresso proprios. Nao leva o acabamento que o studio desenha nos quadrinhos de
    // historia, e isso vai no dado pra nao ser arrastado por mudanca futura de padrao.
    moldura: 'nenhuma', legendaPorCodigo: false, carimboProgresso: false,
    elenco, contexto: QUIZ.contexto, legenda: QUIZ.legenda, paineis,
    publicacao: {
      titulo: QUIZ.titulo,
      tiktok: QUIZ.legenda, instagram: QUIZ.legenda, twitter: QUIZ.titulo,
      youtube: { titulo: '', descricao: '' },
    },
  }

  // o studio mantem o project.json em memoria e sobrescreve o disco no proximo save:
  // com ele aberto, gravar direto no disco some sem aviso. Por isso a API vem primeiro.
  const API = 'http://localhost:4600/api/dados'
  try {
    const d = await (await fetch(API)).json()
    d.quadrinhos = (d.quadrinhos || []).filter((q) => q.id !== QUIZ.id)
    d.quadrinhos.push(quad)
    const r = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    if (!r.ok) throw new Error('PUT ' + r.status)
    console.log('quadrinho registrado no studio (via API):', QUIZ.id)
  } catch (e) {
    const d = await readDados()
    d.quadrinhos = (d.quadrinhos || []).filter((q) => q.id !== QUIZ.id)
    d.quadrinhos.push(quad)
    await writeDados(d)
    console.log('quadrinho gravado no disco (studio fechado):', QUIZ.id, '|', e.message)
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
