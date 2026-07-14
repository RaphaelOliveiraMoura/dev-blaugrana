import { sendJSON } from './http.js'

// Dispara a geração de uma imagem (ficha, cena ou painel). Pode levar minutos.
export const gerarImagem = (payload) => sendJSON('/api/generate/imagem', payload)
