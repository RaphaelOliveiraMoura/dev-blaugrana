// Gera a QUEDA (marble race) em vídeo, por CODIGO: N bolinhas despencam por uma pista cheia de
// obstáculos e ganha quem chega primeiro lá embaixo.
//
// POR QUE ESTE FORMATO: o desfecho é imprevisível DE VERDADE (quem decide é a física) e o
// percurso inteiro é suspense, então não há momento morto pra sair. É o oposto da corrida de
// dados, onde o resultado já está no dado e o que prende é a virada.
//
// POR QUE MATTER-JS E NÃO FÍSICA PRÓPRIA: a primeira versão tinha colisão escrita à mão e as
// bolinhas TRAVAVAM — equilibradas em cima de um pino (normal vertical, nada quebra a simetria)
// ou encunhadas entre pino e parede, paradas com velocidade e sem sair do lugar. Resolver
// contato múltiplo pede solver iterativo, que é o que uma engine faz. Com ela vieram de brinde a
// rotação das bolinhas e obstáculos que a física caseira não aguentava: pás girando e funis.
//
// O RESULTADO NÃO É PREVISÃO, E O VÍDEO DIZ ISSO. Ancorar palpite de campeão num sorteio seria
// vender sorte como análise, e a casa é construída em dado conferido. Por isso o subtítulo
// declara quem decide e o fecho devolve a pergunta pra quem assiste.
//
//   node gerar-queda.mjs <videoId>          # gera videos/<id>/final.mp4
//   SIM=1 node gerar-queda.mjs <videoId>    # só simula e imprime o resultado (rápido)
//   FRAMES=1 node gerar-queda.mjs <videoId> # mantem os PNGs
//
import path from 'node:path'
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'
import Matter from 'matter-js'
import { CONTEUDO_DIR, videoFinal, videoDir } from './server/config.mjs'

const exec = promisify(execFile)
const { Engine, Composite, Bodies, Body } = Matter

const VIDEO_ID = process.argv[2]
if (!VIDEO_ID) throw new Error('uso: node gerar-queda.mjs <videoId>')
const videoJson = JSON.parse(
  await fs.readFile(path.join(CONTEUDO_DIR, 'data', 'videos', `${VIDEO_ID}.json`), 'utf8'))
const Q = videoJson.queda
if (!Q?.competidores?.length) throw new Error(`o video "${VIDEO_ID}" nao tem o bloco "queda"`)

// ---------------------------------------------------------------- TEMA
const W = 1152, H = 1536, FPS = 24
const GARNET = '#7a1b26', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414', PAPEL = '#e7dcc6'
const GRAMA1 = '#6f9e5c', GRAMA2 = '#659353'
// bola de futebol pequena, o "pino" desta pista
const miniBola = (cx, cy, r) => {
  const p = (ang, k) => {
    const a = (ang - 90) * Math.PI / 180
    return `${(cx + r * k * Math.cos(a)).toFixed(1)} ${(cy + r * k * Math.sin(a)).toFixed(1)}`
  }
  const gomo = [0, 72, 144, 216, 288].map((a, i) => (i ? 'L' : 'M') + p(a, 0.5)).join(' ') + 'Z'
  return `<circle cx="${cx + 4}" cy="${cy + 5}" r="${r}" fill="${INK}" opacity="0.22"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6f2e6" stroke="${INK}" stroke-width="5"/>
    <path d="${gomo}" fill="${INK}"/>`
}
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"
const MARKER = "'Marker Felt', 'Chalkboard SE', sans-serif"

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const corpoTitulo = Math.min(Q.corpoTitulo ?? 54, Math.floor((W - 340) / (Q.titulo.length * 0.62)))

// SEED NO DADO, não no relógio: a mesma peça sai igual toda vez, e trocar de queda é trocar um
// número no JSON.
function rng(seed) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
const rand = rng(Q.seed ?? 1)
const entre = (a, b) => a + rand() * (b - a)

