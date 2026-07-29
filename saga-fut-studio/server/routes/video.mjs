import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { renderVideo } from '../video/render-video.mjs'
import { validarCena } from '../video/validar-cena.mjs'
import { montarCena } from '../video/montar-cena.mjs'
import { videoDir, VIDEO_DIR } from '../config.mjs'
import * as rel from '../../shared/caminhos.mjs'

export const videoRouter = Router()

const sanId = (v) => (/^[a-zA-Z0-9_-]+$/.test(String(v || '')) ? String(v) : null)

// GET /api/video/assets?videoId= -> lista TUDO que compõe o vídeo: sprites (kf/*.png),
// animações transparentes/Grok (kf/*.webm) e cenários (cenario/*.png|mp4). A UI mostra tudo.
videoRouter.get('/video/assets', async (req, res) => {
  const id = sanId(req.query?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try {
    const base = videoDir(id)
    const listar = async (sub, exts) => (await fs.readdir(path.join(base, sub)).catch(() => []))
      .filter((f) => !f.startsWith('_') && exts.some((e) => f.toLowerCase().endsWith(e)))
      .sort()
      .map((f) => ({ nome: f.replace(/\.[^.]+$/, ''), arquivo: `videos/${id}/${sub}/${f}`, ext: f.split('.').pop().toLowerCase() }))
    const kfAll = await listar('kf', ['.png', '.webm'])
    const kf = kfAll.filter((a) => a.ext === 'png')
    const animacoes = kfAll.filter((a) => a.ext === 'webm')
    const cenarios = await listar('cenario', ['.png', '.mp4'])
    res.json({ kf, animacoes, cenarios, cenario: { base: rel.videoCenarioBase(id), anim: rel.videoCenarioAnim(id) } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/video/validar?videoId= -> roda o validador pré-render (montarCena) SEM renderizar.
// Devolve { ok, erros, avisos }: sprite/cenário faltando, sobreposição, spot fora do canvas, etc.
videoRouter.get('/video/validar', async (req, res) => {
  const id = sanId(req.query?.videoId)
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try { res.json(await validarCena(id)) }
  catch (e) { res.status(500).json({ error: e.message }) }
})

// interp linear de trilha [[t,x],...] (mesma convenção do motor), clamp nas pontas
const _interp = (tr, f) => {
  if (!tr || !tr.length) return 0
  if (f <= tr[0][0]) return tr[0][1]
  const last = tr[tr.length - 1]; if (f >= last[0]) return last[1]
  for (let i = 1; i < tr.length; i++) { const [t0, x0] = tr[i - 1], [t1, x1] = tr[i]; if (f <= t1) return x0 + (x1 - x0) * ((f - t0) / Math.max(1, t1 - t0)) }
  return last[1]
}

// GET /api/video/palco?videoId=&shot=&frame= -> LAYOUT de uma cena pro editor visual: canvas, cenário,
// personagens, balões e origem do zoom. Sem `frame` = POSIÇÃO DE DESCANSO (spot/piso). Com `frame` =
// posição naquele instante (aplica moveX/moveY e a pose ativa). A UI mostra em cima do cenário e deixa
// arrastar (personagem->spot/piso ou sobrepor; balão->x/y) e clicar pra origem do zoom.
videoRouter.get('/video/palco', async (req, res) => {
  const id = sanId(req.query?.videoId)
  const si = Number(req.query?.shot) || 0
  const frame = req.query?.frame != null && req.query.frame !== '' ? Number(req.query.frame) : null
  if (!id) return res.status(400).json({ error: 'videoId inválido' })
  try {
    const video = JSON.parse(await fs.readFile(path.join(VIDEO_DIR, id + '.json'), 'utf-8'))
    const { scene } = montarCena(video)
    const W = scene.width, H = scene.height
    const shot = (scene.shots || [])[si]
    if (!shot) return res.status(404).json({ error: 'cena não existe' })
    const fileUrl = (f) => '/files/videos/' + id + '/kf/' + f
    const cenName = (shot.bg?.src || 'cenario-base.png').replace(/^cenario-/, '')
    const pers = video.roteiro?.[si]?.personagens || []
    const chars = (shot.chars || []).map((c, i) => {
      // sprite: no frame = última pose com in<=frame; em descanso = a pose final
      let src
      if (frame != null) {
        const ativa = [...(c.poses || [])].filter((p) => (p.in ?? 0) <= frame).pop() || (c.poses || [])[0]
        src = ativa?.src || ativa?.cycle?.[0]
      } else {
        const rep = [...(c.poses || [])].reverse().find((p) => p.src) || (c.poses || []).find((p) => p.cycle)
        src = rep?.src || rep?.cycle?.[0]
      }
      src = src || c.src
      const dx = frame != null ? _interp(c.moveX, frame) : 0
      const dy = frame != null ? _interp(c.moveY || [[0, 0]], frame) : 0
      const vis = frame == null || frame >= (c.appear || 0)
      // cx/cy = posição exibida (no frame); cxRest/cyRest = descanso (pra converter arraste em spot/piso)
      return { idx: i, slug: pers[i]?.slug ?? null, cx: Math.round(c.cx + dx), cy: Math.round(c.cy + dy), cxRest: c.cx, cyRest: c.cy, w: c.w, flip: !!c.flip, visible: vis, src: src ? fileUrl(src) : null }
    })
    const balloons = (shot.balloons || []).map((b, i) => ({ idx: i, text: b.text, x: b.x, y: b.y, size: b.size, visible: frame == null || (frame >= (b.in ?? 0) && frame <= (b.out ?? 1e9)) }))
    const z = (shot.zooms || [])[0]
    res.json({ w: W, h: H, dur: shot.dur, cenario: '/files/videos/' + id + '/cenario/' + cenName, zoom: z ? { origin: z.origin || '50% 50%' } : null, chars, balloons })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// trava serial por vídeo: render é pesado (Remotion + ffmpeg), não deixa dois do mesmo.
const emAndamento = new Set()

// POST /api/video/render {videoId} -> monta a cena a partir do dado, renderiza (Remotion),
// mixa o áudio e grava videos/<id>/final.mp4. Bloqueia até terminar (pode levar minutos).
videoRouter.post('/video/render', async (req, res) => {
  const { videoId } = req.body || {}
  if (!videoId) return res.status(400).json({ error: 'videoId obrigatório' })
  if (emAndamento.has(videoId)) return res.status(429).json({ error: 'Este vídeo já está renderizando.' })
  // GATE: valida antes de gastar render. Se houver ERRO (sprite faltando, sobreposição forte, etc),
  // barra e devolve a lista. `?forcar=1` pula o gate (pra casos que eu sei que são falso-positivo).
  if (req.query?.forcar !== '1') {
    const chk = await validarCena(videoId).catch(() => null)
    if (chk && !chk.ok) return res.status(422).json({ error: 'validação falhou', erros: chk.erros, avisos: chk.avisos })
  }
  emAndamento.add(videoId)
  try {
    const r = await renderVideo(videoId)
    res.json(r)
  } catch (e) {
    res.status(500).json({ error: e.message })
  } finally {
    emAndamento.delete(videoId)
  }
})
