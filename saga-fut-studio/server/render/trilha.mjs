import path from 'node:path'
import { MUSICA_DIR } from '../config.mjs'
import { exists } from '../lib/arquivos.mjs'
import { run } from '../lib/ffmpeg.mjs'
import { readInicios } from '../routes/musicas.mjs'

const X = 0.9 // duração do crossfade entre blocos de trilha

// Cada cena tem uma faixa efetiva: a própria, ou a que continua da cena anterior.
export function trilhaEfetivaPorCena(trilhaPorCena, musicaUnica, nCenas) {
  return Array.isArray(trilhaPorCena) && trilhaPorCena.length
    ? Array.from({ length: nCenas }, (_, i) => trilhaPorCena[i] || '')
    : Array.from({ length: nCenas }, (_, i) => (i === 0 && musicaUnica ? String(musicaUnica) : ''))
}

// Cenas contíguas com a mesma faixa viram um bloco só; a troca de faixa é o crossfade.
function blocosDeTrilha(porCena, segDur) {
  const blocos = []
  for (let i = 0; i < porCena.length; i++) {
    const d = segDur[i] || 0
    const ultimo = blocos[blocos.length - 1]
    if (ultimo && ultimo.faixa === porCena[i]) ultimo.dur += d
    else blocos.push({ faixa: porCena[i], dur: d })
  }
  return blocos
}

// Descarta faixa que não existe mais em disco (o nome fica salvo no episódio).
export async function apenasFaixasExistentes(porCena) {
  const out = [...porCena]
  for (let i = 0; i < out.length; i++) {
    if (out[i] && !(await exists(path.join(MUSICA_DIR, path.basename(String(out[i])))))) out[i] = ''
  }
  return out
}

// Mixa a trilha por baixo do áudio já montado, com crossfade nas trocas.
// Retorna quantos trechos de trilha entraram.
export async function mixarTrilha({ concatOut, outAbs, porCena, segDur, vol }) {
  const blocos = blocosDeTrilha(porCena, segDur)
  const musTotal = segDur.reduce((a, b) => a + (b || 0), 0) + 0.5
  const inicios = await readInicios()
  const inputs = []
  const filtros = []

  blocos.forEach((b, i) => {
    const Li = b.dur + (i === blocos.length - 1 ? 0.5 : X) // último estende, os outros cobrem o crossfade
    // começa a faixa no ponto onde o tema entra (pula intro quieta); com loop, cobre cenas longas
    const start = b.faixa ? Math.max(0, Number(inicios[path.basename(b.faixa)]) || 0) : 0
    if (b.faixa) inputs.push('-stream_loop', '-1', '-i', path.join(MUSICA_DIR, path.basename(b.faixa)))
    else inputs.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo')
    const volPart = b.faixa ? `,volume=${vol}` : ''
    filtros.push(`[${i + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=${start.toFixed(3)}:${(start + Li).toFixed(3)},asetpts=PTS-STARTPTS${volPart}[b${i}]`)
  })

  let prev = '[b0]'
  for (let i = 1; i < blocos.length; i++) {
    const out = i === blocos.length - 1 ? '[mixmus]' : `[x${i}]`
    filtros.push(`${prev}[b${i}]acrossfade=d=${X}:c1=tri:c2=tri${out}`)
    prev = out
  }
  const musLabel = blocos.length === 1 ? '[b0]' : '[mixmus]'
  filtros.push(`${musLabel}afade=t=in:st=0:d=0.6,afade=t=out:st=${Math.max(0, musTotal - 0.8).toFixed(2)}:d=0.8[musf]`)
  filtros.push('[0:a][musf]amix=inputs=2:duration=first:normalize=0[a]')

  await run('ffmpeg', [
    '-y', '-i', concatOut, ...inputs,
    '-filter_complex', filtros.join(';'),
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-shortest', outAbs,
  ])
  return blocos.filter((b) => b.faixa).length
}
