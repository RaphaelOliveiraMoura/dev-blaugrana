// Gera a CORRIDA DE DADOS em vídeo, por CODIGO: N personagens correndo numa pista, e o que
// empurra cada um é um dado real acumulado etapa a etapa (aqui, gol a gol na La Liga).
//
// POR QUE ESTE FORMATO: o que segura o espectador ate o fim e o loop de completude. No frame
// 1 ele ja ve o alvo (a linha de chegada) e o quanto falta (a posicao de cada corredor), e a
// unica coisa que ele nao sabe e quem chega primeiro. Ninguem sai no meio de uma corrida.
//
// POR QUE POR CODIGO: os sprites de corrida ja existem no acervo (rigs/correr, 4 desenhos por
// personagem, feitos pra emendar em loop) e o resto e dado. Zero geracao de imagem.
//
//   node gerar-corrida.mjs <videoId>          # gera videos/<id>/final.mp4
//   FRAMES=1 node gerar-corrida.mjs <videoId>  # mantem os PNGs de cada frame pra inspecao
//
// OS DADOS VIVEM NO JSON DO VIDEO (data/videos/<id>.json, campo `corrida`), nao aqui: trocar
// os jogadores, a temporada ou a metrica e edicao de dado pela tela do studio, e este arquivo
// fica sendo so o motor. Mesma divisao do asset.mjs.
//
import path from 'node:path'
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { rigQuadro } from './shared/personagem.mjs'
import { CONTEUDO_DIR, videoFinal, videoDir } from './server/config.mjs'

const exec = promisify(execFile)

// ---------------------------------------------------------------- DADOS
//
// FONTE dos numeros que estao no JSON: FotMob (/api/data/playerData?id=), campo recentMatches,
// que traz gols E assistencias PARTIDA A PARTIDA, conferido por dupla contagem contra a tabela
// oficial da temporada na Wikipedia. Refaca a conferencia ANTES de renderizar outra temporada:
// numero errado num post de futebol vira tribunal nos comentarios.
//
// Fontes que NAO servem pra isso, ja testadas: FBref e Transfermarkt devolvem 403 pra bot,
// Understat virou shell sem dado no HTML, e a Wikipedia so lista os marcadores do jogo, sem
// quem deu a assistencia.
const VIDEO_ID = process.argv[2]
if (!VIDEO_ID) throw new Error('uso: node gerar-corrida.mjs <videoId>')

const videoJson = JSON.parse(
  await fs.readFile(path.join(CONTEUDO_DIR, 'data', 'videos', `${VIDEO_ID}.json`), 'utf8'))
const CORRIDA = videoJson.corrida
if (!CORRIDA?.corredores?.length || !CORRIDA?.jogos?.length) {
  throw new Error(`o video "${VIDEO_ID}" nao tem o bloco "corrida" (corredores[] e jogos[]).`)
}

// ---------------------------------------------------------------- TEMA E TEMPO
const W = 1152, H = 1536, FPS = 24
const GARNET = '#7a1b26', NAVY = '#243b6b', GOLD = '#e0a92e'
const CREAM = '#efe6d3', INK = '#141414', PAPEL = '#e7dcc6'
const ROUND = "'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif"
const MARKER = "'Marker Felt', 'Chalkboard SE', sans-serif"

// TEMPO: ~59s no total. O jogo ficou em 28 frames (1,2s) porque o icone precisa de tempo pra
// entrar pela direita, cruzar a tela e bater no corredor; com os 11 frames da primeira versao
// a bola era um borrao e o efeito se perdia.
const F_ABERTURA = 50      // ~2s parado: o olho entende a pista e a meta antes de largar
const F_JOGO = 34          // 38 jogos = ~54s. Manda o TEMPO DE VOO do icone, nao o ritmo do
                           // placar: a 28 frames a bola cruzava a tela em 0,4s e virava risco
const F_CHEGADA = 30       // o lider cruzando a linha depois do ultimo jogo
const F_FIM = 90           // o unico modal do desfecho, com tempo de ser lido

