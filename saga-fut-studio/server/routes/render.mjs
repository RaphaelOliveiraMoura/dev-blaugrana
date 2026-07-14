import { Router } from 'express'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { roughCut } from '../config.mjs'
import { backupFile, exists } from '../lib/arquivos.mjs'
import { probeDuration, run } from '../lib/ffmpeg.mjs'
import { epFiles } from '../lib/midia.mjs'
import { montarCena, aplicarHook, montarEndCard } from '../render/segmentos.mjs'
import { apenasFaixasExistentes, mixarTrilha, trilhaEfetivaPorCena } from '../render/trilha.mjs'

export const renderRouter = Router()

renderRouter.get('/render-status/:epId/:n', async (req, res) => {
  try {
    const cenas = await epFiles(req.params.epId, Number(req.params.n))
    const rough = roughCut(req.params.epId)
    res.json({
      cenas: cenas.map((c) => ({ numero: c.numero, video: !!c.video, audio: !!c.audio })),
      roughCut: (await exists(rough)) ? `episodios/${req.params.epId}/rough-cut.mp4` : null,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Monta o rascunho: cada cena vira um segmento (clipe + narração + legenda), eles
// são concatenados, e a trilha entra por cima do conjunto.
renderRouter.post('/render', async (req, res) => {
  const { epId, nCenas, endCardPng, hookCardPng, captions, musica, musicaVol, trilhaPorCena } = req.body || {}
  if (!epId || !nCenas) return res.status(400).json({ error: 'Faltam epId/nCenas.' })

  let tmp = null
  try {
    const cenas = await epFiles(epId, nCenas)
    const faltando = cenas.filter((c) => !c.video).map((c) => c.numero)
    if (faltando.length) return res.status(400).json({ error: `Faltam clipes de vídeo das cenas: ${faltando.join(', ')}` })

    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'saga-render-'))
    const comHook = !!(hookCardPng && hookCardPng.startsWith('data:image/png;base64,'))
    const ajustes = []
    const segs = []
    let comLegenda = false

    for (const c of cenas) {
      const capList = captions && captions[c.numero]
      if (capList && capList.length) comLegenda = true
      const { seg, ajuste } = await montarCena({ cena: c, tmp, capList, comHook, ehPrimeira: c === cenas[0] })
      if (ajuste) ajustes.push(ajuste)
      segs.push(seg)
    }

    // duração de cada segmento de cena (para posicionar a troca de trilha por cena)
    const segDur = []
    for (const s of segs) segDur.push(await probeDuration(s))

    if (comHook && segs.length) segs[0] = await aplicarHook(segs[0], hookCardPng, tmp)
    const endSeg = await montarEndCard(endCardPng, tmp)
    if (endSeg) segs.push(endSeg)

    const listFile = path.join(tmp, 'list.txt')
    await fs.writeFile(listFile, segs.map((s) => `file '${s}'`).join('\n'))
    const outAbs = roughCut(epId)
    await backupFile(outAbs, 3) // preserva o rascunho anterior (últimos 3)
    const concatOut = path.join(tmp, 'concat.mp4')
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut])

    const porCena = await apenasFaixasExistentes(trilhaEfetivaPorCena(trilhaPorCena, musica, segDur.length))
    let musTrocas = 0
    if (porCena.some(Boolean)) {
      const vol = Math.min(0.6, Math.max(0.01, Number(musicaVol) || 0.08))
      musTrocas = await mixarTrilha({ concatOut, outAbs, porCena, segDur, vol })
    } else {
      await run('ffmpeg', ['-y', '-i', concatOut, '-c', 'copy', outAbs])
    }

    const semNarr = cenas.filter((c) => !c.audio).map((c) => c.numero)
    const avisos = []
    if (musTrocas) avisos.push(musTrocas > 1 ? `Trilha por cena com crossfade (${musTrocas} trechos)` : 'Trilha musical mixada por baixo da narração')
    if (comLegenda) avisos.push('Legendas queimadas a partir da narração (sync aproximado)')
    if (ajustes.length) avisos.push(`Narração acelerada para caber no clipe → ${ajustes.join(', ')}`)
    if (semNarr.length) avisos.push(`Cenas sem narração (usaram o áudio do clipe): ${semNarr.join(', ')}`)
    res.json({
      ok: true,
      roughCut: `episodios/${epId}/rough-cut.mp4`,
      aviso: avisos.length ? avisos.join(' · ') : null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  } finally {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
})