// ---------------------------------------------------------------- PISTA
const PAREDE = 76
const X0 = PAREDE, X1 = W - PAREDE, MEIO = W / 2
// A BOLINHA ENCOLHE CONFORME A GRADE. Com raio fixo de 46, doze competidores nasciam SOBREPOSTOS
// na largada (o vão vira 77px para um diâmetro de 92) e o primeiro quadro não era uma queda, era
// uma explosão: a engine resolve a interpenetração cuspindo todo mundo pros lados. Aqui o vão da
// largada manda no tamanho, e a peça aceita de 2 a 12 sem ninguém nascer dentro do outro.
const VAO_LARGADA = (X1 - X0) / (Q.competidores.length + 1)
const R_BOLA = Math.min(46, Math.floor(VAO_LARGADA * 0.46))
const Y_LARGADA = 220
const ALTURA = Q.altura ?? 16000
const Y_CHEGADA = ALTURA - 300

const engine = Engine.create()
engine.gravity.y = 1.5
// contato múltiplo (bola entre dois obstáculos) é onde solver fraco falha: mais iterações, nada
// de atravessar e nenhum encaixe eterno
engine.positionIterations = 12
engine.velocityIterations = 10

const estaticos = []   // o que o render desenha
const girantes = []    // pás: giram por tick

// BOUNCE: a restituição vive nos DOIS lados do contato (o Matter combina as duas), então quicar
// mais pede subir a do obstáculo junto com a da bola; só na bola, o pino continua absorvendo.
const OPT = { isStatic: true, restitution: 0.62, friction: 0.015 }
const add = (body, desenho) => { Composite.add(engine.world, body); estaticos.push(desenho) }

Composite.add(engine.world, [
  Bodies.rectangle(X0 - 40, ALTURA / 2, 80, ALTURA + 400, OPT),
  Bodies.rectangle(X1 + 40, ALTURA / 2, 80, ALTURA + 400, OPT),
  Bodies.rectangle(MEIO, Y_CHEGADA + 220, W, 80, OPT),
])

const pino = (x, y, r = 15) => add(Bodies.circle(x, y, r, OPT), { t: 'pino', x, y, r })
const barra = (x, y, larg, ang, cor = GARNET) =>
  add(Bodies.rectangle(x, y, larg, 22, { ...OPT, angle: ang }), { t: 'barra', x, y, larg, ang, cor })

// PÁ GIRATÓRIA: corpo estático que roda um pouco a cada tick. É o obstáculo que mais muda o jogo,
// porque segura a bolinha e cospe ela pro lado — coisa que campo de pino nenhum faz. Estático de
// propósito: com motor e constraint ficaria instável e roubaria energia da queda.
function pa(x, y, larg, vel) {
  const b = Bodies.rectangle(x, y, larg, 20, { ...OPT, angle: rand() * Math.PI })
  Composite.add(engine.world, b)
  const d = { t: 'pa', x, y, larg, ang: b.angle }
  estaticos.push(d)
  girantes.push({ b, d, vel })
}
function funil(y, abertura) {
  const larg = (X1 - X0 - abertura) * 0.62
  barra(X0 + larg * 0.42, y, larg, 0.55)
  barra(X1 - larg * 0.42, y, larg, -0.55)
}

// A pista é montada em SEÇÕES sorteadas: campo de pino puro vira monotonia, e a variedade é o que
// dá o "e agora?" a cada tela nova.
const SECOES = ['pinos', 'pinos', 'rampas', 'pas', 'funil', 'zigue']
let y = Y_LARGADA + 420
while (y < Y_CHEGADA - 600) {
  const tipo = SECOES[Math.floor(rand() * SECOES.length)]
  if (tipo === 'pinos') {
    for (let l = 0; l < 3; l++) {
      const n = 4 + Math.floor(rand() * 2)
      const passo = (X1 - X0) / n
      const off = l % 2 ? passo / 2 : 0
      for (let i = 0; i <= n; i++) {
        const px = X0 + off + i * passo
        if (px > X0 + 34 && px < X1 - 34) pino(px, y + l * 165, entre(13, 17))
      }
    }
    y += 3 * 165 + 60
  } else if (tipo === 'rampas') {
    for (let l = 0; l < 2; l++) {
      const esq = rand() < 0.5
      const larg = (X1 - X0) * 0.66
      barra(esq ? X0 + larg / 2 - 40 : X1 - larg / 2 + 40, y + l * 240, larg, esq ? 0.3 : -0.3)
    }
    y += 2 * 240 + 70
  } else if (tipo === 'pas') {
    const n = rand() < 0.5 ? 1 : 2
    for (let i = 0; i < n; i++) {
      const px = n === 1 ? MEIO : X0 + (X1 - X0) * (i ? 0.72 : 0.28)
      pa(px, y + i * 40, entre(260, 360), (rand() < 0.5 ? -1 : 1) * entre(0.02, 0.05))
    }
    y += 360
  } else if (tipo === 'funil') {
    funil(y, entre(170, 250))
    y += 330
  } else {
    for (let l = 0; l < 3; l++) {
      const esq = l % 2 === 0
      barra(esq ? X0 + 210 : X1 - 210, y + l * 200, 400, esq ? 0.42 : -0.42)
    }
    y += 3 * 200 + 60
  }
}

