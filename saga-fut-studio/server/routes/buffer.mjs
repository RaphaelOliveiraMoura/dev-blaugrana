import { Router } from 'express'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { exists } from '../lib/arquivos.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'
import { readDados, writeDados } from '../store.mjs'
import { quadrinhoSlide } from '../../shared/caminhos.mjs'
import { canalDo, fichaDoCanal } from '../../shared/canais.mjs'
import { instanteDePublicacao } from '../lib/youtube.mjs'
import { lerConfig, statusDoCanal, agendarTiktok } from '../lib/buffer.mjs'

export const bufferRouter = Router()

bufferRouter.get('/buffer/status', async (req, res) => {
  const canal = canalDo({ canal: req.query.canal })
  const cfg = await lerConfig()
  res.json(statusDoCanal(cfg, canal))
})

const CAMPOS = ['quadrinhoId', 'dia', 'hora']
let ocupado = false

bufferRouter.post('/buffer/tiktok', async (req, res) => {
  if (corpoInvalido(req, res, CAMPOS, 'buffer/tiktok')) return
  const { quadrinhoId, dia, hora } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  if (ocupado) return res.status(429).json({ error: 'Já há um agendamento no Buffer em andamento — espere ele terminar.' })

  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    if (q.tiktokBuffer?.postId) {
      return res.status(409).json({
        error: `Esta peça já foi agendada no TikTok via Buffer em ${q.tiktokBuffer.agendadoPara} `
          + `(@${q.tiktokBuffer.handle}). Agendar de novo criaria um segundo post. `
          + 'Se quiser mesmo refazer, apague o post no Buffer e limpe o campo `tiktokBuffer`.',
      })
    }

    const slides = (q.paineis || []).filter((p) => p.numero != null)
    if (!slides.length) return res.status(400).json({ error: 'Este quadrinho não tem painéis.' })
    for (const p of slides) {
      const abs = path.join(CONTEUDO_DIR, quadrinhoSlide(q.id, p.numero))
      if (!(await exists(abs))) {
        return res.status(400).json({
          error: `Falta o slide ${p.numero}. Monte o carrossel na aba Publicar e volte.`,
        })
      }
    }

    const canal = canalDo(q)
    const quando = instanteDePublicacao(dia || q.agenda, hora)
    ocupado = true
    const r = await agendarTiktok({ quad: q, quando })

    const dd = await readDados()
    const alvo = (dd.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (alvo) {
      alvo.tiktokBuffer = {
        postId: r.postId,
        dueAt: r.dueAt,
        channelId: r.channelId,
        handle: r.handle,
        canal,
        agendadoPara: quando,
        slides: r.slides,
      }
      await writeDados(dd)
    }

    res.json({
      ok: true, ...r, agendadoPara: quando,
      destino: fichaDoCanal(canal).nome,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    ocupado = false
  }
})