// O cabecalho ocupa ate y=250 e a barra de progresso vive em H-120, entao as raias moram
// entre 340 e 1300. A primeira versao comecava em 520 com 300px de altura e a raia de cima
// ficava METADE embaixo da faixa vermelha, com a placa do lider encostando no titulo.
const PISTA_X0 = 210, PISTA_X1 = W - 210   // 0 gols e a meta
const RAIA_H = 300
// AS RAIAS SE DISTRIBUEM PELO NÚMERO DE CORREDORES. Com a lista fixa de três, um duelo (Messi x
// Cristiano, artilheiro x artilheiro) desenhava as duas raias em cima e deixava o terço de baixo
// da tela vazio, com a barra de progresso solta no vão. A faixa útil é a mesma; o que muda é em
// quantas partes ela é dividida.
const N_RAIAS = Math.max(2, Math.min(3, CORRIDA.corredores.length))
const RAIA_TOPO = 640, RAIA_BASE = 1280
const RAIA_Y = N_RAIAS === 1 ? [960]
  : Array.from({ length: N_RAIAS }, (_, i) =>
    Math.round(RAIA_TOPO + i * ((RAIA_BASE - RAIA_TOPO) / (N_RAIAS - 1))))
// Com menos corredores sobra altura por raia, e o sprite cresce até a raia comportar: num duelo
// os dois aparecem 25% maiores, que é o que dá cara de confronto em vez de tabela animada.
const SPRITE_H = N_RAIAS >= 3 ? 235 : 295

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

// A PLACA ESCOLHE A COR DO TEXTO PELO FUNDO. Com creme fixo, o corredor de camisa branca (o Real
// Madrid numa corrida Messi x Cristiano) ganhava placa branca com letra branca: o nome e o placar
// dele sumiam a peça inteira. A cor do clube é dado do vídeo e vai continuar sendo clara às
// vezes; quem tem que se adaptar é o texto.
function claro(hex) {
  const c = String(hex).replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62
}

