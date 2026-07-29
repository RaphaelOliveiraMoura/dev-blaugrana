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