// ---------------------------------------------------------------- competidores
const bolas = Q.competidores.map((c, i) => {
  const x = X0 + ((X1 - X0) / (Q.competidores.length + 1)) * (i + 1)
  const body = Bodies.circle(x, Y_LARGADA, R_BOLA, {
    restitution: 0.72, friction: 0.003, frictionAir: 0.0008, density: 0.002,
  })
  Composite.add(engine.world, body)
  return { ...c, body, chegou: null }
})

// ---------------------------------------------------------------- simulação
const historico = []
const ordemChegada = []
const V_MAX = Q.vMax ?? 16     // px por passo do motor; sem teto a bola vira borrão e atravessa
const LIMITE = FPS * 120

// O VÍDEO ACABA QUANDO O PÓDIO ESTÁ FORMADO, não quando a última bolinha chega. A pergunta da
// peça é "quem vence", e ela já foi respondida: o resto é tempo morto com a câmera parada na
// chegada. Com 8 competidores isso custava 90s de vídeo (uma encalhou num canto e o render foi
// até o teto de 120s). Também é o que impede uma bolinha presa de sequestrar a peça inteira.
const PODIO = Math.min(Q.podio ?? 3, bolas.length)

// ANTI-ENCALHE. Bolinha encunhada entre pino e parede (ou equilibrada numa barra) fica com
// velocidade ~0 e não sai mais sozinha: o solver não tem o que quebrar a simetria. Meio segundo
// parada e ela leva um peteleco lateral. O empurrão sai do MESMO rng com semente da pista, então
// a peça continua saindo igual toda vez que roda.
const PARADA_MIN = 1.2          // px por quadro somando os dois eixos
const paradaHa = new Array(bolas.length).fill(0)
// Contado e impresso porque é o TERMÔMETRO DA PISTA: zero peteleco quer dizer que a queda saiu
// só da física (e que uma peça anterior, gerada antes deste mecanismo, continua idêntica);
// muitos petelecos querem dizer pista apertada demais pro tanto de bolinha.
let petelecos = 0

let frame = 0
let fimEm = null
while (frame < LIMITE) {
  for (const g of girantes) { Body.rotate(g.b, g.vel); g.d.ang = g.b.angle }
  // dois meios-passos por quadro: com um passo inteiro a 24fps a bola rápida pula o obstáculo
  Engine.update(engine, 1000 / FPS / 2)
  Engine.update(engine, 1000 / FPS / 2)
  for (const [i, b] of bolas.entries()) {
    const v = b.body.velocity
    if (v.y > V_MAX) Body.setVelocity(b.body, { x: v.x, y: V_MAX })
    if (b.chegou === null) {
      if (Math.abs(v.x) + Math.abs(v.y) < PARADA_MIN) paradaHa[i]++
      else paradaHa[i] = 0
      if (paradaHa[i] > FPS / 2) {
        Body.setVelocity(b.body, { x: (rand() < 0.5 ? -1 : 1) * entre(3, 6), y: 2 })
        paradaHa[i] = 0
        petelecos++
      }
    }
    if (b.chegou === null && b.body.position.y >= Y_CHEGADA) { b.chegou = frame; ordemChegada.push(b) }
  }
  // um segundo de respiro depois do pódio fechado, pra leitura da chegada
  if (fimEm === null && ordemChegada.length >= PODIO) fimEm = frame + FPS
  historico.push({
    bolas: bolas.map((b) => ({ x: b.body.position.x, y: b.body.position.y, a: b.body.angle })),
    pas: girantes.map((g) => g.d.ang),
  })
  if (process.env.SIM && frame % (FPS * 5) === 0) {
    console.log(`  ${String(frame / FPS).padStart(3)}s  ` +
      bolas.map((b) => `${b.sigla} y=${Math.round(b.body.position.y)}`).join('  |  '))
  }
  frame++
  if (fimEm !== null && frame >= fimEm) break
}
console.log(`queda: ${(frame / FPS).toFixed(1)}s · 1º chega em ${((ordemChegada[0]?.chegou ?? frame) / FPS).toFixed(1)}s` +
  ` · ${petelecos} peteleco(s) anti-encalhe`)