// ÍCONES QUE ENTRAM PELA DIREITA: bola por gol, chuteira por assistencia. Sao eles que dao a
// causa visivel do avanco. Sem isso o corredor anda "sozinho" e o espectador precisa ler o
// numero pra entender o que aconteceu; com eles, a passagem de um gol e um evento na tela.
function iconeBola(cx, cy, r) {
  const p = (ang, k) => {
    const a = (ang - 90) * Math.PI / 180
    return `${(cx + r * k * Math.cos(a)).toFixed(1)} ${(cy + r * k * Math.sin(a)).toFixed(1)}`
  }
  const gomo = [0, 72, 144, 216, 288].map((a, i) => (i ? 'L' : 'M') + p(a, 0.42)).join(' ') + 'Z'
  const costuras = [36, 108, 180, 252, 324].map((a) =>
    `<line x1="${p(a, 0.48).split(' ')[0]}" y1="${p(a, 0.48).split(' ')[1]}"
       x2="${p(a, 0.78).split(' ')[0]}" y2="${p(a, 0.78).split(' ')[1]}"
       stroke="${INK}" stroke-width="${Math.max(2, r * 0.11)}" stroke-linecap="round"/>`).join('')
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#f5eee0" stroke="${INK}" stroke-width="${Math.max(3, r * 0.2)}"/>
    <path d="${gomo}" fill="${INK}"/>${costuras}</g>`
}

// Chuteira de PERFIL, bico pra esquerda (o lado pra onde ela viaja): bico baixo, cano alto
// atras, sola preta e travas. A primeira versao era uma mancha dourada arredondada e lia como
// banana, porque nao tinha nem cano nem sola separando as partes.
function iconeChuteira(cx, cy, r) {
  const w = r * 2.4, h = r * 1.7, x = cx - w / 2, y = cy - h / 2
  const esp = Math.max(3, r * 0.14)
  const corpo = `M${x} ${y + h * 0.56}
    C${x + w * 0.04} ${y + h * 0.34} ${x + w * 0.26} ${y + h * 0.26} ${x + w * 0.46} ${y + h * 0.30}
    L${x + w * 0.58} ${y + h * 0.06} L${x + w * 0.94} ${y + h * 0.06}
    L${x + w * 0.94} ${y + h * 0.70} L${x} ${y + h * 0.70} Z`
  const travas = [0.14, 0.38, 0.62, 0.86].map((f) =>
    `<rect x="${x + w * f - r * 0.10}" y="${y + h * 0.84}" width="${r * 0.20}" height="${r * 0.22}"
      rx="${r * 0.07}" fill="${INK}"/>`).join('')
  const cadarco = [0.44, 0.56, 0.68].map((f) =>
    `<line x1="${x + w * f}" y1="${y + h * (0.34 + (f - 0.44) * 0.5)}" x2="${x + w * (f + 0.06)}"
      y2="${y + h * 0.56}" stroke="${INK}" stroke-width="${esp * 0.7}" stroke-linecap="round"/>`).join('')
  return `<g>
    <path d="${corpo}" fill="${GOLD}" stroke="${INK}" stroke-width="${esp}" stroke-linejoin="round"/>
    ${cadarco}
    <rect x="${x - esp / 2}" y="${y + h * 0.70}" width="${w * 0.94 + esp}" height="${h * 0.16}"
      rx="${h * 0.05}" fill="${INK}"/>
    ${travas}</g>`
}

// Luva de goleiro: dedos LONGOS, polegar de lado e punho grená. Desenhada como UMA silhueta
// (um path só), não como peças empilhadas: a primeira versão era palma + quatro retângulos + um
// polegar solto, e os contornos internos das peças faziam ela ler como pente ou hambúrguer.
// Os dedos ocupam ~35% da altura porque com ondinhas curtas a mão vira um bolo.
let seqClip = 0;
function iconeLuva(cx, cy, r) {
  const w = r * 1.75, h = r * 2.3, x = cx - w / 2, y = cy - h / 2;
  const esp = Math.max(2.5, r * 0.14);
  const xs = [0.10, 0.31, 0.52, 0.73, 0.94].map((f) => x + w * f);
  // topos desiguais: quatro dedos do mesmo tamanho leem como grade, não como mão
  const topos = [0.16, 0.06, 0.09, 0.20].map((f) => y + h * f);
  const yVale = y + h * 0.42, yPalma = y + h * 0.82;
  const rd = (xs[1] - xs[0]) / 2;
  let d = `M ${xs[0]} ${yVale}`;
  for (let i = 0; i < 4; i++) {
    d += ` L ${xs[i]} ${topos[i] + rd} A ${rd} ${rd} 0 0 1 ${xs[i + 1]} ${topos[i] + rd}`;
    d += i < 3 ? ` L ${xs[i + 1]} ${yVale}` : ` L ${xs[4]} ${yPalma}`;
  }
  d += ` L ${x + w * 0.06} ${yPalma} L ${x + w * 0.06} ${y + h * 0.58}`;
  d += ` C ${x - w * 0.16} ${y + h * 0.56} ${x - w * 0.16} ${y + h * 0.34} ${xs[0]} ${y + h * 0.40} Z`;
  // ID ÚNICO POR CHAMADA: são três luvas no mesmo SVG (uma por corredor) e um id repetido faz
  // todas usarem o clip da primeira, ou seja, o punho aparece no lugar errado.
  const cl = `luva${++seqClip}`;
  return `<g>
    <clipPath id="${cl}"><path d="${d}"/></clipPath>
    <path d="${d}" fill="#c8e06a"/>
    <g clip-path="url(#${cl})">
      <rect x="${x - w}" y="${y + h * 0.70}" width="${w * 3}" height="${h * 0.3}" fill="${GARNET}"/>
      <line x1="${x - w}" y1="${y + h * 0.70}" x2="${x + w * 2}" y2="${y + h * 0.70}" stroke="${INK}" stroke-width="${esp}"/>
    </g>
    <path d="${d}" fill="none" stroke="${INK}" stroke-width="${esp}" stroke-linejoin="round"/>
  </g>`;
}

// Métrica nova = uma entrada aqui e o `icone` no JSON do vídeo. O motor não sabe o que é gol nem
// o que é clean sheet: ele só empilha eventos e conta.
const ICONES = { bola: iconeBola, chuteira: iconeChuteira, luva: iconeLuva };

function star(cx, cy, rO, rI) {
  let p = ''
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rI : rO
    const a = -Math.PI / 2 + i * Math.PI / 5
    p += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1)
  }
  return p + 'Z'
}

// ---------------------------------------------------------------- acumulados
// acumulado[j][i] = [gols, assistencias] do corredor i DEPOIS do jogo j. QUEM ESTA NA FRENTE E
// QUEM TEM MAIS PARTICIPACOES (gol + assistencia), entao os dois eventos empurram igual.
// MÉTRICAS: o que empurra o corredor. Duas por padrão (gol e assistência), mas pode ser uma só
// (jogo sem sofrer gol) ou outras. Cada jogo traz um valor por métrica, por corredor.
const METRICAS = CORRIDA.metricas?.length ? CORRIDA.metricas : [{ icone: 'bola' }, { icone: 'chuteira' }];
for (const m of METRICAS) if (!ICONES[m.icone]) throw new Error(`ícone "${m.icone}" não existe (tem: ${Object.keys(ICONES).join(', ')})`);
const NM = METRICAS.length;

const N = CORRIDA.corredores.length
const acumulado = []
let soma = Array.from({ length: N }, () => new Array(NM).fill(0))
acumulado.push(soma.map((v) => [...v]))
for (const [, , ev] of CORRIDA.jogos) {
  soma = soma.map((atual, i) => atual.map((v, k) => v + (ev[i][k] || 0)))
  acumulado.push(soma.map((v) => [...v]))
}
const TOTAL = acumulado[acumulado.length - 1]
const PART = (par) => par.reduce((a, b) => a + b, 0)
const META = Math.max(...TOTAL.map(PART))

// A ESCALA TEM FOLGA (+3) de proposito. Com a pista terminando exatamente no total do lider,
// ele encostava na bandeirinha em 22 de abril e passava os SEIS ultimos jogos parado nela, o
// que entrega o resultado antes da hora e faz o fim da temporada parecer que ja aconteceu.
// Agora ninguem toca a linha durante a corrida, e o vencedor so cruza na virada final.
const ESCALA = META + 3

const xDe = (participacoes) => PISTA_X0 + (participacoes / ESCALA) * (PISTA_X1 - PISTA_X0)

// ---------------------------------------------------------------- cenario fixo
function cenario() {
  const raias = RAIA_Y.map((y, i) => `
    <rect x="60" y="${y - RAIA_H + 20}" width="${W - 120}" height="${RAIA_H}" rx="20"
      fill="${i % 2 ? '#ded2b8' : '#e4d9c1'}" opacity="0.8"/>
    <line x1="80" y1="${y + 14}" x2="${W - 80}" y2="${y + 14}"
      stroke="${INK}" stroke-width="5" stroke-dasharray="18 14" opacity="0.32"/>`).join('')
  // LINHA DE CHEGADA: e ela que promete o final logo no frame 1. Sem meta visivel a corrida
  // vira so bonecos andando e o espectador nao tem o que esperar. Fica DENTRO da area util,
  // com a bandeirinha em duas colunas alinhadas na mesma grade (na primeira versao as colunas
  // eram deslocadas em 30px e o xadrez lia como ruido).
  const yTopo = 330, yBase = H - 150, celula = 34
  const linhas = Math.floor((yBase - yTopo) / celula)
  const xadrez = Array.from({ length: linhas }, (_, r) =>
    [0, 1].map((c) => `<rect x="${PISTA_X1 + 14 + c * celula}" y="${yTopo + r * celula}"
      width="${celula}" height="${celula}" fill="${(r + c) % 2 ? INK : '#f5eee0'}"/>`).join('')).join('')
  const meta = `
    <rect x="${PISTA_X1 + 14}" y="${yTopo}" width="${celula * 2}" height="${linhas * celula}" fill="#f5eee0"/>
    ${xadrez}
    <rect x="${PISTA_X1}" y="${yTopo}" width="14" height="${linhas * celula}" fill="${INK}"/>
    <rect x="${PISTA_X1 + 14}" y="${yTopo}" width="${celula * 2}" height="${linhas * celula}"
      fill="none" stroke="${INK}" stroke-width="4"/>
`
  return `<rect width="${W}" height="${H}" fill="${PAPEL}"/>${raias}${meta}`
}

const CENARIO = cenario()

// O TÍTULO ENCOLHE se for comprido: com corpo fixo, "JOGOS SEM SOFRER GOL" entrava por baixo do
// selo da estrela. A largura útil desconta os dois cantos (selo à direita, simetria à esquerda).
const corpoTitulo = Math.min(66, Math.floor(
  (W - 330 - CORRIDA.titulo.length * 2) / (CORRIDA.titulo.length * 0.70)))

const moldura = `
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="34" fill="none" stroke="${INK}" stroke-width="14"/>
  <circle cx="${W - 96}" cy="96" r="46" fill="${CREAM}" stroke="${INK}" stroke-width="7"/>
  <path d="${star(W - 96, 96, 27, 12)}" fill="${GOLD}" stroke="${INK}" stroke-width="3"/>
  <text x="${W - 56}" y="${H - 44}" text-anchor="end" font-family="${ROUND}" font-size="28" font-weight="bold"
    fill="${GARNET}" stroke="${INK}" stroke-width="2.5" style="paint-order:stroke">@devblaugrana</text>`

// ---------------------------------------------------------------- frame
function svgFrame({ posicoes, valores, cabecalho, progresso, brilho }) {
  const placas = posicoes.map((x, i) => {
    const c = CORRIDA.corredores[i]
    const y = RAIA_Y[i]
    // A PLACA MOSTRA UM PLACAR POR MÉTRICA, cada um com o SEU icone ao lado. Antes era um numero
    // solto (nao dava pra saber o que estava sendo contado) e depois virou "16+3", que lia
    // como conta de somar em vez de duas medidas diferentes.
    const vals = (valores[i] || []).map(String)
    const larg = Math.max(300 + (NM - 1) * 70, 190 + c.nome.length * 20 + vals.join('').length * 30 + NM * 60)
    const px = Math.min(Math.max(x, 60 + larg / 2), W - 60 - larg / 2)   // nao vaza a moldura
    const topoY = y - 296, altura = 78, meio = topoY + 52
    const passoIc = 92
    // A MARGEM DIREITA SEGUE O NÚMERO DE DÍGITOS. Fixa em 66px, ela cabia até 99; num acumulado
    // de três dígitos (a corrida por temporada passa de 200 gols) o placar era desenhado por cima
    // da borda da placa e o último dígito ficava metade dentro, metade fora.
    const digitos = Math.max(1, ...vals.map((v) => v.length))
    const x0Ic = px + larg / 2 - 20 - (NM - 1) * passoIc - 40 - digitos * 22
    const destaque = brilho?.[i] ? `<circle cx="${x}" cy="${y - 130}" r="${110 + brilho[i] * 60}"
      fill="${GOLD}" opacity="${0.35 * (1 - brilho[i])}"/>` : ''
    return `${destaque}
      <g>
        <rect x="${px - larg / 2}" y="${topoY}" width="${larg}" height="${altura}" rx="16"
          fill="${c.cor}" stroke="${INK}" stroke-width="6"/>
        <text x="${px - larg / 2 + 22}" y="${meio}" text-anchor="start" font-family="${ROUND}" font-size="36"
          font-weight="bold" fill="${claro(c.cor) ? INK : CREAM}">${esc(c.nome)}</text>
        <line x1="${x0Ic - 34}" y1="${topoY + 12}" x2="${x0Ic - 34}" y2="${topoY + altura - 12}"
          stroke="${claro(c.cor) ? INK : CREAM}" stroke-width="3" opacity="0.5"/>
        ${METRICAS.map((m, k) => {
          const xi = x0Ic + k * passoIc
          return `${ICONES[m.icone](xi, meio - 12, m.icone === 'luva' ? 19 : 17)}
            <text x="${xi + 28}" y="${meio}" text-anchor="start" font-family="${ROUND}" font-size="40"
              font-weight="bold" fill="${claro(c.cor) ? (k === 0 ? GARNET : INK) : (k === 0 ? GOLD : '#ffffff')}">${vals[k] ?? 0}</text>`
        }).join('')}
      </g>`
  }).join('')

  const topo = `
    <rect x="0" y="0" width="${W}" height="250" fill="${GARNET}"/>
    <text x="${W / 2}" y="106" text-anchor="middle" font-family="${ROUND}" font-size="${corpoTitulo}" font-weight="bold"
      fill="${CREAM}" letter-spacing="2">${esc(CORRIDA.titulo)}</text>
    <text x="${W / 2}" y="160" text-anchor="middle" font-family="${MARKER}" font-size="40"
      fill="${GOLD}">${esc(CORRIDA.subtitulo)}</text>
    <text x="${W / 2}" y="222" text-anchor="middle" font-family="${ROUND}" font-size="42" font-weight="bold"
      fill="${CREAM}">${esc(cabecalho)}</text>`

  // barra de progresso da temporada: a segunda promessa de fim, junto com a linha de chegada
  const barra = `
    <rect x="150" y="${H - 120}" width="${W - 300}" height="26" rx="13" fill="#00000022"/>
    <rect x="150" y="${H - 120}" width="${Math.max(0, (W - 300) * progresso)}" height="26" rx="13" fill="${GOLD}"/>`

  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${CENARIO}${topo}${placas}${barra}${moldura}</svg>`)
}

