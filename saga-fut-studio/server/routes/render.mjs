import { Router } from 'express'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { CONTEUDO_DIR, painelAnimado, painelVideo, quadrinhoAnimado, quadrinhoMosaico, quadrinhoSlide, quadrinhoVideo, roughCut } from '../config.mjs'
import { backupFile, dentroDoConteudo, exists } from '../lib/arquivos.mjs'
import { probeDuration, run } from '../lib/ffmpeg.mjs'
import { DIM_POST, montarMosaico, normalizarPara } from '../lib/imagem.mjs'
import { epFiles } from '../lib/midia.mjs'
import { generateVideo } from '../providers/grok-video.mjs'
import { reframe916, juntarComTransicao, aplicarMusica } from '../render/animado.mjs'
import { MUSICA_DIR } from '../config.mjs'
import { segmentoParado } from '../render/estatico.mjs'
import { montarCena, aplicarHook, montarEndCard } from '../render/segmentos.mjs'
import { apenasFaixasExistentes, mixarTrilha, trilhaEfetivaPorCena } from '../render/trilha.mjs'
import { readDados } from '../store.mjs'
import {
  painelAnimado as painelAnimadoRel, painelVideo as painelVideoRel, quadrinhoAnimado as quadrinhoAnimadoRel,
  quadrinhoMosaico as quadrinhoMosaicoRel,
  quadrinhoSlide as quadrinhoSlideRel, quadrinhoVideo as quadrinhoVideoRel, roughCut as roughCutRel,
} from '../../shared/caminhos.mjs'
import { VIDEO_SEGUNDOS_PADRAO } from '../../shared/constantes.mjs'

export const renderRouter = Router()

