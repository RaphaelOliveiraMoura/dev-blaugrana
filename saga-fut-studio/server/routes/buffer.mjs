import { Router } from 'express'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { exists } from '../lib/arquivos.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'
import { readDados, writeDados } from '../store.mjs'
import { quadrinhoSlide, quadrinhoVideo } from '../../shared/caminhos.mjs'
import { canalDo, fichaDoCanal } from '../../shared/canais.mjs'
import { instanteDePublicacao } from '../lib/youtube.mjs'
import { lerConfig, statusDoCanal, agendarTiktok, agendarInstagram,
  lerPostBuffer, falhaTransitoriaDeMidia, republicarPostAgora } from '../lib/buffer.mjs'

export const bufferRouter = Router()

bufferRouter.get('/buffer/status', async (req, res) => {
  const canal = canalDo({ canal: req.query.canal })
  const cfg = await lerConfig()
  res.json(statusDoCanal(cfg, canal))
})

bufferRouter.get('/buffer/post', async (req, res) => {
  const id = String(req.query.id || '').trim()
  if (!id) return res.status(400).json({ error: 'Falta ?id= do post no Buffer.' })
  try {
    const post = await lerPostBuffer(id)
    res.json({
      id: post.id,
      status: post.status,
      dueAt: post.dueAt,
      error: post.error?.message || null,
      rawError: post.error?.rawError || null,
      transitorio: falhaTransitoriaDeMidia(post.error),
      podeRepublicar: post.status === 'error' && (post.allowedActions || []).includes('publishPostNow'),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

bufferRouter.post('/buffer/republicar', async (req, res) => {
  if (corpoInvalido(req, res, ['quadrinhoId', 'rede', 'modo'], 'buffer/republicar')) return
  const { quadrinhoId, rede, modo } = req.body || {}
  if (rede !== 'tiktok' && rede !== 'instagram') {
    return res.status(400).json({ error: 'rede tem que ser tiktok ou instagram.' })
  }
  if (ocupado) return res.status(429).json({ error: 'Já há um agendamento no Buffer em andamento — espere ele terminar.' })
  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })
    const ficha = rede === 'tiktok' ? q.tiktokBuffer : q.instagramBuffer?.[modo]
    if (!ficha?.postId) return res.status(400).json({ error: 'Esta peça não tem post no Buffer pra republicar.' })
    if ((ficha.retried || 0) >= 3) {
      return res.status(400).json({
        error: 'Já tentou republicar 3 vezes. Confira o post no calendário do Buffer, '
          + 'ou apague, limpe o campo e agende de novo.',
      })
    }
    ocupado = true
    const r = await republicarPostAgora(ficha.postId)
    const dd = await readDados()
    const alvo = (dd.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (alvo) {
      const slot = rede === 'tiktok' ? alvo.tiktokBuffer : alvo.instagramBuffer?.[modo]
      if (slot) {
        slot.retried = (slot.retried || 0) + (r.ja ? 0 : 1)
        slot.statusBuffer = r.post.status
        if (r.post.dueAt) slot.dueAt = r.post.dueAt
      }
      await writeDados(dd)
    }
    res.json({ ok: true, ja: r.ja, status: r.post.status, dueAt: r.post.dueAt, postId: r.post.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    ocupado = false
  }
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
