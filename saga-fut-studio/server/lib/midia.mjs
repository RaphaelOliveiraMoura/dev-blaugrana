import { AUDIO_EXTS, cenaAudio, cenaVideo } from '../config.mjs'
import { exists, firstExisting } from './arquivos.mjs'

// A narração de uma cena pode estar em qualquer um dos formatos aceitos.
export const audioDaCena = (epId, n) => firstExisting(AUDIO_EXTS.map((e) => cenaAudio(epId, n, e)))

// Status dos arquivos necessários para montar o rascunho de um episódio.
export async function epFiles(epId, nCenas) {
  const cenas = []
  for (let i = 1; i <= nCenas; i++) {
    const video = cenaVideo(epId, i)
    cenas.push({
      numero: i,
      video: (await exists(video)) ? video : null,
      audio: await audioDaCena(epId, i),
    })
  }
  return cenas
}
