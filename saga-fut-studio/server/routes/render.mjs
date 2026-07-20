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
import { MUSICA_QUAD_DIR } from '../config.mjs'
import { segmentoParado, segmentoKenBurns } from '../render/estatico.mjs'
import { montarCena, aplicarHook, montarEndCard } from '../render/segmentos.mjs'
import { MOV_QUADRINHO_GROK, MOV_QUADRINHO_MICRO } from '../../shared/anim-mov.mjs'
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

// O quadrinho montado COM transição (dissolve/slide entre os painéis). Dois modos, e o
// corpo escolhe com `comGrok`:
//   - comGrok=false (padrão): cada painel é a arte parada em 9:16, opcionalmente com um
//     push-in de Ken Burns (`kenBurns`). Não passa pelo Grok: é instantâneo, on-model e
//     de graça. É o modo recomendado pro grosso do conteúdo.
//   - comGrok=true: cada painel com arte vira um clipe animado no Grok (movimento
//     contido, que segura o traço). Os personagens se mexem de verdade, mas é lento (um
//     clipe por painel, ~1min cada) e tem risco de sair do model/moderação.
//
// Dos clipes 9:16 pra frente o caminho é o MESMO nos dois modos: junta com a transição
// e aplica a trilha. No modo Grok, reaproveita clipes já animados (só (re)gera se falta
// ou `forcar`), então TROCAR a transição remonta rápido, sem tocar no Grok.
// Movimento do painel enviado ao Grok = base do modo + (opcional) a ação que o usuário
// descreveu pra ESTE painel, apontada como o foco. As duas bases (micro e animado) ficam
// no shared e o studio as mostra read-only. Micro tem uma base LEVE (cenário + movimento
// pequeno, sem áudio/fala, sem zoom); animado tem a base que segura o traço com mais vida.
function movQuadrinho(microAnim, instrucao) {
  const base = microAnim ? MOV_QUADRINHO_MICRO : MOV_QUADRINHO_GROK
  const extra = (instrucao || '').trim()
  if (!extra) return base
  return `${base} FOCUS the motion on this specific action described by the author (make this the main thing that moves, obeying the constraints above): ${extra}`
}

let animando = false

renderRouter.post('/animar-quadrinho', async (req, res) => {
  const { quadrinhoId, transicao = 'dissolve', musica, musicaVol, soMusica, forcar, comGrok = false, microAnim = false, kenBurns = false, segundos, movimentos = {} } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  // a trava só importa pro Grok (lento e serial); no estático é rápido, mas manter a
  // trava evita duas montagens gravando o mesmo arquivo ao mesmo tempo
  if (animando) return res.status(429).json({ error: 'Já há uma montagem em andamento — aguarde ela terminar.' })

  let tmp = null
  animando = true
  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    // só painéis cuja arte já existe em disco (sem arte não há o que montar)
    const paineis = []
    for (const p of (q.paineis || [])) {
      if (await exists(dentroDoConteudo(p.imagem))) paineis.push(p)
    }
    if (!paineis.length) return res.status(400).json({ error: 'Nenhum painel com arte: gere as artes antes.' })

    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'quad-anim916-'))

    // 1. um clipe 9:16 por painel. Dois modos, mesmo destino (clipes916):
    const clipes916 = []
    if (comGrok) {
      // Grok: anima cada painel (reaproveitando o que já existe) e reenquadra pra 9:16
      const animados = []
      for (const p of paineis) {
        const outAbs = painelAnimado(q.id, p.numero)
        const outRel = painelAnimadoRel(q.id, p.numero)
        if (forcar || !(await exists(outAbs))) {
          await fs.mkdir(path.dirname(outAbs), { recursive: true })
          await generateVideo({
            cwd: CONTEUDO_DIR, imagemRel: p.imagem, outRel, outAbs,
            movimento: movQuadrinho(microAnim, movimentos[p.numero]), duracao: 6, resolucao: '720p',
          })
        }
        animados.push({ numero: p.numero, abs: outAbs })
      }
      for (const a of animados) {
        const r = path.join(tmp, `p${a.numero}.mp4`)
        await reframe916(a.abs, r)
        clipes916.push(r)
      }
    } else {
      // estático: a arte parada já sai 9:16 (com ou sem push-in de Ken Burns)
      const dur = Math.min(SEG_MAX, Math.max(SEG_MIN, Number(segundos) || VIDEO_SEGUNDOS_PADRAO))
      for (const p of paineis) {
        const png = dentroDoConteudo(p.imagem)
        const saida = path.join(tmp, `p${p.numero}.mp4`)
        clipes916.push(kenBurns
          ? await segmentoKenBurns({ png, dur, saida })
          : await segmentoParado({ png, dur, saida }))
      }
    }

    // 2. junta os clipes com a transição escolhida (numa base)
    let base = path.join(tmp, 'base.mp4')
    await juntarComTransicao(clipes916, base, transicao)

    // microinteração é SEMPRE muda: o Grok às vezes gera fala/áudio mesmo com o prompt
    // pedindo silêncio. Aqui a gente GARANTE, removendo a faixa de áudio do clipe (a
    // trilha de fundo, se houver, entra por cima depois). No modo animado o som nativo fica.
    if (microAnim) {
      const mudo = path.join(tmp, 'base-mudo.mp4')
      await run('ffmpeg', ['-y', '-i', base, '-c:v', 'copy', '-an', mudo])
      base = mudo
    }

    // 3. trilha de fundo opcional. No Grok animado mixa por cima do som nativo do clipe;
    // no micro (mudo) e no estático o áudio nativo é silêncio, então a trilha vira o som.
    const outAbs = quadrinhoAnimado(q.id)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await backupFile(outAbs, 3)
    let comTrilha = false
    if (musica && await exists(path.join(MUSICA_QUAD_DIR, musica))) {
      const vol = Math.min(1, Math.max(0.05, Number(musicaVol) || 0.7))
      await aplicarMusica({ videoAbs: base, musica, vol, soMusica: !!soMusica, outAbs })
      comTrilha = true
    } else {
      await fs.copyFile(base, outAbs)
    }

    res.json({
      ok: true, video: quadrinhoAnimadoRel(q.id), paineis: paineis.map((p) => p.numero),
      transicao, musica: comTrilha ? musica : null, modo: comGrok ? 'grok' : (kenBurns ? 'kenburns' : 'estatico'),
    })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    animando = false
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
})
