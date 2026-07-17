import { sendJSON, getJSON } from './http.js'

// Dispara a geração de uma imagem (ficha, cena ou painel). Pode levar minutos.
export const gerarImagem = (payload) => sendJSON('/api/generate/imagem', payload)

// Dispara a animação de uma cena via Grok Imagine (image_to_video). A arte parada da
// cena vira o vídeo descrito em promptVideo. Também leva minutos.
export const gerarVideo = (payload) => sendJSON('/api/generate/video', payload)

// Os modelos de imagem disponíveis (pro seletor de troca global). Cacheado: a lista é
// estática na sessão, não faz sentido rebuscar a cada tela que a usa.
let _modelosCache = null
export async function getModelosImagem() {
  if (!_modelosCache) _modelosCache = await getJSON('/api/generate/modelos')
  return _modelosCache
}
