import { Router } from 'express'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { backupFile } from '../lib/arquivos.mjs'
import { readDados } from '../store.mjs'
import { comporPrompt, instrucaoCodex } from '../prompts.mjs'
import { generateImage } from '../providers/codex-image.mjs'
import { normalizarImagem } from '../lib/imagem.mjs'
import { MAX_GERACOES_PARALELAS } from '../../shared/constantes.mjs'

export const generateRouter = Router()

// Geração de imagem via Codex (gpt-image-2 pela assinatura Plus).
// O front já limita a fila, mas o teto real é aqui: uma aba a mais não pode
// estourar o número de codex rodando ao mesmo tempo.
let emGeracao = 0

generateRouter.post('/generate/imagem', async (req, res) => {
  if (emGeracao >= MAX_GERACOES_PARALELAS) {
    return res.status(429).json({ error: `Limite de ${MAX_GERACOES_PARALELAS} gerações simultâneas atingido — aguarde uma terminar.` })
  }
  emGeracao++
  try {
    const d = await readDados()
    const pedido = await comporPrompt(d, req.body)
    const outAbs = path.join(CONTEUDO_DIR, pedido.outRel)
    await backupFile(outAbs) // preserva a imagem anterior antes de sobrescrever
    await generateImage({
      cwd: CONTEUDO_DIR,
      prompt: instrucaoCodex(pedido),
      referencias: pedido.refs.map((r) => r.rel), // a ordem aqui é a que o hint descreve
      outAbs,
    })
    // trava de tamanho: o modelo pode ter derivado do formato pedido; aqui garantimos.
    const norm = await normalizarImagem(outAbs, pedido.dim)
    res.json({ ok: true, path: pedido.outRel, referencias: pedido.refs, tamanho: norm })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    emGeracao--
  }
})