// ICONES EM CAMADA PROPRIA, composta DEPOIS dos sprites: eles precisam passar NA FRENTE do
// corredor pra leitura de "a bola chegou nele" funcionar.
function svgIcones(lista) {
  const corpo = lista.map((ic) => `<g opacity="${ic.op.toFixed(2)}">${
    ICONES[ic.tipo](ic.x, ic.y, ic.r)}${
    // o "x50" é o que salva a leitura quando a etapa é uma temporada inteira: sem ele, um ícone
    // sozinho voando diria que o Messi fez UM gol em 2011/12
    ic.mult > 1 ? `<text x="${ic.x + ic.r + 10}" y="${ic.y + 16}" font-family="${ROUND}" font-size="46"
      font-weight="bold" fill="${INK}" stroke="${CREAM}" stroke-width="6"
      style="paint-order:stroke">x${ic.mult}</text>` : ''}</g>`).join('')
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${corpo}</svg>`)
}

// PAINEL FINAL EM CAMADA PROPRIA, composta DEPOIS dos sprites. Junto com o resto do frame ele
// era desenhado antes, e os corredores apareciam por cima do texto do desfecho.
function svgPainel(conteudo) {
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="${H}" fill="${INK}" opacity="0.45"/>
    <rect x="70" y="${H / 2 - 330}" width="${W - 140}" height="660" rx="28"
      fill="${PAPEL}" stroke="${INK}" stroke-width="12"/>
    ${conteudo}</svg>`)
}

