import { Router } from 'express'
import path from 'node:path'
import { stat } from 'node:fs/promises'
import sharp from 'sharp'
import { CONTEUDO_DIR } from '../config.mjs'

export const thumbRouter = Router()

// MINIATURA SOB DEMANDA.
//
// POR QUE EXISTE: a tira de conferência da aba Publicar mostra os slides a 132px, e estava
// baixando o arquivo INTEIRO pra isso — 2,5 MB por slide, 20 MB num carrossel de 8. No desktop
// passa despercebido; no celular, que é onde a tira é usada, é espera e franquia de dados
// queimada pra desenhar uma imagem do tamanho de uma unha.
//
// O redimensionamento é barato (sharp já está no projeto pro resto do pipeline) e o resultado
// vai com `Cache-Control` longo: a miniatura só muda quando o slide é remontado, e aí o
// cache-bust da URL (`?v=`) resolve.
//
// A LARGURA É LIMITADA a um teto: sem isso, `?w=99999` viraria um jeito de fazer o servidor
// alocar memória à toa a cada request.
const MAX_W = 600

thumbRouter.get('/thumb', async (req, res) => {
  const rel = String(req.query.path || '')
  const w = Math.min(MAX_W, Math.max(16, Number(req.query.w) || 132))
  if (!rel) return res.status(400).json({ error: 'falta ?path=' })

  // mesma trava do abrir-pasta: confere no caminho RESOLVIDO, que é a única que segura um
  // `a/../../b` no meio
  const alvo = path.resolve(CONTEUDO_DIR, rel)
  const raiz = path.resolve(CONTEUDO_DIR)
  if (!alvo.startsWith(raiz + path.sep)) return res.status(400).json({ error: 'caminho fora do conteúdo' })

  try {
    await stat(alvo)
    const buf = await sharp(alvo).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
    res.set('Content-Type', 'image/webp')
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.send(buf)
  } catch (e) {
    res.status(404).json({ error: `não deu pra gerar a miniatura: ${e.message}` })
  }
})
