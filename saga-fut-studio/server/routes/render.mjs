import { Router } from 'express'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { CONTEUDO_DIR, painelAnimado, painelVideo, quadrinhoAnimado, quadrinhoMosaico, quadrinhoSlide, quadrinhoVideo, roughCut } from '../config.mjs'
import { backupFile, dentroDoConteudo, exists } from '../lib/arquivos.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'
import { probeDuration, run } from '../lib/ffmpeg.mjs'
import { DIM_POST, montarMosaico } from '../lib/imagem.mjs'
import { carimbarCopias, carimbarProgresso, CANTOS, CANTO_PADRAO } from '../lib/carimbo.mjs'
import { acabarClipe, acabarPainel, artesParaMontar, dimDoQuadrinho } from '../lib/acabamento.mjs'
import { temCarimbo } from '../../shared/quadrinho-config.mjs'
import { epFiles } from '../lib/midia.mjs'
import { generateVideo } from '../providers/grok-video.mjs'
import { reframe916, juntarComTransicao, aplicarMusica } from '../render/animado.mjs'
import { MUSICA_QUAD_DIR } from '../config.mjs'
import { segmentoParado, segmentoKenBurns } from '../render/estatico.mjs'
import { montarCena, aplicarHook, montarEndCard } from '../render/segmentos.mjs'
import { MOV_QUADRINHO_GROK, MOV_QUADRINHO_MICRO } from '../../shared/anim-mov.mjs'
import { apenasFaixasExistentes, mixarTrilha, trilhaEfetivaPorCena } from '../render/trilha.mjs'
import { BIB_SAGA, BIB_QUADRINHO } from './musicas.mjs'
import { readDados } from '../store.mjs'
import {
  painelAnimado as painelAnimadoRel, painelVideo as painelVideoRel, quadrinhoAnimado as quadrinhoAnimadoRel,
  quadrinhoMosaico as quadrinhoMosaicoRel,
  quadrinhoSlide as quadrinhoSlideRel, quadrinhoVideo as quadrinhoVideoRel, roughCut as roughCutRel,
} from '../../shared/caminhos.mjs'
import { VIDEO_SEGUNDOS_PADRAO } from '../../shared/constantes.mjs'
import { ehRitmoDinamico, medirPaineis, ritmoDoQuadrinho, RITMOS, somaTempos } from '../../shared/ritmo-video.mjs'

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

