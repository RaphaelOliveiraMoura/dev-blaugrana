// Orquestra o render de um vídeo (animação keyframe) ponta a ponta:
// staging dos assets -> monta scene.json -> Remotion (frames) -> vídeo mudo -> mux de áudio.
// Saída: videos/<id>/final.mp4 (servível por /files).
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CONTEUDO_DIR, VIDEO_DIR, videoDir as videoDirAbs, videoFinal } from '../config.mjs'
import { montarCena } from './montar-cena.mjs'
import { spritesDoRoteiro } from './sprites-do-roteiro.mjs'
import { comVaga } from '../lib/lock.mjs'
import { MAX_RENDERS_PARALELOS } from '../../shared/constantes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REMOTION_DIR = path.resolve(__dirname, '../../remotion')
const PUB = path.join(REMOTION_DIR, 'public')
const FONTS_DIR = path.join(REMOTION_DIR, 'assets', 'fonts')
const SFX_DIR = path.join(REMOTION_DIR, 'assets', 'sfx')

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts })
    let out = ''
    p.stdout?.on('data', (d) => { out += d; opts.onLog?.(String(d)) })
    p.stderr?.on('data', (d) => { out += d; opts.onLog?.(String(d)) })
    p.on('error', reject)
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} saiu ${code}\n${out.split('\n').slice(-12).join('\n')}`))))
  })
}
const copy = (src, dst) => fs.copyFile(src, dst)

// FOLHA DE REVISÃO: monta uma imagem única com N frames espalhados pelo vídeo, cada um rotulado com
// #ordem, frame, tempo e CENA. Sai de graça dos JPEGs que o Remotion já renderizou (antes de apagar).
// Serve pra bater o olho no vídeo inteiro (orientação, posição, sobreposição, deslize) sem reassistir.
// Saída: videos/<id>/_review.png (servível por /files, exibida no studio).
async function montarFolhaRevisao({ id, scene, framesDir, pad, totalFrames, n = 16 }) {
  // limites [ini,fim) de cada shot (conta a sobreposição das transições, igual ao montarRoteiro)
  const bounds = []; let cursor = 0
  ;(scene.shots || []).forEach((s, i) => {
    const ov = (i > 0 && s.transition && s.transition !== 'none') ? (s.tdur || 0) : 0
    const start = Math.max(0, cursor - ov); const end = start + s.dur; bounds.push([start, end]); cursor = end
  })
  const cenaDe = (f) => { for (let i = 0; i < bounds.length; i++) if (f >= bounds[i][0] && f < bounds[i][1]) return i; return bounds.length - 1 }
  const fps = scene.fps || 30
  const N = Math.max(4, Math.min(24, n))
  const frames = Array.from({ length: N }, (_, i) => Math.min(totalFrames - 1, Math.round((i * (totalFrames - 1)) / (N - 1))))
  const fpath = (f) => path.join(framesDir, `element-${String(f).padStart(pad, '0')}.jpeg`)

  const TW = 300 // largura do thumb
  const first = await sharp(fpath(frames[0])).metadata()
  const th = Math.round(TW * (first.height / first.width))
  const cols = 4, rows = Math.ceil(N / cols), padc = 8, lab = 30
  const cw = TW + padc * 2, chh = th + padc * 2 + lab
  const comps = []
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]
    const r = Math.floor(i / cols), c = i % cols
    const x = c * cw + padc, y = r * chh + padc
    const thumb = await sharp(fpath(f)).resize(TW, th).jpeg().toBuffer().catch(() => null)
    if (thumb) comps.push({ input: thumb, left: x, top: y })
    const t = (f / fps).toFixed(1)
    const svg = Buffer.from(`<svg width="${TW}" height="${lab}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="7" y="21" font-family="monospace" font-size="18" fill="#fff">#${i + 1}  f${f}  ${t}s  CENA ${cenaDe(f) + 1}</text></svg>`)
    comps.push({ input: svg, left: x, top: y + th + padc })
  }
  const out = path.join(videoDirAbs(id), '_review.png')
  await sharp({ create: { width: cols * cw, height: rows * chh, channels: 4, background: { r: 24, g: 24, b: 24, alpha: 1 } } })
    .composite(comps).png().toFile(out)
  return `videos/${id}/_review.png`
}

