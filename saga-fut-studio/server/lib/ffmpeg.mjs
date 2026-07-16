import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Encode de saída, igual em todo segmento: o concat depois é `-c copy`, e ele só
// junta o que foi codificado do mesmo jeito.
export const X264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000']

export function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args)
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('error', (e) => reject(new Error(`${cmd} não encontrado: ${e.message}`)))
    p.on('close', (code) => (code === 0 ? resolve(err) : reject(new Error(err.slice(-800)))))
  })
}

export async function probeDuration(file) {
  let out = ''
  await new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
    p.stdout.on('data', (d) => (out += d))
    p.on('error', reject)
    p.on('close', () => resolve())
  })
  return parseFloat(out.trim()) || 0
}

// Distribui os blocos de legenda ao longo da fala, proporcional ao tamanho do texto.
// startAt > 0 (cena 1 com hook): atrasa o início das legendas até o hook sair.
export function capWindows(capList, speakDur, totalDur, startAt = 0) {
  const totalChars = capList.reduce((s, c) => s + Math.max(1, (c.text || '').length), 0) || 1
  let acc = 0
  if (startAt > 0) {
    const span = Math.max(0.1, totalDur - startAt)
    return capList.map((c, i) => {
      const start = startAt + span * (acc / totalChars)
      acc += Math.max(1, (c.text || '').length)
      const end = i === capList.length - 1 ? totalDur : startAt + span * (acc / totalChars)
      return { start, end }
    })
  }
  return capList.map((c, i) => {
    const start = speakDur * (acc / totalChars)
    acc += Math.max(1, (c.text || '').length)
    const end = i === capList.length - 1 ? totalDur : speakDur * (acc / totalChars)
    return { start, end }
  })
}

// Grava os PNGs de legenda no tmp e monta a cadeia de overlays (base = [vbase]).
export async function prepCaptions(capList, tmp, cNum, speakDur, totalDur, capInputStart, capStartAt = 0) {
  if (!capList || !capList.length) return { inputs: [], segs: [], out: '[vbase]' }
  const windows = capWindows(capList, speakDur, totalDur, capStartAt)
  const inputs = []
  const segs = []
  let prev = '[vbase]'
  let idx = 0 // posição do input entre os PNGs efetivamente adicionados
  for (let k = 0; k < capList.length; k++) {
    if (!capList[k].png || !capList[k].png.startsWith('data:image/png;base64,')) continue
    const p = path.join(tmp, `cap${cNum}_${k}.png`)
    await fs.writeFile(p, Buffer.from(capList[k].png.split(',')[1], 'base64'))
    inputs.push('-i', p)
    const out = `[vc${idx}]`
    const w = windows[k]
    segs.push(`${prev}[${capInputStart + idx}:v]overlay=0:0:enable='between(t,${w.start.toFixed(2)},${w.end.toFixed(2)})'${out}`)
    prev = out
    idx++
  }
  return { inputs, segs, out: prev }
}

// Um PNG data-uri do navegador vira arquivo no tmp (ffmpeg não desenha texto aqui).
export async function pngDataUri(dataUri, destino) {
  if (!dataUri || !dataUri.startsWith('data:image/png;base64,')) return null
  await fs.writeFile(destino, Buffer.from(dataUri.split(',')[1], 'base64'))
  return destino
}
