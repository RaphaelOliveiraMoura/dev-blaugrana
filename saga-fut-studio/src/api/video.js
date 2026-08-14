import { getJSON, sendJSON } from './http.js'

// lista os sprites (keyframes fatiados) e o cenário que compõem o vídeo
export function getVideoAssets(videoId) {
  return getJSON('/api/video/assets?videoId=' + encodeURIComponent(videoId))
}

// dispara o render de um vídeo (Remotion + mux) no servidor; resolve quando o
// final.mp4 estiver pronto. Pode levar minutos (o server não corta o request).
// O server valida antes: se houver ERRO, rejeita com e.body = { erros, avisos } (status 422).
export function renderVideo(videoId) {
  return sendJSON('/api/video/render', { videoId })
}

// ANIMATIC: folha de contato do vídeo com BONECO no lugar do sprite que ainda não existe e grade
// com régua de x no lugar do cenário. Roda o motor de verdade, então escala, posição, orientação e
// ritmo já são os definitivos; só a arte é provisória. ~10s e nenhuma geração.
// Devolve { arquivo, cenas, stills, bonecos[], cenariosFalsos[], compras:[{slug,tipo,nome,comando}] }.
export function gerarAnimatic(videoId, { n = 12, cena = null, tudo = false, video = false } = {}) {
  return sendJSON('/api/video/animatic', { videoId, n, cena, tudo, video })
}

// A LINHA DO TEMPO DO SOM: o mesmo dado que vai pro mux, em segundos absolutos.
// { fps, durSec, shots[], ambiente, sfx:[{id,at,fim,dur,seg,continuo,derivado,cortado}], falas[] }
export function getVideoAudio(videoId) {
  return getJSON('/api/video/audio?videoId=' + encodeURIComponent(videoId))
}

// valida o vídeo SEM renderizar: { ok, erros, avisos }
export function validarVideo(videoId) {
  return getJSON('/api/video/validar?videoId=' + encodeURIComponent(videoId))
}

// layout de uma cena pro editor de palco. Sem frame = descanso; com frame = posição naquele instante.
// { w, h, dur, cenario, zoom, chars:[{idx,slug,cx,cy,cxRest,cyRest,w,flip,visible,src}], balloons:[{idx,text,x,y,size,visible}] }
export function getPalco(videoId, shot, frame) {
  const f = frame != null ? '&frame=' + frame : ''
  return getJSON('/api/video/palco?videoId=' + encodeURIComponent(videoId) + '&shot=' + (shot || 0) + f)
}