// Assets do vídeo -> pasta pública DAQUELA execução (`pub`). Sem `pub` cai no
// remotion/public de sempre, que é o que o Studio do Remotion abre à mão.
export async function stage(video, pub = PUB) {
  const id = video.id
  const kfDir = path.join(videoDirAbs(id), 'kf')
  const cenDir = path.join(videoDirAbs(id), 'cenario')
  const PUB = pub
  await fs.rm(PUB, { recursive: true, force: true })
  await fs.mkdir(PUB, { recursive: true })
  // fontes do motor
  for (const f of await fs.readdir(FONTS_DIR)) await copy(path.join(FONTS_DIR, f), path.join(PUB, f))

  // SPRITES: vêm da PASTA DO PERSONAGEM, não de uma cópia por vídeo. Antes, todo sprite era
  // duplicado em `videos/<id>/kf/` no build: o mesmo ciclo de caminhada existia em N cópias, uma
  // por vídeo, e melhorar a arte de um personagem não alcançava os vídeos já montados. Agora o
  // acervo do personagem é a fonte única e o render achata os nomes aqui (o motor referencia
  // "<slug>-w1.png", que é o que permite a mesma arte servir qualquer vídeo).
  const usados = spritesDoRoteiro(video)
  const faltando = []
  for (const s of usados) {
    const ok = await copy(path.join(CONTEUDO_DIR, s.origem), path.join(PUB, s.nome)).then(() => true).catch(() => false)
    if (!ok) faltando.push(s)
  }
  // kf/ ainda é lido DEPOIS, e sobrescreve: é onde ficam os sprites que não são de personagem
  // (keyframes compostos, clipes .webm) e a saída de vídeos antigos ainda não migrados.
  for (const f of await fs.readdir(kfDir).catch(() => [])) {
    if (f.endsWith('.png') || f.endsWith('.webm')) await copy(path.join(kfDir, f), path.join(PUB, f))
  }
  if (faltando.length) {
    const aindaFalta = []
    for (const s of faltando) if (!(await fs.access(path.join(PUB, s.nome)).then(() => true).catch(() => false))) aindaFalta.push(s.nome)
    if (aindaFalta.length) console.warn(`[stage] ${aindaFalta.length} sprite(s) sem origem no personagem nem em kf/: ${aindaFalta.slice(0, 5).join(', ')}`)
  }
  // cenário: TODO cenario/*.png vira public/cenario-<nome>.png (base.png -> cenario-base.png,
  // real-hall.png -> cenario-real-hall.png, etc). O composer referencia por esse nome.
  for (const f of await fs.readdir(cenDir)) if (f.endsWith('.png')) await copy(path.join(cenDir, f), path.join(PUB, `cenario-${f}`))
  // cenário animado (opcional): anim.mp4 -> cenario.mp4
  await copy(path.join(cenDir, 'anim.mp4'), path.join(PUB, 'cenario.mp4')).catch(() => {})
}