console.log('ordem:', ordemChegada.map((b, i) => `${i + 1}º ${b.nome}`).join(' · ') || '(ninguém chegou)')
// Faltar gente na chegada é o ESPERADO quando há mais competidores que vagas no pódio: a peça
// corta assim que o pódio fecha. Só é defeito se nem o pódio se formou.
if (ordemChegada.length < PODIO) console.warn('aviso: o pódio não fechou — pista prendendo ou curta demais')

// GATE DA PISTA. A pista é sorteada pela semente, e algumas saem intransitáveis: funil apertado
// logo abaixo de uma pá devolve a bolinha pra cima, ela encalha, e o anti-encalhe passa o vídeo
// inteiro dando peteleco (medido: seed 17 com 4 competidores = 367 petelecos e 120s de vídeo,
// contra 0 no seed 5 da MESMA peça). Peteleco demais aparece na tela como pulinho sem causa, que
// é o oposto do que a peça promete ("quem decide é a física").
//
// TROCAR A SEMENTE POR CAUSA DISSO É LEGÍTIMO; trocar por causa do VENCEDOR não é. Por isso o
// número que este gate mede é a qualidade da pista, e o SIM=1 imprime os dois separados: escolha
// a semente pelo encalhe, antes de olhar quem ganhou.
const LIMITE_PETELECO = Number(Q.limitePeteleco ?? 8)
if (petelecos > LIMITE_PETELECO && !process.env.ACEITAR_PISTA) {
  console.error(`\npista reprovada: ${petelecos} encalhes (limite ${LIMITE_PETELECO}).\n` +
    `conserto: troque "seed" no JSON do vídeo e rode com SIM=1 até achar uma pista limpa.\n` +
    `(ACEITAR_PISTA=1 passa por cima, se você já olhou e a queda está boa.)`)
  process.exit(1)
}
if (process.env.SIM) process.exit(0)

// ---------------------------------------------------------------- render
const F_FIM = 72
// O TRAÇO DA CASA. O resto do acervo é desenhado com contorno tremido e papel com grão; a pista
// nasceu em vetor liso e destoava de tudo. `rough` é o mesmo filtro do card de gol e do de
// escalação, e é ele que faz o obstáculo parecer desenhado em vez de gerado.
const DEFS = `<defs>
  <filter id="rough" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="2" seed="9" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</defs>`
