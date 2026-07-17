import { Router } from 'express'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { backupFile } from '../lib/arquivos.mjs'
import { readDados } from '../store.mjs'
import { comporPrompt, comporPedidoVideo } from '../prompts.mjs'
import { resolverModeloImagem, MODELOS_IMAGEM, MODELO_IMAGEM_PADRAO } from '../providers/imagem.mjs'
import { generateVideo } from '../providers/grok-video.mjs'
import { normalizarImagem } from '../lib/imagem.mjs'
import { MAX_GERACOES_PARALELAS, VIDEO_SEGUNDOS_PADRAO } from '../../shared/constantes.mjs'

export const generateRouter = Router()

// Os modelos de imagem disponíveis, pra UI montar o seletor da troca global. O
// escolhido mora em projeto.modeloImagem (salvo pelo fluxo normal de dados).
generateRouter.get('/generate/modelos', (_req, res) => {
  res.json({
    padrao: MODELO_IMAGEM_PADRAO,
    modelos: Object.values(MODELOS_IMAGEM).map((m) => ({ id: m.id, nome: m.nome, curto: m.curto, assinatura: m.assinatura })),
  })
})

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
    // o modelo é o global do projeto (ou o override da request); o resto é igual pros dois
    const modelo = resolverModeloImagem(d, req.body?.modelo)
    await modelo.gerar(pedido, outAbs)
    // trava de tamanho: o modelo pode ter derivado do formato pedido; aqui garantimos.
    const norm = await normalizarImagem(outAbs, pedido.dim)
    res.json({ ok: true, path: pedido.outRel, referencias: pedido.refs, tamanho: norm, modelo: modelo.id })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    emGeracao--
  }
})

// Geração de vídeo da cena via Grok Imagine (image_to_video pela assinatura SuperGrok).
// A arte parada da cena vira a animação descrita em cena.promptVideo. Fila própria: o
// vídeo é bem mais pesado que a imagem, então não divide o mesmo teto de paralelismo.
let emGeracaoVideo = 0

generateRouter.post('/generate/video', async (req, res) => {
  if (emGeracaoVideo >= MAX_GERACOES_PARALELAS) {
    return res.status(429).json({ error: `Limite de ${MAX_GERACOES_PARALELAS} vídeos simultâneos atingido — aguarde um terminar.` })
  }
  emGeracaoVideo++
  try {
    const d = await readDados()
    const pedido = await comporPedidoVideo(d, req.body)
    const outAbs = path.join(CONTEUDO_DIR, pedido.outRel)
    await backupFile(outAbs) // preserva o vídeo anterior antes de sobrescrever
    const duracao = Math.max(1, Number(req.body?.segundos) || VIDEO_SEGUNDOS_PADRAO)
    await generateVideo({
      cwd: CONTEUDO_DIR,
      imagemRel: pedido.imagemRel,
      outRel: pedido.outRel,
      outAbs,
      movimento: pedido.movimento,
      duracao,
    })
    res.json({ ok: true, path: pedido.outRel })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    emGeracaoVideo--
  }
})
