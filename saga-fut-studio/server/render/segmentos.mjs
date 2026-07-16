import path from 'node:path'
import { prepCaptions, probeDuration, run, pngDataUri, X264 } from '../lib/ffmpeg.mjs'

// Um segmento por cena: clipe 9:16 + narração por cima + ambiência baixa + legendas.
// Depois eles são concatenados; a trilha entra por último, sobre o conjunto.

export const HOOK_DUR = 2.8   // segundos que o hook fica na tela; a legenda da cena 1 espera ele sair
const MAX_TEMPO = 1.35        // acelera a narração até aqui para caber no clipe (acima disso, o som degrada)
const VF_BASE = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30'

// Monta o segmento de uma cena. Retorna o caminho do mp4 e o ajuste aplicado, se houve.
export async function montarCena({ cena, tmp, capList, comHook, ehPrimeira }) {
  const seg = path.join(tmp, `seg${cena.numero}.mp4`)
  const capStartAt = comHook && ehPrimeira ? HOOK_DUR : 0

  if (cena.audio) {
    const clipDur = await probeDuration(cena.video)
    const narrDur = await probeDuration(cena.audio)
    // se a narração passa do clipe, acelera levemente (preserva o tom) em vez de congelar
    const tempo = narrDur > clipDur + 0.1 ? Math.min(narrDur / clipDur, MAX_TEMPO) : 1.0
    const narrEfetiva = narrDur / tempo
    const total = Math.max(clipDur, narrEfetiva)
    const extra = Math.max(0, total - clipDur) // congela só o resíduo, se o teto de tempo foi atingido (~0)
    const narFilter = tempo > 1.001 ? `atempo=${tempo.toFixed(3)},volume=1.0` : 'volume=1.0'
    // legendas sincronizam com a fala (narrEfetiva); na cena 1 com hook, esperam o hook sair
    const cap = await prepCaptions(capList, tmp, cena.numero, narrEfetiva, total, 2, capStartAt)
    await run('ffmpeg', [
      '-y', '-i', cena.video, '-i', cena.audio, ...cap.inputs,
      '-filter_complex', [
        `[0:v]${VF_BASE},tpad=stop_mode=clone:stop_duration=${extra.toFixed(2)}[vbase]`,
        ...cap.segs,
        '[0:a]volume=0.15[amb]',
        `[1:a]${narFilter}[nar]`,
        '[amb][nar]amix=inputs=2:duration=longest:normalize=0[a]',
      ].join(';'),
      '-map', cap.out, '-map', '[a]', '-t', total.toFixed(2), ...X264, seg,
    ])
    return { seg, ajuste: tempo > 1.001 ? `cena ${cena.numero}: narração ${tempo.toFixed(2)}x` : null }
  }

  if (capList && capList.length) {
    // sem narração, mas com legenda: distribui pela duração do clipe
    const clipDur = await probeDuration(cena.video)
    const cap = await prepCaptions(capList, tmp, cena.numero, clipDur, clipDur, 1, capStartAt)
    await run('ffmpeg', [
      '-y', '-i', cena.video, ...cap.inputs,
      '-filter_complex', [`[0:v]${VF_BASE}[vbase]`, ...cap.segs].join(';'),
      '-map', cap.out, '-map', '0:a?', ...X264, seg,
    ])
    return { seg, ajuste: null }
  }

  // sem narração e sem legenda: usa o clipe como está (áudio do Grok)
  await run('ffmpeg', ['-y', '-i', cena.video, '-vf', VF_BASE, ...X264, seg])
  return { seg, ajuste: null }
}

// Gancho de abertura: texto grande sobre a 1ª cena nos primeiros segundos (PNG do
// navegador). Sobrepõe no segmento já pronto, então independe de narração/legenda.
export async function aplicarHook(segCena1, hookCardPng, tmp) {
  const hookPng = await pngDataUri(hookCardPng, path.join(tmp, 'hook.png'))
  if (!hookPng) return segCena1
  const saida = path.join(tmp, 'seg1_hook.mp4')
  await run('ffmpeg', [
    '-y', '-i', segCena1, '-i', hookPng,
    '-filter_complex', `[0:v][1:v]overlay=0:0:enable='between(t,0,${HOOK_DUR})'[v]`,
    '-map', '[v]', '-map', '0:a?', ...X264, saida,
  ])
  return saida
}

// Card final "continua...", curto (~1,3s): sem tela preta morta no fim, que mata o loop.
export async function montarEndCard(endCardPng, tmp) {
  const png = await pngDataUri(endCardPng, path.join(tmp, 'endcard.png'))
  if (!png) return null
  const seg = path.join(tmp, 'seg_end.mp4')
  await run('ffmpeg', [
    '-y', '-loop', '1', '-i', png, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-t', '1.3', '-vf', 'scale=1080:1920,setsar=1,fps=30,fade=t=in:st=0:d=0.3', ...X264, seg,
  ])
  return seg
}