renderRouter.get('/render-status/:epId/:n', async (req, res) => {
  try {
    const cenas = await epFiles(req.params.epId, Number(req.params.n))
    const rough = roughCut(req.params.epId)
    res.json({
      cenas: cenas.map((c) => ({ numero: c.numero, video: !!c.video, audio: !!c.audio })),
      roughCut: (await exists(rough)) ? roughCutRel(req.params.epId) : null,
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
      roughCut: roughCutRel(epId),
      aviso: avisos.length ? avisos.join(' · ') : null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  } finally {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
})

// O quadrinho virando post em IMAGEM parada (o vídeo é o irmão acima). Dois produtos
// do mesmo material, e o corpo escolhe quais:
//   - mosaico: todas as cenas num quadro só, no formato pedido. Um arquivo.
//   - carrossel: um slide por painel, na ordem, cada um no formato. Vários arquivos.
// O painel sem arte fica de fora em vez de derrubar a montagem, igual ao vídeo.
renderRouter.post('/montar-imagem', async (req, res) => {
  const { quadrinhoId, formato, mosaico = true, carrossel = false } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  const fmt = DIM_POST[formato] ? formato : '4:5'
  const dim = DIM_POST[fmt]

  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    // artes prontas, na ordem dos painéis (a mesma ordem em que a piada se lê)
    const paineis = []
    for (const p of (q.paineis || [])) {
      const png = dentroDoConteudo(p.imagem)
      if (await exists(png)) paineis.push({ numero: p.numero, png })
    }
    if (!paineis.length) return res.status(400).json({ error: 'Nenhuma arte gerada ainda: gere os painéis antes.' })
    const semArte = (q.paineis || []).length - paineis.length

    const resposta = { ok: true, formato: fmt }
    const avisos = []

    if (mosaico) {
      const outAbs = quadrinhoMosaico(q.id, fmt)
      await backupFile(outAbs, 3)
      await montarMosaico({ pngs: paineis.map((p) => p.png), dim, saida: outAbs })
      resposta.mosaico = quadrinhoMosaicoRel(q.id, fmt)
    }

    if (carrossel) {
      const slides = []
      for (const p of paineis) {
        const outAbs = quadrinhoSlide(q.id, p.numero)
        await backupFile(outAbs, 3)
        await normalizarPara({ src: p.png, dim, saida: outAbs })
        slides.push(quadrinhoSlideRel(q.id, p.numero))
      }
      resposta.carrossel = slides
    }

    if (semArte) avisos.push(`${semArte} painel(éis) sem arte ficaram de fora`)
    if (paineis.length === 1 && mosaico) avisos.push('Só um painel com arte: o mosaico é ele sozinho no formato')
    resposta.aviso = avisos.length ? avisos.join(' · ') : null
    res.json(resposta)
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  }
})

const SEG_MIN = 2
const SEG_MAX = 60

// O vídeo do quadrinho: cada arte parada segura `segundos` em 9:16, elas entram na
// ordem, e a trilha vem por cima do conjunto (mesma mixagem do rough-cut).
//
// Com `painelNumero`, sai o vídeo daquele painel só, para postar um quadro isolado.
// Sem ele, sai o do quadrinho inteiro: na tirinha, o corte é onde a piada vira.
//
// Os ajustes vêm no corpo, e não do disco como no gerar imagem: aqui o servidor só
// precisa dos PNGs, então mexer no tempo e montar não obriga a salvar antes.
renderRouter.post('/render-quadrinho', async (req, res) => {
  const { quadrinhoId, painelNumero, segundos, musica, musicaVol } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })

  let tmp = null
  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    const soUm = painelNumero != null
    const escolhidos = soUm
      ? (q.paineis || []).filter((p) => p.numero === Number(painelNumero))
      : (q.paineis || [])
    if (!escolhidos.length) return res.status(400).json({ error: 'Painel não encontrado no quadrinho.' })

    // o painel sem arte fica de fora em vez de derrubar a montagem: numa tirinha de
    // 4, o vídeo dos 3 prontos já serve para ver como está ficando
    const paineis = []
    for (const p of escolhidos) {
      const png = dentroDoConteudo(p.imagem)
      if (await exists(png)) paineis.push({ numero: p.numero, png })
    }
    if (!paineis.length) return res.status(400).json({ error: 'Nenhuma arte gerada ainda: gere o painel antes.' })
    const semArte = escolhidos.length - paineis.length

    const dur = Math.min(SEG_MAX, Math.max(SEG_MIN, Number(segundos) || VIDEO_SEGUNDOS_PADRAO))
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'saga-quad-'))
    const segs = []
    for (const p of paineis) {
      segs.push(await segmentoParado({ png: p.png, dur, saida: path.join(tmp, `p${p.numero}.mp4`) }))
    }

    const outRel = soUm ? painelVideoRel(q.id, Number(painelNumero)) : quadrinhoVideoRel(q.id)
    const outAbs = soUm ? painelVideo(q.id, Number(painelNumero)) : quadrinhoVideo(q.id)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await backupFile(outAbs, 3)

    const listFile = path.join(tmp, 'list.txt')
    await fs.writeFile(listFile, segs.map((s) => `file '${s}'`).join('\n'))
    const concatOut = path.join(tmp, 'concat.mp4')
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut])

    // mesma faixa em todos os blocos: a trilha atravessa o quadrinho sem crossfade
    const porBloco = await apenasFaixasExistentes(paineis.map(() => (musica ? String(musica) : '')))
    const avisos = []
    if (porBloco.some(Boolean)) {
      // aqui a música é o áudio, não o fundo da narração: o teto é o volume cheio
      const vol = Math.min(1, Math.max(0.05, Number(musicaVol) || 0.9))
      await mixarTrilha({ concatOut, outAbs, porCena: porBloco, segDur: paineis.map(() => dur), vol })
    } else {
      await run('ffmpeg', ['-y', '-i', concatOut, '-c', 'copy', outAbs])
      avisos.push('Sem trilha: o vídeo sai mudo e o som você escolhe no próprio TikTok')
    }
    if (semArte) avisos.push(`${semArte} painel(éis) sem arte ficaram de fora`)

    res.json({
      ok: true,
      video: outRel,
      segundos: dur * paineis.length,
      aviso: avisos.length ? avisos.join(' · ') : null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  } finally {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
})

