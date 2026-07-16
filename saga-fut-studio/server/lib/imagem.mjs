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