// ---------------------------------------------------------------- main
async function main() {
  const OUT = videoDir(VIDEO_ID)
  const dirFrames = path.join(OUT, '_frames')
  await fs.rm(dirFrames, { recursive: true, force: true })
  await fs.mkdir(dirFrames, { recursive: true })

  // sprites: 4 desenhos por corredor, carregados UMA vez e reusados em todo frame
  const sprites = []
  for (const c of CORRIDA.corredores) {
    const quadros = []
    for (let n = 1; n <= 4; n++) {
      const abs = path.join(CONTEUDO_DIR, rigQuadro(c.slug, 'correr', n))
      if (!(await fs.access(abs).then(() => true).catch(() => false))) {
        throw new Error(`falta o rig de corrida de "${c.slug}" (${rigQuadro(c.slug, 'correr', n)}).\n` +
          `conserto: node scripts/asset.mjs correr ${c.slug}`)
      }
      const buf = await sharp(abs).resize({ height: SPRITE_H }).png().toBuffer()
      const m = await sharp(buf).metadata()
      quadros.push({ buf, w: m.width, h: m.height })
    }
    sprites.push(quadros)
  }

  let frame = 0
  const escrever = async (svg, camadas) => {
    const png = await sharp({ create: { width: W, height: H, channels: 4, background: PAPEL } })
      .composite([{ input: svg, top: 0, left: 0 }, ...camadas]).png().toBuffer()
    await fs.writeFile(path.join(dirFrames, `f${String(frame++).padStart(4, '0')}.png`), png)
  }

  // o desenho do ciclo troca a cada 3 frames (8 desenhos por segundo): mais rapido que isso
  // vira tremor, mais lento vira patinacao
  const camadasSprites = (posicoes, t) => posicoes.map((x, i) => {
    const q = sprites[i][Math.floor(t / 3) % 4]
    return { input: q.buf, left: Math.round(x - q.w / 2), top: Math.round(RAIA_Y[i] - q.h) }
  })

  // ---- abertura: todo mundo na largada, ja com a meta visivel
  for (let f = 0; f < F_ABERTURA; f++) {
    const pos = TOTAL.map(() => xDe(0))
    await escrever(svgFrame({
      posicoes: pos, valores: TOTAL.map(() => new Array(NM).fill(0)), cabecalho: CORRIDA.chamada || 'QUEM FAZ MAIS?', progresso: 0,
    }), camadasSprites(pos, f))
  }

  // ---- a temporada, jogo a jogo
  //
  // O AVANCO E EM DEGRAU, nao linear: o corredor so anda DEPOIS que a bola bate nele. Numa
  // interpolacao lisa do inicio ao fim da etapa o boneco desliza antes de o gol "acontecer",
  // e a relacao causa-efeito, que e a graca do formato, some.
  const R_ICONE = 40
  const rampa = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  for (let j = 0; j < CORRIDA.jogos.length; j++) {
    const [data, adv, ev] = CORRIDA.jogos[j]
    const de = acumulado[j]
    // EVENTOS DO JOGO, na ordem em que entram na tela: gols primeiro, assistencias depois.
    // Cada um vira um icone que voa da direita e empurra o corredor quando bate.
    //
    // ACIMA DE UM PUNHADO, O ÍCONE VIRA PACOTE ("x34"). Uma etapa pode não ser uma partida: numa
    // corrida em que cada etapa é uma TEMPORADA, o Messi chega com 50 gols de uma vez. Um ícone
    // por gol nesse caso vira uma parede de bolas atravessando a tela, e é pior do que feio: os
    // ícones entram em fila com 0,16 de intervalo, então do 4º em diante a chegada cai fora da
    // etapa, o corredor NÃO completa o avanço no tempo certo e só se acerta no corte seguinte.
    const MAX_ICONES = 4
    const eventos = ev.map((porMetrica) =>
      METRICAS.flatMap((m, k) => {
        const n = porMetrica[k] || 0
        return n > MAX_ICONES
          ? [{ tipo: m.icone, mult: n }]
          : Array.from({ length: n }, () => ({ tipo: m.icone, mult: 1 }))
      }))
    // a chegada e tardia de proposito (0,46) pra sobrar tempo de voo: com F_JOGO=34 sao ~16
    // frames de viagem, contra 9 da primeira versao, em que o icone virava um risco
    const chegada = (k) => 0.46 + k * 0.16
    for (let f = 0; f < F_JOGO; f++) {
      const t = (f + 1) / F_JOGO
      const pos = de.map((par, i) => xDe(PART(par) + eventos[i]
        .reduce((acc, e, k) => acc + e.mult * rampa(t, chegada(k), chegada(k) + 0.08), 0)))
      const valoresAte = de.map((par, i) => par.map((v, m) => v + eventos[i]
        .reduce((acc, e, k) => acc + (e.tipo === METRICAS[m].icone && t >= chegada(k) ? e.mult : 0), 0)))
      const icones = []
      eventos.forEach((lista, i) => {
        lista.forEach((e, k) => {
          const tc = chegada(k)
          if (t > tc + 0.12) return                         // ja bateu e sumiu
          const av = Math.min(1, t / tc)                    // 0 = borda direita, 1 = no corredor
          icones.push({
            tipo: e.tipo,
            mult: e.mult,
            x: (W + 90) + (pos[i] - (W + 90)) * ease(av),
            y: RAIA_Y[i] - 160,
            r: R_ICONE,
            op: t <= tc ? 1 : 1 - (t - tc) / 0.12,
          })
        })
      })
      const brilho = eventos.map((lista) => {
        if (!lista.length) return 0
        const ult = chegada(lista.length - 1)
        return t >= ult && t < ult + 0.30 ? (t - ult) / 0.30 : 0
      })
      await escrever(
        svgFrame({
          posicoes: pos, valores: valoresAte, cabecalho: `${data} · ${adv}`,
          progresso: (j + t) / CORRIDA.jogos.length, brilho,
        }),
        [...camadasSprites(pos, frame), { input: svgIcones(icones), top: 0, left: 0 }],
      )
    }
  }

  // ---- o vencedor
  //
  // UM MODAL SO no fim. Antes vinha uma lista com os tres colocados e logo depois o card do
  // vencedor, e o segundo repetia o que o primeiro ja tinha dito: dois desfechos seguidos
  // esvaziam o desfecho.
  const posFinal = TOTAL.map((par) => xDe(PART(par)))
  const ordem = CORRIDA.corredores
    .map((c, i) => ({ c, i, p: PART(TOTAL[i]) }))
    .sort((a, b) => b.p - a.p)

  const camp = ordem[0]

  // ---- a chegada: acabou a temporada, o lider cruza a bandeirinha
  for (let f = 0; f < F_CHEGADA; f++) {
    const t = ease((f + 1) / F_CHEGADA)
    const pos = posFinal.map((x, i) => (i === camp.i ? x + (PISTA_X1 + 46 - x) * t : x))
    await escrever(
      svgFrame({
        posicoes: pos, valores: TOTAL, cabecalho: 'FIM DA TEMPORADA', progresso: 1,
      }),
      camadasSprites(pos, f),
    )
  }
  const posCruzou = posFinal.map((x, i) => (i === camp.i ? PISTA_X1 + 46 : x))

  for (let f = 0; f < F_FIM; f++) {
    const painel = svgPainel(`
      <text x="${W / 2}" y="${H / 2 - 170}" text-anchor="middle" font-family="${ROUND}" font-size="56"
        font-weight="bold" fill="${GARNET}">${esc(CORRIDA.veredito || 'QUEM MAIS PARTICIPOU')}</text>
      <text x="${W / 2}" y="${H / 2 - 40}" text-anchor="middle" font-family="${ROUND}" font-size="104"
        font-weight="bold" fill="${INK}">${esc(camp.c.nome)}</text>
      ${METRICAS.map((m, k) => {
        const largura = 230, x0 = W / 2 - (NM * largura) / 2 + k * largura + 40
        return `${ICONES[m.icone](x0, H / 2 + 44, 26)}
          <text x="${x0 + 50}" y="${H / 2 + 62}" text-anchor="start" font-family="${ROUND}" font-size="60"
            font-weight="bold" fill="${INK}">${TOTAL[camp.i][k]}</text>`
      }).join('')}
      <text x="${W / 2}" y="${H / 2 + 190}" text-anchor="middle" font-family="${ROUND}" font-size="46"
        font-weight="bold" fill="${GARNET}">você apostou em quem?</text>`)
    await escrever(
      svgFrame({
        posicoes: posCruzou, valores: TOTAL, cabecalho: 'E O VENCEDOR É...', progresso: 1,
      }),
      [...camadasSprites(posCruzou, f), { input: painel, top: 0, left: 0 }],
    )
  }

  console.log(`${frame} frames (${(frame / FPS).toFixed(1)}s)`)

  const mp4 = videoFinal(VIDEO_ID)
  await exec('ffmpeg', ['-y', '-framerate', String(FPS), '-i', path.join(dirFrames, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
  if (!process.env.FRAMES) await fs.rm(dirFrames, { recursive: true, force: true })
  console.log('video ->', mp4)
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
