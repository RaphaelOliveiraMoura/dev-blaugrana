import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as rel from '../shared/caminhos.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Todo conteúdo do projeto (dados, mídia, assets) vive fora do studio, em saga-fut/.
export const CONTEUDO_DIR = path.resolve(__dirname, '../../saga-fut')

export const DATA_DIR = path.join(CONTEUDO_DIR, 'data')        // fonte de verdade: split por saga
export const PROJECT_FILE = path.join(DATA_DIR, 'project.json') // global (projeto, personagens, estilos)
export const SAGAS_DIR = path.join(DATA_DIR, 'sagas')           // um .json por saga
export const QUAD_DIR = path.join(DATA_DIR, 'quadrinhos')       // um .json por quadrinho
export const BACKUPS_DIR = path.join(CONTEUDO_DIR, '_backups')
export const MUSICA_DIR = path.join(CONTEUDO_DIR, 'assets', 'musica')
// Vídeos baixados de fora (TikTok etc.) para referência/reaproveitamento. Ficam
// junto do resto do conteúdo (servido por /files), separados em pasta própria.
export const BAIXADOS_DIR = path.join(CONTEUDO_DIR, 'baixados')
// onde cada faixa começa a tocar: é dado, então mora em data/, não no meio dos MP3
export const INICIOS_FILE = path.join(DATA_DIR, 'musica-inicios.json')

export const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac']

// Versões absolutas dos caminhos de shared/caminhos.mjs (a regra mora lá; aqui só
// ancoramos na pasta de conteúdo).
export const cenaVideo = (epId, n) => path.join(CONTEUDO_DIR, rel.cenaVideo(epId, n))
export const cenaAudio = (epId, n, ext) => path.join(CONTEUDO_DIR, rel.cenaAudio(epId, n, ext))
export const roughCut = (epId) => path.join(CONTEUDO_DIR, rel.roughCut(epId))
export const painelVideo = (quadId, n) => path.join(CONTEUDO_DIR, rel.painelVideo(quadId, n))
export const quadrinhoVideo = (quadId) => path.join(CONTEUDO_DIR, rel.quadrinhoVideo(quadId))
export const quadrinhoMosaico = (quadId, formato) => path.join(CONTEUDO_DIR, rel.quadrinhoMosaico(quadId, formato))
export const quadrinhoSlide = (quadId, n) => path.join(CONTEUDO_DIR, rel.quadrinhoSlide(quadId, n))

// regras da casa para painel de quadrinho, quando o projeto não define as suas
export const QUAD_RULES_PADRAO = 'comic book panel, bold clean speech balloons with short legible text, expressive exaggerated faces; no real brand logos, no official crests, plain golden star instead; keep each character identical to their reference sheet.'
