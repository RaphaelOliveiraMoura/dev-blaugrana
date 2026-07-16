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
