import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { run } from './ffmpeg.mjs'

// A trava de tamanho: o prompt PEDE o formato certo, mas quem GARANTE é isto. Formatos
// que o gpt-image não gera de fábrica (3:4, 4:5) derivam mesmo pedindo pixel exato, então
// depois de gerar a imagem nós a forçamos ao alvo. Sem isto o pool volta a ter cada painel
// num tamanho, que foi o bug original (971x1619 ao lado de 1254x1254 no mesmo formato).

function dimensao(file) {
  return new Promise((resolve) => {
    let out = ''
    const p = spawn('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file])
    p.stdout.on('data', (d) => (out += d))
    p.on('error', () => resolve(null))
    p.on('close', () => {
      const [w, h] = out.trim().split('x').map(Number)
      resolve(w && h ? { w, h } : null)
    })
  })
}

// Força o PNG a ter exatamente wxh, sem distorcer: escala mantendo a proporção até COBRIR
// o alvo e corta o excesso, centralizado (force_original_aspect_ratio=increase + crop). Como
// o modelo já gera perto do alvo, o corte é pequeno; se a imagem já está no tamanho, é no-op.
export async function normalizarImagem(abs, dim) {
  if (!dim?.w || !dim?.h) return { ok: false, motivo: 'sem dimensão-alvo' }
  const atual = await dimensao(abs)
  if (!atual) return { ok: false, motivo: 'não consegui medir a imagem' }
  if (atual.w === dim.w && atual.h === dim.h) return { ok: true, ajustado: false }

  const tmp = path.join(path.dirname(abs), `.norm-${path.basename(abs)}`)
  const vf = `scale=${dim.w}:${dim.h}:force_original_aspect_ratio=increase,crop=${dim.w}:${dim.h}`
  await run('ffmpeg', ['-y', '-i', abs, '-vf', vf, tmp])
  await fs.rename(tmp, abs) // troca atômica sobre o arquivo final
  return { ok: true, ajustado: true, de: atual, para: dim }
}

// Tamanho de saída de cada formato de post. 1080 de base porque é o que os feeds
// servem em cheio; alturas seguem a proporção. 4:5 é o padrão (cabe inteiro no
// Instagram e some pouco no X); 9:16 serve o TikTok/Shorts foto; 1:1 é o seguro.
export const DIM_POST = {
  '4:5': { w: 1080, h: 1350 },
  '1:1': { w: 1080, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '3:2': { w: 1350, h: 900 },
}

// A grade do mosaico a partir do número de cenas: quadrada por padrão (ceil(√n)), que
// mantém o bloco perto de 3:4 (o próprio painel) e encaixa bem no retrato do feed. 2
// cenas fogem à regra e vão lado a lado (1 linha), que é a leitura natural de um par.
function grade(n) {
  if (n <= 1) return { cols: 1, rows: 1 }
  if (n === 2) return { cols: 2, rows: 1 }
  const cols = Math.ceil(Math.sqrt(n))
  return { cols, rows: Math.ceil(n / cols) }
}

// A cor da calha e das barras: em vez de branco fixo (que vira buraco no retrato,
// porque dois painéis 3:4 formam um bloco largo e sobra em cima e embaixo), amostra o
// papel do próprio quadrinho. Pega a média de um bloco no canto do painel, que na
// moldura dos nossos cartões é a margem creme. Assim a sobra deixa de parecer vazio e
// vira a margem da arte, e cada estilo traz o seu tom. Fallback branco se não medir.
function corDoPapel(png) {
  return new Promise((resolve) => {
    const chunks = []
    const p = spawn('ffmpeg', ['-v', 'error', '-i', png, '-vf', 'crop=24:24:2:2,scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    p.stdout.on('data', (d) => chunks.push(d))
    p.on('error', () => resolve('white'))
    p.on('close', () => {
      const b = Buffer.concat(chunks)
      resolve(b.length >= 3 ? '0x' + b.subarray(0, 3).toString('hex') : 'white')
    })
  })
}

// Junta as artes dos painéis num quadro só, no formato pedido. Cada painel vira uma
// célula 3:4 (corta o excesso, não distorce), com calha entre elas e na borda (o gutter
// que faz parecer quadrinho de verdade). O bloco da grade entra centralizado no canvas
// do formato e a sobra vira barra, na cor do papel do quadrinho: um bloco largo de
// retratos nunca preenche um quadrado, então em vez de esconder a sobra ela vira a
// margem da arte (ver corDoPapel). `fundo` força uma cor; sem ela, amostra o papel.
//
// Toda a montagem é um filtergraph do ffmpeg: cada input escala+corta pra célula e
// ganha meia-calha de pad; o xstack cola as células (meia + meia = calha inteira entre
// elas, fill nas vagas quando n não fecha a grade); um pad externo completa a borda e o
// par decrease+pad encaixa no formato final.
export async function montarMosaico({ pngs, dim, saida, gutter = 36, fundo }) {
  const n = pngs.length
  if (!n) throw new Error('mosaico sem nenhuma arte')
  const cor = fundo || await corDoPapel(pngs[0])
  const g = gutter % 2 ? gutter + 1 : gutter // par: a meia-calha (g/2) precisa ser inteira
  const CW = 900
  const CH = Math.round((CW * 4) / 3) // célula 3:4, o formato do painel
  const { cols } = grade(n)

  const inputs = pngs.flatMap((p) => ['-i', p])
  const cell = `scale=${CW}:${CH}:force_original_aspect_ratio=increase,crop=${CW}:${CH},pad=${CW + g}:${CH + g}:${g / 2}:${g / 2}:color=${cor},setsar=1`
  const pre = pngs.map((_, i) => `[${i}:v]${cell}[t${i}]`).join(';')

  let stack
  if (n === 1) {
    stack = '[t0]copy[grid]'
  } else {
    const layout = pngs.map((_, k) => {
      const c = k % cols
      const r = Math.floor(k / cols)
      return `${c === 0 ? '0' : `w0*${c}`}_${r === 0 ? '0' : `h0*${r}`}`
    }).join('|')
    const labels = pngs.map((_, i) => `[t${i}]`).join('')
    stack = `${labels}xstack=inputs=${n}:layout=${layout}:fill=${cor}[grid]`
  }

  const fit = `[grid]pad=iw+${g}:ih+${g}:${g / 2}:${g / 2}:color=${cor},`
    + `scale=${dim.w}:${dim.h}:force_original_aspect_ratio=decrease,`
    + `pad=${dim.w}:${dim.h}:(ow-iw)/2:(oh-ih)/2:color=${cor}[out]`

  await fs.mkdir(path.dirname(saida), { recursive: true })
  await run('ffmpeg', ['-y', ...inputs, '-filter_complex', `${pre};${stack};${fit}`, '-map', '[out]', '-frames:v', '1', saida])
  return saida
}

// Um slide de carrossel: a arte parada forçada ao formato do post (corta o excesso,
// centralizado, sem distorcer). Mesma trava de tamanho da normalizarImagem, só que a
// saída é um arquivo novo em vez de sobrescrever a arte.
export async function normalizarPara({ src, dim, saida }) {
  await fs.mkdir(path.dirname(saida), { recursive: true })
  const vf = `scale=${dim.w}:${dim.h}:force_original_aspect_ratio=increase,crop=${dim.w}:${dim.h}`
  await run('ffmpeg', ['-y', '-i', src, '-vf', vf, '-frames:v', '1', saida])
  return saida
}
