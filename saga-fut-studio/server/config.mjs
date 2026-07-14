import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Todo conteúdo do projeto (dados, mídia, assets) vive fora do studio, em saga-fut/.
export const CONTEUDO_DIR = path.resolve(__dirname, '../../saga-fut')

export const DATA_DIR = path.join(CONTEUDO_DIR, 'data')        // fonte de verdade: split por saga
export const PROJECT_FILE = path.join(DATA_DIR, 'project.json') // global (projeto, personagens, estilos)
export const SAGAS_DIR = path.join(DATA_DIR, 'sagas')           // um .json por saga
export const QUAD_DIR = path.join(DATA_DIR, 'quadrinhos')       // um .json por quadrinho
export const BACKUPS_DIR = path.join(CONTEUDO_DIR, '_backups')
export const MUSICA_DIR = path.join(CONTEUDO_DIR, 'assets', 'musica')
export const INICIOS_FILE = path.join(MUSICA_DIR, 'inicios.json')

export const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac']

// caminhos da mídia de um episódio (o front usa os mesmos, via scaffold.js)
export const cenaVideo = (epId, n) => path.join(CONTEUDO_DIR, 'episodios', epId, 'cenas', `${n}.mp4`)
export const cenaAudio = (epId, n, ext) => path.join(CONTEUDO_DIR, 'episodios', epId, 'audio', `${n}.${ext}`)
export const roughCut = (epId) => path.join(CONTEUDO_DIR, 'episodios', epId, 'rough-cut.mp4')

// regras da casa para painel de quadrinho, quando o projeto não define as suas
export const QUAD_RULES_PADRAO = 'comic book panel, bold clean speech balloons with short legible text, expressive exaggerated faces; no real brand logos, no official crests, plain golden star instead; keep each character identical to their reference sheet.'
