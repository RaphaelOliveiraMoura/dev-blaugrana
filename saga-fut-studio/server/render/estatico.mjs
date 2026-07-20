import { run, X264 } from '../lib/ffmpeg.mjs'

// A arte parada virando vídeo 9:16.
//
// O feed não aceita imagem, o que sobe é vídeo: o quadrinho vira um plano fixo
// segurando alguns segundos, e a música entra depois, por cima do conjunto.
//
// A arte é 4:5 (ou 1:1) e a tela é 9:16, então sobra faixa em cima e embaixo. Ela
// é preenchida com a própria arte ampliada e borrada, e não com preto: barra preta
// entrega print de imagem, e o feed trata isso como conteúdo de fora.
//
// O borrão sai barato de propósito: reduzir para 135x240, borrar aí e ampliar de
// volta dá o mesmo resultado que um gblur em 1080x1920, e o upscale por si já
// espalha o pouco que sobrou. Como o frame se repete 30x por segundo, o filtro caro
// custaria minutos por painel.
const VF_PARADO = [
  '[0:v]split=2[bg][fg]',
  '[bg]scale=135:240:force_original_aspect_ratio=increase,crop=135:240,gblur=sigma=8,scale=1080:1920,eq=brightness=-0.18[fundo]',
  '[fg]scale=1080:1920:force_original_aspect_ratio=decrease[arte]',
  '[fundo][arte]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30[v]',
].join(';')

// Um segmento parado: a arte segurando por `dur` segundos, com faixa de silêncio.
// O silêncio não é desperdício: é onde a trilha entra na mixagem, e sem ele o
// segmento não teria áudio para o concat casar.
export async function segmentoParado({ png, dur, saida }) {
  await run('ffmpeg', [
    '-y', '-loop', '1', '-framerate', '30', '-i', png,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', VF_PARADO,
    '-map', '[v]', '-map', '1:a', '-t', dur.toFixed(2), ...X264, saida,
  ])
  return saida
}

// A MESMA arte parada, mas com um push-in lento (Ken Burns): um zoom sutil, do centro,
// ao longo do hold. Dá a sensação de "vivo" que o corte seco não tem, de graça e sem
// passar pelo Grok. É o meio-termo entre o congelado e a animação de verdade.
//
// zoompan reinicia a contagem a cada frame de ENTRADA, então a fonte precisa ser um
// frame só (por isso, aqui, sem `-loop`): o próprio zoompan gera os `frames` do
// movimento a partir dessa imagem única. A composição 9:16 (fundo borrado + arte) é
// ampliada para 2x antes do zoompan para o push-in não amolecer, e volta a 1080x1920.
export async function segmentoKenBurns({ png, dur, saida }) {
  const frames = Math.max(1, Math.round(dur * 30))
  const inc = (0.10 / frames).toFixed(6) // 1.0 -> ~1.10 ao longo do hold: perceptível, sem enjoar
  const vf = [
    '[0:v]split=2[bg][fg]',
    '[bg]scale=135:240:force_original_aspect_ratio=increase,crop=135:240,gblur=sigma=8,scale=1080:1920,eq=brightness=-0.18[fundo]',
    '[fg]scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos[arte]',
    '[fundo][arte]overlay=(W-w)/2:(H-h)/2,setsar=1[base]',
    `[base]scale=2160:3840,zoompan=z='min(zoom+${inc},1.10)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1[v]`,
  ].join(';')
  await run('ffmpeg', [
    '-y', '-i', png,
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', vf,
    '-map', '[v]', '-map', '1:a', '-t', dur.toFixed(2), ...X264, saida,
  ])
  return saida
}