// O quadrinho ANIMADO (Grok): cada painel com arte vira um clipe animado (movimento
// contido, receita limpa que segura o traço), e eles se juntam em 9:16 com a transição
// escolhida (dissolve/slide). Diferente do /render-quadrinho, aqui os personagens se
// mexem — por isso passa pelo Grok e é lento (um clipe por painel, ~1min cada).
//
// Reaproveita clipes já animados: só (re)gera o painel se o clipe falta ou `forcar`.
// Assim, TROCAR a transição é rápido (só remonta com ffmpeg, sem tocar no Grok).
const MOV_QUADRINHO = 'Subtle living-comic motion: gentle idle life, slight breathing and micro-movements, small ambient motion in the background, but keep the characters on-model and mostly still. Keep it a FLAT 2D hand-drawn cartoon with clean bold black outlines and flat solid colors, EXACTLY like the source image; do NOT add 3D, gradients or shading, do NOT morph faces or hands. Single continuous shot, locked camera, keep the framing identical.'

let animando = false

renderRouter.post('/animar-quadrinho', async (req, res) => {
  const { quadrinhoId, transicao = 'dissolve', musica, musicaVol, soMusica, forcar } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  if (animando) return res.status(429).json({ error: 'Já há uma animação em andamento — aguarde ela terminar.' })

  let tmp = null
  animando = true
  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    // só painéis cuja arte já existe em disco (sem arte não há o que animar)
    const paineis = []
    for (const p of (q.paineis || [])) {
      if (await exists(dentroDoConteudo(p.imagem))) paineis.push(p)
    }
    if (!paineis.length) return res.status(400).json({ error: 'Nenhum painel com arte: gere as artes antes de animar.' })

    // 1. anima cada painel (Grok), reaproveitando o que já existe
    const animados = []
    for (const p of paineis) {
      const outAbs = painelAnimado(q.id, p.numero)
      const outRel = painelAnimadoRel(q.id, p.numero)
      if (forcar || !(await exists(outAbs))) {
        await fs.mkdir(path.dirname(outAbs), { recursive: true })
        await generateVideo({
          cwd: CONTEUDO_DIR, imagemRel: p.imagem, outRel, outAbs,
          movimento: MOV_QUADRINHO, duracao: 6, resolucao: '720p',
        })
      }
      animados.push({ numero: p.numero, abs: outAbs })
    }

    // 2. reenquadra cada clipe pra 9:16 (em tmp) e 3. junta com a transição (numa base)
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'quad-anim916-'))
    const clipes916 = []
    for (const a of animados) {
      const r = path.join(tmp, `p${a.numero}.mp4`)
      await reframe916(a.abs, r)
      clipes916.push(r)
    }
    const base = path.join(tmp, 'base.mp4')
    await juntarComTransicao(clipes916, base, transicao)

    // 4. trilha de fundo opcional (mixada por cima do som nativo do Grok)
    const outAbs = quadrinhoAnimado(q.id)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await backupFile(outAbs, 3)
    let comTrilha = false
    if (musica && await exists(path.join(MUSICA_DIR, musica))) {
      const vol = Math.min(1, Math.max(0.05, Number(musicaVol) || 0.7))
      await aplicarMusica({ videoAbs: base, musica, vol, soMusica: !!soMusica, outAbs })
      comTrilha = true
    } else {
      await fs.copyFile(base, outAbs)
    }

    res.json({ ok: true, video: quadrinhoAnimadoRel(q.id), paineis: animados.map((a) => a.numero), transicao, musica: comTrilha ? musica : null })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    animando = false
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
})