// A PRÉVIA DE UM PAINEL: o slide acabado, com moldura, selo, balões e legendas.
//
// Grava no MESMO arquivo que o carrossel (`posts/slide-<n>.png`) de propósito. Antes a aba de
// falas tinha um PNG só dela, e a diferença entre "o que aparece na tela" e "o que vai pro
// post" era invisível: o balão ficava pronto na aba e sumia no carrossel. Um arquivo por
// painel significa que a prévia É o post, e não há como os dois discordarem.
//
// Instantâneo (vetorial, sem IA): serve pra ver o efeito de trocar uma fala na hora.
renderRouter.post('/previa-painel', async (req, res) => {
  const { quadrinhoId, painelNumero, formato } = req.body || {}
  if (!quadrinhoId || !painelNumero) return res.status(400).json({ error: 'Falta quadrinhoId ou painelNumero.' })
  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })
    const painel = (q.paineis || []).find((p) => p.numero === Number(painelNumero))
    if (!painel) return res.status(404).json({ error: 'Painel não encontrado.' })

    const baseAbs = dentroDoConteudo(painel.imagem)
    if (!(await exists(baseAbs))) return res.status(400).json({ error: 'Gere a arte do painel antes.' })

    const outAbs = quadrinhoSlide(q.id, painel.numero)
    await backupFile(outAbs, 3)
    const r = await acabarPainel({
      quad: q, painel, baseAbs, dim: dimDoQuadrinho(q, DIM_POST[formato] ? formato : null), outAbs,
    })
    res.json({ ok: true, path: quadrinhoSlideRel(q.id, painel.numero), balao: r.balao, legendas: r.legendas })
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

    const porCena = await apenasFaixasExistentes(trilhaEfetivaPorCena(trilhaPorCena, musica, segDur.length), BIB_SAGA)
    let musTrocas = 0
    if (porCena.some(Boolean)) {
      const vol = Math.min(0.6, Math.max(0.01, Number(musicaVol) || 0.08))
      musTrocas = await mixarTrilha({ concatOut, outAbs, porCena, segDur, vol, bib: BIB_SAGA })
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
//   - mosaico: todas as cenas num quadro só, no formato pedido. Um arquivo. É a grade de
//     REVISÃO, e é o default porque revisar vem antes de exportar.
//   - carrossel: um slide por painel, na ordem, cada um no formato. Vários arquivos. É o que
//     de fato VAI PRO POST, e é `false` por padrão porque montar 8 slides a cada revisão é caro.
// Os dois são independentes e acumulam: `{mosaico:true, carrossel:true}` faz os dois.
//
// NÃO EXISTE campo `modo` aqui. Existiu na cabeça de quem chamou, e o corpo desconhecido era
// ignorado em silêncio: ver lib/corpo.mjs, que hoje barra isso com 400.
//
// O painel sem arte fica de fora em vez de derrubar a montagem, igual ao vídeo.
const CAMPOS_MONTAR_IMAGEM = ['quadrinhoId', 'formato', 'mosaico', 'carrossel', 'carimbo', 'cantoCarimbo']

renderRouter.post('/montar-imagem', async (req, res) => {
  if (corpoInvalido(req, res, CAMPOS_MONTAR_IMAGEM, 'montar-imagem')) return
  const { quadrinhoId, formato, mosaico = true, carrossel = false, carimbo, cantoCarimbo: cantoPedido } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  const cantoCarimbo = CANTOS[cantoPedido] ? cantoPedido : CANTO_PADRAO

  let tmp = null
  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    // Sem formato pedido, o post herda o formato do PRÓPRIO quadrinho: é a única escolha
    // em que o slide sai igual ao painel, sem faixa lateral nem corte.
    const fmt = DIM_POST[formato] ? formato : (DIM_POST[q.formato] ? q.formato : '4:5')
    const dim = DIM_POST[fmt]

    // artes prontas, na ordem dos painéis (a mesma ordem em que a piada se lê)
    const paineis = []
    for (const p of (q.paineis || [])) {
      const png = dentroDoConteudo(p.imagem)
      if (await exists(png)) paineis.push({ numero: p.numero, png, legendas: p.legendas })
    }
    if (!paineis.length) return res.status(400).json({ error: 'Nenhuma arte gerada ainda: gere os painéis antes.' })
    const semArte = (q.paineis || []).length - paineis.length

    const resposta = { ok: true, formato: fmt }
    const avisos = []

    if (mosaico) {
      const outAbs = quadrinhoMosaico(q.id, fmt)
      await backupFile(outAbs, 3)
      // a MESMA arte acabada que o carrossel usa: o mosaico montava direto do PNG do painel e
      // saía sem moldura e sem legenda em todo quadrinho com acabamento por código
      tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'saga-mosaico-'))
      const acabadas = await artesParaMontar({ quad: q, paineis, dim, dir: tmp })
      await montarMosaico({ pngs: acabadas.map((p) => p.png), dim, saida: outAbs })
      resposta.mosaico = quadrinhoMosaicoRel(q.id, fmt)
    }

    if (carrossel) {
      // O carimbo "3/8" entra AQUI, no export, e não na arte: a arte do painel segue limpa
      // (o mesmo painel vira story, vídeo e print sem número grudado) e quem exporta
      // carrossel não tem como esquecer a numeração. Sem número só com opt-out declarado.
      // O número pousa POR CIMA da arte, no canto (ver o porquê em lib/carimbo.mjs).
      const carimbar = carimbo !== false && temCarimbo(q) && paineis.length > 1

      const slides = [], slidesAbs = []
      // O acabamento da casa (moldura, selo e as caixas de legenda) mora em lib/acabamento.mjs
      // e é o MESMO que o mosaico e os vídeos aplicam: a arte do painel nasceu sangrada e muda,
      // e o texto é vetorial, então ortografia deixa de ser sorteio e reescrever uma legenda
      // não custa geração.
      let comLegenda = 0
      for (const p of paineis) {
        const outAbs = quadrinhoSlide(q.id, p.numero)
        await backupFile(outAbs, 3)
        const r = await acabarPainel({ quad: q, painel: p, baseAbs: p.png, dim, outAbs })
        if (r.legendas) comLegenda++
        slidesAbs.push(outAbs)
        slides.push(quadrinhoSlideRel(q.id, p.numero))
      }
      resposta.carrossel = slides
      resposta.legendasPorCodigo = comLegenda || null

      resposta.carimbo = null
      if (carimbar) {
        for (const [i, abs] of slidesAbs.entries()) {
          await carimbarProgresso({ abs, indice: i + 1, total: slidesAbs.length, canto: cantoCarimbo })
        }
        resposta.carimbo = { total: slidesAbs.length, canto: cantoCarimbo }
      }
    }

    if (semArte) avisos.push(`${semArte} painel(éis) sem arte ficaram de fora`)
    if (paineis.length === 1 && mosaico) avisos.push('Só um painel com arte: o mosaico é ele sozinho no formato')
    resposta.aviso = avisos.length ? avisos.join(' · ') : null
    res.json(resposta)
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  } finally {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
})

