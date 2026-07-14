import { Router } from 'express'
import { readDados, writeDados, validarPayload } from '../store.mjs'

export const dadosRouter = Router()

dadosRouter.get('/dados', async (_req, res) => {
  try {
    res.json(await readDados())
  } catch (err) {
    res.status(500).json({ error: `Não foi possível ler os dados: ${err.message}` })
  }
})

dadosRouter.put('/dados', async (req, res) => {
  try {
    const problema = validarPayload(req.body)
    if (problema) return res.status(400).json({ error: problema })
    await writeDados(req.body) // split por saga/quadrinho, atômico e com backup
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
