import { Router } from 'express'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { exists } from '../lib/arquivos.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'
import { readDados, writeDados } from '../store.mjs'
import { quadrinhoSlide, quadrinhoVideo } from '../../shared/caminhos.mjs'
import { canalDo, fichaDoCanal } from '../../shared/canais.mjs'
import { instanteDePublicacao } from '../lib/youtube.mjs'
import { lerConfig, statusDoCanal, agendarTiktok, agendarInstagram } from '../lib/buffer.mjs'

export const bufferRouter = Router()

bufferRouter.get('/buffer/status', async (req, res) => {
  const canal = canalDo({ canal: req.query.canal })
  const cfg = await lerConfig()
  res.json(statusDoCanal(cfg, canal))
})

let ocupado = false

async function pecaComSlides(res, quadrinhoId) {
  const d = await readDados()
  const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
  if (!q) { res.status(404).json({ error: 'Quadrinho não encontrado.' }); return null }
  const slides = (q.paineis || []).filter((p) => p.numero != null)
  if (!slides.length) { res.status(400).json({ error: 'Este quadrinho não tem painéis.' }); return null }
  for (const p of slides) {
    const abs = path.join(CONTEUDO_DIR, quadrinhoSlide(q.id, p.numero))
    if (!(await exists(abs))) {
      res.status(400).json({ error: `Falta o slide ${p.numero}. Monte o carrossel na aba Publicar e volte.` })
      return null
    }
  }
  return q
}

bufferRouter.post('/buffer/tiktok', async (req, res) => {
  if (corpoInvalido(req, res, ['quadrinhoId', 'dia', 'hora'], 'buffer/tiktok')) return
  const { quadrinhoId, dia, hora } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  if (ocupado) return res.status(429).json({ error: 'Já há um agendamento no Buffer em andamento — espere ele terminar.' })

  try {
    const q = await pecaComSlides(res, quadrinhoId)
    if (!q) return
    if (q.tiktokBuffer?.postId) {
      return res.status(409).json({
        error: `Esta peça já foi agendada no TikTok via Buffer em ${q.tiktokBuffer.agendadoPara} `
          + `(@${q.tiktokBuffer.handle}). Agendar de novo criaria um segundo post. `
          + 'Se quiser mesmo refazer, apague o post no Buffer e limpe o campo `tiktokBuffer`.',
      })
    }
    const canal = canalDo(q)
    const quando = instanteDePublicacao(dia || q.agenda, hora)
    ocupado = true
    const r = await agendarTiktok({ quad: q, quando })
    const dd = await readDados()
    const alvo = (dd.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (alvo) {
      alvo.tiktokBuffer = {
        postId: r.postId, dueAt: r.dueAt, channelId: r.channelId,
        handle: r.handle, canal, agendadoPara: quando, slides: r.slides,
      }
      await writeDados(dd)
    }
    res.json({ ok: true, ...r, agendadoPara: quando, destino: fichaDoCanal(canal).nome })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    ocupado = false
  }
})

bufferRouter.post('/buffer/instagram', async (req, res) => {
  if (corpoInvalido(req, res, ['quadrinhoId', 'dia', 'hora', 'modo'], 'buffer/instagram')) return
  const { quadrinhoId, dia, hora, modo } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  if (modo !== 'carrossel' && modo !== 'reel') {
    return res.status(400).json({ error: 'modo tem que ser carrossel ou reel.' })
  }
  if (ocupado) return res.status(429).json({ error: 'Já há um agendamento no Buffer em andamento — espere ele terminar.' })

  try {
    const q = await pecaComSlides(res, quadrinhoId)
    if (!q) return
    if (modo === 'reel') {
      const abs = path.join(CONTEUDO_DIR, quadrinhoVideo(q.id))
      if (!(await exists(abs))) {
        return res.status(400).json({
          error: 'Não existe vídeo deste quadrinho ainda. Monte na aba Vídeo (Montar o quadrinho inteiro) e volte.',
        })
      }
    }
    const ja = q.instagramBuffer?.[modo]
    if (ja?.postId) {
      return res.status(409).json({
        error: `Este ${modo} já foi agendado no Instagram via Buffer em ${ja.agendadoPara} `
          + `(@${ja.handle}). Se quiser mesmo refazer, apague o post no Buffer e limpe instagramBuffer.${modo}.`,
      })
    }
    const canal = canalDo(q)
    const quando = instanteDePublicacao(dia || q.agenda, hora)
    ocupado = true
    const r = await agendarInstagram({ quad: q, quando, modo })
    const dd = await readDados()
    const alvo = (dd.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (alvo) {
      alvo.instagramBuffer = {
        ...(alvo.instagramBuffer || {}),
        [modo]: {
          postId: r.postId, dueAt: r.dueAt, channelId: r.channelId,
          handle: r.handle, canal, agendadoPara: quando, modo, slides: r.slides,
        },
      }
      await writeDados(dd)
    }
    res.json({ ok: true, ...r, agendadoPara: quando, destino: fichaDoCanal(canal).nome })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    ocupado = false
  }
})
