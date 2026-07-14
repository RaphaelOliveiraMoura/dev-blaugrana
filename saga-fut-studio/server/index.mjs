import express from 'express'
import { CONTEUDO_DIR, DATA_DIR } from './config.mjs'
import { dadosRouter } from './routes/dados.mjs'
import { midiaRouter } from './routes/midia.mjs'
import { generateRouter } from './routes/generate.mjs'
import { renderRouter } from './routes/render.mjs'
import { musicasRouter } from './routes/musicas.mjs'
import { PORTA_API } from '../shared/constantes.mjs'

const app = express()
app.use(express.json({ limit: '30mb' })) // PNGs de legenda por cena podem somar alguns MB

// Mídia do projeto (fichas, cenas, assets) servida direto da pasta de conteúdo
app.use('/files', express.static(CONTEUDO_DIR))

app.use('/api', dadosRouter)
app.use('/api', midiaRouter)
app.use('/api', generateRouter)
app.use('/api', renderRouter)
app.use('/api', musicasRouter)

const porta = Number(process.env.PORT) || PORTA_API
const server = app.listen(porta, () => {
  console.log(`[saga-fut-studio] API em http://localhost:${porta} — fonte: ${DATA_DIR}`)
})
// gerações de imagem podem levar vários minutos — desliga o corte padrão (300s) do Node
server.requestTimeout = 0
