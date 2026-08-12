import path from 'node:path'
import { exists } from '../lib/arquivos.mjs'
import { run } from '../lib/ffmpeg.mjs'

const X = 0.9 // duração do crossfade entre blocos de trilha

// A BIBLIOTECA VEM DE FORA, E É OBRIGATÓRIA (`BIB_SAGA` / `BIB_QUADRINHO`, de routes/musicas.mjs).
// Este arquivo é compartilhado pelo rough-cut das sagas e pelo vídeo do quadrinho, que leem
// pastas diferentes; enquanto a pasta era uma constante daqui, o quadrinho montava trilha da
// biblioteca das sagas sem erro nenhum. Sem default de propósito: default aqui é o mesmo bug de
// volta, calado, no próximo chamador que esquecer de passar.
function exigeBiblioteca(bib, quem) {
  if (!bib?.dir || typeof bib.inicios !== 'function') {
    throw new Error(`${quem}: falta a biblioteca de música (passe BIB_SAGA ou BIB_QUADRINHO).`)
  }
  return bib
}

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
export async function apenasFaixasExistentes(porCena, bib) {
  const { dir } = exigeBiblioteca(bib, 'apenasFaixasExistentes')
  const out = [...porCena]
  for (let i = 0; i < out.length; i++) {
    if (out[i] && !(await exists(path.join(dir, path.basename(String(out[i])))))) out[i] = ''
  }
  return out
}

// Mixa a trilha por baixo do áudio já montado, com crossfade nas trocas.
// Retorna quantos trechos de trilha entraram.
export async function mixarTrilha({ concatOut, outAbs, porCena, segDur, vol, bib }) {
  const { dir, inicios: lerInicios } = exigeBiblioteca(bib, 'mixarTrilha')
  const blocos = blocosDeTrilha(porCena, segDur)
  const musTotal = segDur.reduce((a, b) => a + (b || 0), 0) + 0.5
  const inicios = await lerInicios()
  const inputs = []
  const filtros = []

  blocos.forEach((b, i) => {
    const Li = b.dur + (i === blocos.length - 1 ? 0.5 : X) // último estende, os outros cobrem o crossfade
    // começa a faixa no ponto onde o tema entra (pula intro quieta); com loop, cobre cenas longas
    const start = b.faixa ? Math.max(0, Number(inicios[path.basename(b.faixa)]) || 0) : 0
    if (b.faixa) inputs.push('-stream_loop', '-1', '-i', path.join(dir, path.basename(b.faixa)))
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