const SEG_MIN = 2
const SEG_MAX = 60

// O vídeo do quadrinho: cada arte parada segura `segundos` em 9:16, elas entram na
// ordem, e a trilha vem por cima do conjunto (mesma mixagem do rough-cut).
//
// Com `painelNumero`, sai o vídeo daquele painel só, para postar um quadro isolado.
// Sem ele, sai o do quadrinho inteiro: na tirinha, o corte é onde a piada vira, e cada
// painel leva o carimbo de progresso ("2/5") do carrossel, pelo mesmo motivo dele.
//
// `ritmo` troca o tempo fixo pelo tempo derivado do TEXTO de cada painel (shared/ritmo-video.mjs);
// `semAudio` monta sem trilha SEM mexer na faixa escolhida, que continua salva no quadrinho.
//
// A conta do tempo dinâmico mora no shared e é refeita AQUI, a partir dos painéis do disco, em vez
// de aceitar durações prontas do corpo: o cliente já mostra o mesmo número porque roda a mesma
// função, e um array de segundos vindo de fora seria a porta pra tela e vídeo discordarem calados.
//
// Os ajustes vêm no corpo, e não do disco como no gerar imagem: aqui o servidor só
// precisa dos PNGs, então mexer no tempo e montar não obriga a salvar antes.
const CAMPOS_RENDER_QUADRINHO = ['quadrinhoId', 'painelNumero', 'segundos', 'musica', 'musicaVol',
  'carimbo', 'cantoCarimbo', 'semAudio', 'ritmo']