const svgTag = (corpo) => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${DEFS}${corpo}</svg>`)

function star(cx, cy, rO, rI) {
  let p = ''
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rI : rO
    const a = -Math.PI / 2 + i * Math.PI / 5
    p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)
  }
  return p + 'Z'
}

// bolinha com as cores do clube e a sigla. NADA de escudo real (regra da casa). Ela GIRA junto com
// o corpo da engine: a rotação é o que faz o olho acreditar que aquilo tem peso.
function desenharBola(b, est, cam) {
  const y = est.y - cam
  const g = (est.a * 180) / Math.PI
  // A SIGLA NÃO GIRA. Só as faixas: com o texto dentro da rotação a bola passava metade do vídeo
  // com o nome de cabeça pra baixo, e o espectador perde de quem é a bolinha justo na hora da
  // ultrapassagem. Girar a casca e manter o rótulo de pé é o que as marble races fazem.
  return `<g>
    <clipPath id="cb${b.sigla}"><circle cx="${est.x}" cy="${y}" r="${R_BOLA}"/></clipPath>
    <circle cx="${est.x}" cy="${y}" r="${R_BOLA}" fill="${b.cor1}"/>
    <g clip-path="url(#cb${b.sigla})" transform="rotate(${g.toFixed(1)} ${est.x.toFixed(1)} ${y.toFixed(1)})">
      <rect x="${est.x - R_BOLA * 1.6}" y="${y - R_BOLA * 1.6}" width="${R_BOLA * 0.7}" height="${R_BOLA * 3.2}" fill="${b.cor2}"/>
      <rect x="${est.x + R_BOLA * 0.3}" y="${y - R_BOLA * 1.6}" width="${R_BOLA * 0.7}" height="${R_BOLA * 3.2}" fill="${b.cor2}"/>
    </g>
    <circle cx="${est.x}" cy="${y}" r="${R_BOLA}" fill="none" stroke="${INK}" stroke-width="6"/>
    <circle cx="${est.x}" cy="${y}" r="${R_BOLA * 0.66}" fill="#f6f2e6" stroke="${INK}" stroke-width="4"/>
    <text x="${est.x}" y="${y + R_BOLA * 0.28}" text-anchor="middle" font-family="${ROUND}" font-size="${(R_BOLA * 0.76).toFixed(0)}"
      font-weight="bold" fill="${INK}">${esc(b.sigla)}</text>
  </g>`
}

// A PISTA É ESTÁTICA, ENTÃO SE DESENHA UMA VEZ SÓ. O contorno tremido custa 231ms por quadro
// contra 8ms sem ele (medido): repetido em 784 quadros, o render passava de dez minutos. Aqui a
// pista inteira vira uma tira de imagem, gerada em blocos de uma tela, e cada quadro só RECORTA
// a janela visível. As pás continuam por quadro porque giram; elas são poucas.
const TIRA_H = Math.ceil(ALTURA / H) * H
console.log(`pré-renderizando a pista (${W}x${TIRA_H})...`)
const blocos = []
for (let topo = 0; topo < TIRA_H; topo += H) {
  const dentro = (yy) => yy > -200 && yy < H + 200
  const desenhos = estaticos.filter((d) => d.t !== 'pa').map((d) => {
    const yy = d.y - topo
    if (!dentro(yy)) return ''
    // OS OBSTÁCULOS SÃO DE FUTEBOL, não formas genéricas: barra grená vira TRAVE branca e pino
    // vira BOLA. O fundo já é gramado, então o conjunto lê como campo em vez de fliperama, e a
    // peça passa a ser reconhecível como do canal já no primeiro quadro.
    if (d.t === 'pino') return miniBola(d.x, yy, d.r)
    return `<g transform="rotate(${(d.ang * 180 / Math.PI).toFixed(1)} ${d.x} ${yy})">
      <rect x="${d.x - d.larg / 2 + 6}" y="${yy - 4}" width="${d.larg}" height="24" rx="12" fill="${INK}" opacity="0.22"/>
      <g filter="url(#rough)">
        <rect x="${d.x - d.larg / 2}" y="${yy - 12}" width="${d.larg}" height="24" rx="12"
          fill="#f4f1e8" stroke="${INK}" stroke-width="6"/>
      </g>
      <rect x="${d.x - d.larg / 2 + 14}" y="${yy - 8}" width="${d.larg - 28}" height="6" rx="3" fill="#ffffff"/>
      <circle cx="${d.x - d.larg / 2 + 16}" cy="${yy}" r="5" fill="${INK}" opacity="0.55"/>
      <circle cx="${d.x + d.larg / 2 - 16}" cy="${yy}" r="5" fill="${INK}" opacity="0.55"/></g>`
  }).join('')
  const ychg = Y_CHEGADA - topo
  const chg = dentro(ychg)
    ? `<rect x="${X0}" y="${ychg}" width="${X1 - X0}" height="28" fill="${INK}"/>
       ${Array.from({ length: 16 }, (_, i) =>
         `<rect x="${X0 + i * ((X1 - X0) / 16)}" y="${ychg}" width="${(X1 - X0) / 32}" height="28" fill="${CREAM}"/>`).join('')}
       <text x="${W / 2}" y="${ychg + 92}" text-anchor="middle" font-family="${ROUND}" font-size="54"
         font-weight="bold" fill="${GARNET}">CHEGADA</text>` : ''
  blocos.push({
    input: await sharp(svgTag(`
      <rect width="${W}" height="${H}" fill="${GRAMA1}"/>
      ${Array.from({ length: Math.ceil(H / 150) + 1 }, (_, i) => {
        const yy = Math.floor((topo + i * 150) / 150) * 150 - topo
        return (Math.floor((topo + i * 150) / 150) % 2)
          ? `<rect x="0" y="${yy}" width="${W}" height="150" fill="${GRAMA2}"/>` : ''
      }).join('')}
      <rect x="${X0 - 20}" y="0" width="20" height="${H}" fill="${CREAM}" opacity="0.85"/>
      <rect x="${X1}" y="0" width="20" height="${H}" fill="${CREAM}" opacity="0.85"/>
      ${desenhos}${chg}`)).png().toBuffer(),
    top: topo, left: 0,
  })
}
// GRÃO DE PAPEL: uma vez, na tira inteira. Por quadro custaria o mesmo que o contorno.
const grao = await sharp(Buffer.from(`<svg width="${W}" height="${TIRA_H}" xmlns="http://www.w3.org/2000/svg">
  <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.07"/></feComponentTransfer></filter>
  <rect width="${W}" height="${TIRA_H}" filter="url(#g)"/></svg>`)).png().toBuffer()
const PISTA = await sharp({ create: { width: W, height: TIRA_H, channels: 4, background: PAPEL } })
  .composite([...blocos, { input: grao, top: 0, left: 0, blend: 'multiply' }]).png().toBuffer()
console.log('pista pronta')

const dirFrames = path.join(videoDir(VIDEO_ID), '_frames')
await fs.rm(dirFrames, { recursive: true, force: true })
await fs.mkdir(dirFrames, { recursive: true })

let cam = 0
let n = 0
for (let f = 0; f < historico.length + F_FIM; f++) {
  const est = historico[Math.min(f, historico.length - 1)]
  const liderY = Math.max(...est.bolas.map((e) => e.y))
  const alvo = Math.max(0, Math.min(ALTURA - H, liderY - H * 0.42))
  cam += (alvo - cam) * 0.16
  cam = Math.round(cam)

  // marcas de distância na parede: enchem o vão entre seções e dão noção de quanto falta
  const marcas = Array.from({ length: 3 }, (_, k) => {
    const passo = 500
    const base = Math.floor((cam - 200) / passo) * passo + k * passo
    const yy = base - cam
    if (yy < 250 || yy > H - 140 || base <= Y_LARGADA) return ''
    return `<line x1="${X0}" y1="${yy}" x2="${X0 + 26}" y2="${yy}" stroke="${INK}" stroke-width="4" opacity="0.35"/>
      <line x1="${X1 - 26}" y1="${yy}" x2="${X1}" y2="${yy}" stroke="${INK}" stroke-width="4" opacity="0.35"/>
      <text x="${X0 + 36}" y="${yy + 10}" font-family="${MARKER}" font-size="26" fill="${INK}" opacity="0.34">${Math.round(base / 100)}m</text>`
  }).join('')

  // só as pás são redesenhadas por quadro (giram); o resto vem da tira
  let iPa = 0
  const cenario = estaticos.filter((d) => d.t === 'pa').map((d) => {
    const yy = d.y - cam
    const ang = est.pas[iPa++]
    if (yy < -220 || yy > H + 220) return ''
    // pá = barreira de treino listrada: a listra é o que deixa claro que ela GIRA
    const faixas = Array.from({ length: 6 }, (_, k) =>
      k % 2 ? `<rect x="${d.x - d.larg / 2 + k * (d.larg / 6)}" y="${yy - 11}" width="${d.larg / 6}" height="22" fill="${GARNET}"/>` : '').join('')
    return `<g transform="rotate(${(ang * 180 / Math.PI).toFixed(1)} ${d.x} ${yy})">
      <rect x="${d.x - d.larg / 2 + 7}" y="${yy - 4}" width="${d.larg}" height="22" rx="11" fill="${INK}" opacity="0.22"/>
      <clipPath id="pa${iPa}"><rect x="${d.x - d.larg / 2}" y="${yy - 11}" width="${d.larg}" height="22" rx="11"/></clipPath>
      <rect x="${d.x - d.larg / 2}" y="${yy - 11}" width="${d.larg}" height="22" rx="11" fill="${GOLD}"/>
      <g clip-path="url(#pa${iPa})">${faixas}</g>
      <rect x="${d.x - d.larg / 2}" y="${yy - 11}" width="${d.larg}" height="22" rx="11"
        fill="none" stroke="${INK}" stroke-width="5"/></g>
    <circle cx="${d.x}" cy="${yy}" r="12" fill="${CREAM}" stroke="${INK}" stroke-width="5"/>`
  }).join('')

  const bolinhas = est.bolas.map((e, i) => desenharBola(bolas[i], e, cam)).join('')

  // quem fica pra trás sai pelo TOPO (a câmera segue o líder): o chip diz onde ele está
  // NO MÁXIMO TRÊS CHIPS, os mais próximos do líder. Sem o corte, uma pista com oito bolinhas
  // desenhava sete chips em fila e os últimos saíam pela direita da tela.
  const foraDaTela = est.bolas.map((e, i) => ({ e, i })).filter(({ e }) => e.y - cam < 24)
    .sort((a, b) => b.e.y - a.e.y).slice(0, 3)
    .map(({ e, i }, k) => {
      const c = bolas[i]
      return `<g>
        <rect x="${170 + k * 300}" y="268" width="280" height="58" rx="16"
          fill="${c.cor1}" stroke="${INK}" stroke-width="5" opacity="0.96"/>
        <text x="${310 + k * 300}" y="308" text-anchor="middle" font-family="${ROUND}" font-size="30"
          font-weight="bold" fill="${c.corTexto || '#ffffff'}">▲ ${esc(c.sigla)} ${Math.round((liderY - e.y) / 100)}m atrás</text>
      </g>`
    }).join('')

  // QUEM JÁ CHEGOU MANTÉM A COLOCAÇÃO. Ordenar só por profundidade fazia o pódio mentir no fim:
  // a bolinha que chegou primeiro para no fundo e é "ultrapassada" pelas que caem em cima dela,
  // então o HUD dizia Atlético em 1º enquanto o card do vencedor dizia Real Madrid.
  const posDeChegada = new Map(ordemChegada.map((b, k) => [bolas.indexOf(b), k]))
  const ordem = est.bolas.map((e, i) => ({ i, y: e.y }))
    .sort((a, b) => {
      const ca = posDeChegada.has(a.i) && est.bolas[a.i].y >= Y_CHEGADA - 1
      const cb = posDeChegada.has(b.i) && est.bolas[b.i].y >= Y_CHEGADA - 1
      if (ca && cb) return posDeChegada.get(a.i) - posDeChegada.get(b.i)
      if (ca) return -1
      if (cb) return 1
      return b.y - a.y
    })
  // HUD: a classificação ao vivo. O CHIP ENCOLHE conforme a grade, porque com largura fixa de
  // 346px ele só cabia com TRÊS competidores: em oito, os cinco últimos eram desenhados fora da
  // tela (x=1902 numa tela de 1152) e sumiam justo os que estavam perdendo. Passando de três, o
  // rótulo troca o nome do clube pela sigla, que é a mesma que está pintada na bolinha.
  const nHud = ordem.length
  const vaoHud = 8
  const largHud = Math.min(346, (W - 80 - (nHud - 1) * vaoHud) / nHud)
  const corpoHud = largHud > 220 ? 34 : largHud > 130 ? 28 : 22
  const hud = ordem.map((o, k) => {
    const c = bolas[o.i]
    const x = 40 + k * (largHud + vaoHud)
    const rotulo = largHud > 220 ? `${k + 1}º ${esc(c.nome)}` : `${k + 1} ${esc(c.sigla)}`
    return `<g>
      <rect x="${x}" y="176" width="${largHud}" height="62" rx="14" fill="${c.cor1}" stroke="${INK}" stroke-width="5"/>
      <text x="${x + largHud / 2}" y="219" text-anchor="middle" font-family="${ROUND}" font-size="${corpoHud}"
        font-weight="bold" fill="${c.corTexto || '#ffffff'}">${rotulo}</text>
    </g>`
  }).join('')

  const prog = Math.max(0, Math.min(1, (liderY - Y_LARGADA) / (Y_CHEGADA - Y_LARGADA)))
  const corpo = `
    ${cenario}${bolinhas}${foraDaTela}
    <rect x="0" y="0" width="${W}" height="250" fill="${GARNET}"/>
    <text x="${W / 2}" y="${Q.subtitulo ? 88 : 112}" text-anchor="middle" font-family="${ROUND}" font-size="${corpoTitulo}"
      font-weight="bold" fill="${CREAM}">${esc(Q.titulo)}</text>
    ${Q.subtitulo ? `<text x="${W / 2}" y="140" text-anchor="middle" font-family="${MARKER}" font-size="38"
      fill="${GOLD}">${esc(Q.subtitulo)}</text>` : ''}
    ${hud}
    <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="${INK}" stroke-width="14"/>
    <circle cx="${W - 96}" cy="96" r="46" fill="${CREAM}" stroke="${INK}" stroke-width="7"/>
    <path d="${star(W - 96, 96, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
    <rect x="150" y="${H - 110}" width="${W - 300}" height="22" rx="11" fill="#00000022"/>
    <rect x="150" y="${H - 110}" width="${Math.round((W - 300) * prog)}" height="22" rx="11" fill="${GOLD}"/>
    <text x="${W - 56}" y="${H - 44}" text-anchor="end" font-family="${ROUND}" font-size="28" font-weight="bold"
      fill="${GARNET}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">@devblaugrana</text>`

  const janela = Math.max(0, Math.min(TIRA_H - H, Math.round(cam)))
  const camadas = [
    { input: await sharp(PISTA).extract({ left: 0, top: janela, width: W, height: H }).png().toBuffer(), top: 0, left: 0 },
    { input: svgTag(corpo), top: 0, left: 0 },
  ]
  if (f >= historico.length) {
    const campeao = ordemChegada[0] || bolas[0]
    camadas.push({ input: svgTag(`
      <rect width="${W}" height="${H}" fill="${INK}" opacity="0.5"/>
      <rect x="80" y="${H / 2 - 300}" width="${W - 160}" height="600" rx="28" fill="${PAPEL}" stroke="${INK}" stroke-width="12"/>
      <text x="${W / 2}" y="${H / 2 - 170}" text-anchor="middle" font-family="${ROUND}" font-size="52"
        font-weight="bold" fill="${GARNET}">${esc(Q.veredito || 'TERMINOU ASSIM')}</text>
      <text x="${W / 2}" y="${H / 2 - 30}" text-anchor="middle" font-family="${ROUND}" font-size="92"
        font-weight="bold" fill="${INK}">${esc(campeao.nome)}</text>
      ${ordemChegada.slice(1, 3).map((b, k) => `<text x="${W / 2}" y="${H / 2 + 60 + k * 56}" text-anchor="middle"
        font-family="${ROUND}" font-size="42" fill="#555">${k + 2}º ${esc(b.nome)}</text>`).join('')}
      <text x="${W / 2}" y="${H / 2 + 220}" text-anchor="middle" font-family="${ROUND}" font-size="46"
        font-weight="bold" fill="${GARNET}">${esc(Q.cta || 'e você, quem acha de verdade?')}</text>`), top: 0, left: 0 })
  }

  await fs.writeFile(path.join(dirFrames, `f${String(n++).padStart(4, '0')}.png`),
    await sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } }).composite(camadas).png().toBuffer())
}

console.log(`${n} frames (${(n / FPS).toFixed(1)}s)`)
const mp4 = videoFinal(VIDEO_ID)
await exec('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(dirFrames, 'f%04d.png'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
if (!process.env.FRAMES) await fs.rm(dirFrames, { recursive: true, force: true })
console.log('video ->', mp4)