function muxArgs(silentAbs, audio, finalAbs) {
  const inputs = ['-y', '-i', silentAbs]
  const parts = []
  const mix = []
  let idx = 1
  if (audio.music) {
    inputs.push('-i', path.join(CONTEUDO_DIR, audio.music))
    parts.push(`[${idx}:a]aformat=channel_layouts=stereo,volume=${audio.musicVol},atrim=0:${audio.durSec},afade=t=in:d=0.6,afade=t=out:st=${(audio.durSec - 1.4).toFixed(3)}:d=1.4[m]`)
    mix.push('[m]'); idx++
  }
  audio.sfx.forEach((c, i) => {
    inputs.push('-i', path.join(SFX_DIR, c.src))
    const ms = Math.round(c.at * 1000)
    parts.push(`[${idx}:a]aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${c.vol}[s${i}]`)
    mix.push(`[s${i}]`); idx++
  })
  parts.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:dropout_transition=0,volume=0.9,alimiter=limit=0.95[a]`)
  return [...inputs, '-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', finalAbs]
}

export async function renderVideo(id, opts = {}) {
  // SEMÁFORO GLOBAL: render é pesado (Remotion + ffmpeg, swiftshader com concurrency=1).
  // Vale entre PROCESSOS, então protege também quem chama `renderVideo()` por script, que
  // passava por fora da trava `emAndamento` da rota. MAX_RENDERS_PARALELOS=1 = fila.
  return comVaga('render', MAX_RENDERS_PARALELOS, () => renderVideoAgora(id, opts),
    { aviso: `[render] outro render em andamento, esperando a vez...` })
}

async function renderVideoAgora(id, { onLog = () => {} } = {}) {
  const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8'))
  const { scene, audio, totalFrames } = montarCena(video)

  // PASTA DE EXECUÇÃO: antes tudo era caminho FIXO (public/, src/scene.json, frames/,
  // video-silent.mp4). Dois renders ao mesmo tempo se destruíam em silêncio: o segundo
  // apagava o public do primeiro no meio da renderização e o MP4 saía com sprite errado
  // ou faltando, sem erro nenhum. Agora cada render tem a sua, e some no fim.
  const runDir = path.join(REMOTION_DIR, '_runs', `${id}-${process.pid}-${Date.now()}`)
  const pubDir = path.join(runDir, 'public')
  const framesDir = path.join(runDir, 'frames')
  const sceneFile = path.join(runDir, 'scene.json')
  const silent = path.join(runDir, 'video-silent.mp4')
  await fs.mkdir(framesDir, { recursive: true })

  try {
  onLog('staging assets...\n')
  await stage(video, pubDir)
  await fs.writeFile(sceneFile, JSON.stringify(scene, null, 2))

  onLog('renderizando (Remotion)...\n')
  // --props leva a cena DESTA execução (o motor lê via scene-atual.js); --public-dir isola
  // os assets. O src/scene.json continua existindo só como fallback do Studio do Remotion.
  await run('npx', ['remotion', 'render', 'src/index.jsx', 'Cena', framesDir, '--sequence', '--image-format=jpeg',
    '--gl=swiftshader', '--concurrency=1', `--props=${sceneFile}`, `--public-dir=${pubDir}`], { cwd: REMOTION_DIR, onLog })

  const pad = String(Math.max(0, totalFrames - 1)).length
  onLog('montando vídeo mudo...\n')
  await run('ffmpeg', ['-y', '-framerate', String(scene.fps), '-i', path.join(framesDir, `element-%0${pad}d.jpeg`), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', silent], { onLog })

  const finalAbs = videoFinal(id)
  await fs.mkdir(path.dirname(finalAbs), { recursive: true })
  // vídeo sem áudio: pula o mux e usa o mudo direto (flag do vídeo ou trilhas vazias)
  const semAudio = video.semAudio === true || (!audio.music && (!audio.sfx || audio.sfx.length === 0))
  if (semAudio) {
    onLog('sem áudio: usando vídeo mudo direto...\n')
    await fs.copyFile(silent, finalAbs)
  } else {
    onLog('mixando áudio...\n')
    await run('ffmpeg', muxArgs(silent, audio, finalAbs), { onLog })
  }

  // folha de revisão (barata: usa os JPEGs já renderizados) — nunca derruba o render se falhar
  let review = null
  try {
    onLog('montando folha de revisão...\n')
    review = await montarFolhaRevisao({ id, scene, framesDir, pad, totalFrames })
  } catch (e) { onLog('folha de revisão falhou: ' + e.message + '\n') }

  return { ok: true, final: `videos/${id}/final.mp4`, frames: totalFrames, review }
  } finally {
    // a pasta da execução some sempre, inclusive se o render falhar no meio
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => {})
  }
}
