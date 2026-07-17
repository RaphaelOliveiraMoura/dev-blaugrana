// Montagem do quadrinho ANIMADO: pega os clipes animados (Grok) de cada painel,
// reenquadra pra 9:16 (fundo borrado, mesmo tratamento do post estático) e junta com
// transição entre eles. A transição é escolhida por painel-relação na UI: 'dissolve'
// (para quadrinhos-espelho, o fundo troca e o personagem ancora) ou 'slide' (vira
// página). Corte seco é o fallback quando não se pede transição.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { run, probeDuration } from '../lib/ffmpeg.mjs'
import { INICIOS_FILE, MUSICA_DIR } from '../config.mjs'

// A arte vertical (3:4 do painel, ~9:16 do clipe) no centro de um 9:16, e a faixa que
// sobra é a própria arte borrada e escurecida (barra preta entrega print). Mesmo
// filtro do estatico.mjs, mas aqui a entrada é VÍDEO, não imagem em loop.
const VF_916 = [
  '[0:v]split=2[bg][fg]',
  '[bg]scale=135:240:force_original_aspect_ratio=increase,crop=135:240,gblur=sigma=8,scale=1080:1920,eq=brightness=-0.18[fundo]',
  '[fg]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos[arte]',
  '[fundo][arte]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v]',
].join(';')

const ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-ar', '48000', '-b:a', '128k']

// duração da transição, em segundos. Curta de propósito: é pontuação, não um efeito.
const T = 0.6

const XFADE = { dissolve: 'fade', slide: 'slideleft' }

// Reenquadra UM clipe animado para 9:16 com fundo borrado. Mantém o áudio do clipe.
export async function reframe916(inAbs, outAbs) {
  await run('ffmpeg', ['-y', '-i', inAbs, '-filter_complex', VF_916, '-map', '[v]', '-map', '0:a?', ...ENC, '-vsync', 'cfr', outAbs])
  return outAbs
}

// Junta os clipes (já 9:16) com a transição pedida. Iterativo, par a par: acumula o
// resultado e funde o próximo com xfade, deslocado para o fim do acumulado. Com um
// clipe só, devolve ele mesmo. Sem transição válida, corte seco (concat).
export async function juntarComTransicao(clipes916, outAbs, transicao) {
  if (!clipes916.length) throw new Error('Nenhum clipe para juntar.')
  if (clipes916.length === 1) { await fs.copyFile(clipes916[0], outAbs); return outAbs }

  const modo = XFADE[transicao]
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'quad-anim-'))
  try {
    // corte seco: concat direto, sem reencode do vídeo
    if (!modo) {
      const lista = path.join(tmp, 'list.txt')
      await fs.writeFile(lista, clipes916.map((c) => `file '${c}'`).join('\n'))
      await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', outAbs])
      return outAbs
    }

    let acc = clipes916[0]
    for (let i = 1; i < clipes916.length; i++) {
      const dAcc = await probeDuration(acc)
      const offset = Math.max(0, dAcc - T).toFixed(3)
      const saida = i === clipes916.length - 1 ? outAbs : path.join(tmp, `acc${i}.mp4`)
      const fc = `[0:v][1:v]xfade=transition=${modo}:duration=${T}:offset=${offset}[v];[0:a][1:a]acrossfade=d=${T}[a]`
      await run('ffmpeg', ['-y', '-i', acc, '-i', clipes916[i], '-filter_complex', fc, '-map', '[v]', '-map', '[a]', ...ENC, saida])
      acc = saida
    }
    return outAbs
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
}

// o segundo em que a faixa começa (pula intro quieta), do mesmo arquivo que a aba Vídeo usa
async function inicioDe(file) {
  try { const j = JSON.parse(await fs.readFile(INICIOS_FILE, 'utf8')); return Math.max(0, Number(j[file]) || 0) } catch { return 0 }
}

// Aplica uma trilha de fundo ao vídeo animado, começando no ponto salvo da faixa, no
// volume pedido, com fade de saída. Dois modos:
//   - mix (padrão): a música entra POR CIMA do áudio nativo do Grok (SFX/ambiência).
//   - soMusica: a música VIRA o áudio inteiro, silenciando o som do Grok.
// O vídeo passa intacto (-c:v copy). Não pode gravar sobre o próprio arquivo de
// entrada, então a rota monta numa base temporária e aponta outAbs pra saída final.
export async function aplicarMusica({ videoAbs, musica, vol, soMusica, outAbs }) {
  const musAbs = path.join(MUSICA_DIR, musica)
  const inicio = await inicioDe(musica)
  const dur = await probeDuration(videoAbs)
  const fadeOut = Math.max(0, dur - 0.6).toFixed(2)
  const fc = soMusica
    ? `[1:a]volume=${vol},afade=t=out:st=${fadeOut}:d=0.6[a]`
    : `[1:a]volume=${vol},afade=t=out:st=${fadeOut}:d=0.6[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`
  await run('ffmpeg', [
    '-y', '-i', videoAbs, '-ss', String(inicio), '-i', musAbs,
    '-filter_complex', fc, '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-shortest', outAbs,
  ])
  return outAbs
}