renderRouter.post('/render-quadrinho', async (req, res) => {
  if (corpoInvalido(req, res, CAMPOS_RENDER_QUADRINHO, 'render-quadrinho')) return
  const { quadrinhoId, painelNumero, segundos, musica, musicaVol, carimbo, cantoCarimbo: cantoPedido, semAudio, ritmo } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  const cantoCarimbo = CANTOS[cantoPedido] ? cantoPedido : CANTO_PADRAO

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
      if (await exists(png)) paineis.push({ numero: p.numero, png, legendas: p.legendas, falas: p.falas })
    }
    if (!paineis.length) return res.status(400).json({ error: 'Nenhuma arte gerada ainda: gere o painel antes.' })
    const semArte = escolhidos.length - paineis.length

    const dur = Math.min(SEG_MAX, Math.max(SEG_MIN, Number(segundos) || VIDEO_SEGUNDOS_PADRAO))
    // Pedido SEM `ritmo` usa o do quadrinho salvo, que sem campo é o Padrão de 17 CPS. Antes a
    // ausência virava tempo fixo aqui dentro, então um `POST /render-quadrinho {"quadrinhoId"}`
    // (o comando que o limpar-posts imprime, e qualquer script) montava num ritmo que ninguém
    // escolheu, diferente do que a aba Vídeo mostra pro mesmo quadrinho.
    const ritmoUsado = ritmo == null ? ritmoDoQuadrinho(q) : ritmo
    const dinamico = ehRitmoDinamico(ritmoUsado)
    const medidas = dinamico ? medirPaineis(paineis, ritmoUsado) : null
    const durs = medidas ? medidas.map((m) => m.dur) : paineis.map(() => dur)
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'saga-quad-'))

    // O vídeo é o MESMO post noutro formato, então leva o mesmo acabamento do carrossel: sem
    // isto ele monta a arte crua, que num quadrinho de moldura por código é arte sangrada e
    // MUDA (foi assim que o o-dia-pedri-legenda-codigo virou vídeo sem legenda nenhuma).
    const acabadas = await artesParaMontar({ quad: q, paineis, dim: dimDoQuadrinho(q), dir: tmp })

    // O MESMO "2/5" que o carrossel leva (lib/carimbo.mjs): sem o número o painel do meio lê
    // como o fim. Vai numa CÓPIA em tmp, então a arte no disco segue limpa. `carimbo: false`
    // desliga; painel só nunca carimba.
    const { usar, carimbo: marca } = carimbo === false
      ? { usar: acabadas.map((p) => p.png), carimbo: null }
      : await carimbarCopias({ pngs: acabadas.map((p) => p.png), dir: tmp, canto: cantoCarimbo })

    const segs = []
    for (const [i, p] of paineis.entries()) {
      segs.push(await segmentoParado({ png: usar[i], dur: durs[i], saida: path.join(tmp, `p${p.numero}.mp4`) }))
    }

    const outRel = soUm ? painelVideoRel(q.id, Number(painelNumero)) : quadrinhoVideoRel(q.id)
    const outAbs = soUm ? painelVideo(q.id, Number(painelNumero)) : quadrinhoVideo(q.id)
    await fs.mkdir(path.dirname(outAbs), { recursive: true })
    await backupFile(outAbs, 3)

    const listFile = path.join(tmp, 'list.txt')
    await fs.writeFile(listFile, segs.map((s) => `file '${s}'`).join('\n'))
    const concatOut = path.join(tmp, 'concat.mp4')
    await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut])

    // mesma faixa em todos os blocos: a trilha atravessa o quadrinho sem crossfade.
    // BIB_QUADRINHO, a mesma da aba Animar: as duas abas montam o MESMO post, e enquanto esta
    // aqui lia a biblioteca das sagas o único quadrinho com trilha escolhida saiu com trilha de
    // drama sombrio, porque era a única lista oferecida.
    // `semAudio` corta a trilha DESTA montagem sem apagar a escolha: a faixa segue no quadrinho,
    // e voltar ao vídeo com som é desmarcar a caixa, não escolher a música de novo.
    const porBloco = semAudio
      ? paineis.map(() => '')
      : await apenasFaixasExistentes(paineis.map(() => (musica ? String(musica) : '')), BIB_QUADRINHO)
    const avisos = []
    if (porBloco.some(Boolean)) {
      // aqui a música é o áudio, não o fundo da narração: o teto é o volume cheio
      const vol = Math.min(1, Math.max(0.05, Number(musicaVol) || 0.9))
      await mixarTrilha({ concatOut, outAbs, porCena: porBloco, segDur: durs, vol, bib: BIB_QUADRINHO })
    } else {
      await run('ffmpeg', ['-y', '-i', concatOut, '-c', 'copy', outAbs])
      avisos.push(semAudio && musica
        ? 'Silenciado nesta montagem: a trilha escolhida continua salva'
        : 'Sem trilha: o vídeo sai mudo e o som você escolhe no próprio TikTok')
    }
    if (semArte) avisos.push(`${semArte} painel(éis) sem arte ficaram de fora`)

    // O painel que pede mais leitura do que o teto do ritmo dá é o único caso que a conta não
    // resolve sozinha: esticar o painel arrebenta o vídeo e cortar texto é decisão editorial.
    const estourados = (medidas || []).filter((m) => m.estourou)
    if (estourados.length) {
      const r = RITMOS[ritmoUsado]
      avisos.push(`Texto acima do que cabe no ritmo ${r.nome} nos painéis ${estourados.map((m) => m.numero).join(', ')} (pedia até ${Math.max(...estourados.map((m) => m.pedia)).toFixed(1)}s, o teto é ${r.max}s): alguém vai ler pela metade`)
    }

    res.json({
      ok: true,
      video: outRel,
      segundos: somaTempos(durs),
      tempos: durs,
      ritmo: dinamico ? ritmoUsado : 'fixo',
      carimbo: marca,
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
      const png = dentroDoConteudo(p.imagem)
      if (await exists(png)) paineis.push({ ...p, png })
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
        animados.push({ numero: p.numero, abs: outAbs, painel: p })
      }
      for (const a of animados) {
        // O que vai pro Grok é a arte CRUA de propósito: ele borra moldura e apaga texto
        // desenhado (o mesmo defeito conhecido do balão). Então a moldura e as caixas de
        // legenda entram AQUI, por cima do clipe já animado.
        const acabado = await acabarClipe({
          quad: q, painel: a.painel, inAbs: a.abs, dir: tmp,
          outAbs: path.join(tmp, `acabado-${a.numero}.mp4`),
        })
        const r = path.join(tmp, `p${a.numero}.mp4`)
        await reframe916(acabado, r)
        clipes916.push(r)
      }
    } else {
      // estático: a arte parada já sai 9:16 (com ou sem push-in de Ken Burns)
      const dur = Math.min(SEG_MAX, Math.max(SEG_MIN, Number(segundos) || VIDEO_SEGUNDOS_PADRAO))
      const acabadas = await artesParaMontar({ quad: q, paineis, dim: dimDoQuadrinho(q), dir: tmp })
      for (const p of acabadas) {
        const saida = path.join(tmp, `p${p.numero}.mp4`)
        clipes916.push(kenBurns
          ? await segmentoKenBurns({ png: p.png, dur, saida })
          : await segmentoParado({ png: p.png, dur, saida }))
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
