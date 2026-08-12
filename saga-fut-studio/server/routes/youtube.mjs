import { Router } from 'express'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { exists } from '../lib/arquivos.mjs'
import { corpoInvalido } from '../lib/corpo.mjs'
import { readDados, writeDados } from '../store.mjs'
import { quadrinhoVideo } from '../../shared/caminhos.mjs'
import {
  lerCredenciais, montarMetadados, subirVideo, instanteDePublicacao, canalConectado,
  CAMINHO_CREDENCIAIS,
} from '../lib/youtube.mjs'

export const youtubeRouter = Router()

// Se o studio pode agendar no YouTube. O front pergunta antes de mostrar o botão: oferecer uma
// ação que vai falhar por falta de credencial é pior que não oferecer.
youtubeRouter.get('/youtube/status', async (_req, res) => {
  const c = await lerCredenciais()
  const base = {
    pronto: !!c?.refresh_token,
    arquivo: CAMINHO_CREDENCIAIS,
    comando: 'YT_CLIENT_ID=xxx YT_CLIENT_SECRET=yyy node scripts/youtube-login.mjs',
  }
  if (!base.pronto) return res.json(base)
  // O CANAL VAI JUNTO, e não é enfeite: uma conta Google tem o canal pessoal (vazio) além das
  // contas de marca, e passar rápido pelo seletor conecta no pessoal sem erro nenhum. Ver o nome
  // antes de agendar é o que impede a fila inteira de ir pro canal errado.
  try {
    res.json({ ...base, canal: await canalConectado() })
  } catch (e) {
    res.json({ ...base, canalErro: e.message })
  }
})

const CAMPOS = ['quadrinhoId', 'dia', 'hora']

// SOBE O VÍDEO DO QUADRINHO JÁ AGENDADO.
//
// Serial de propósito (`ocupado`): o upload é o único ponto do studio que gasta COTA (1.600 de
// 10.000 por dia, ou seja 6 uploads). Dois cliques acidentais no mesmo vídeo custariam 3.200 e
// deixariam dois agendamentos do mesmo post no canal, que depois alguém teria que achar e apagar
// na mão.
let ocupado = false

youtubeRouter.post('/youtube/agendar', async (req, res) => {
  if (corpoInvalido(req, res, CAMPOS, 'youtube/agendar')) return
  const { quadrinhoId, dia, hora } = req.body || {}
  if (!quadrinhoId) return res.status(400).json({ error: 'Falta quadrinhoId.' })
  if (ocupado) return res.status(429).json({ error: 'Já há um upload em andamento — espere ele terminar.' })

  try {
    const d = await readDados()
    const q = (d.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (!q) return res.status(404).json({ error: 'Quadrinho não encontrado.' })

    // JÁ AGENDADO = ERRO, não sobrescreve. Subir de novo criaria um SEGUNDO vídeo no canal (a API
    // não substitui), e os dois sairiam. O opt-out é apagar o campo `youtube` do quadrinho.
    if (q.youtube?.videoId) {
      return res.status(409).json({
        error: `Este quadrinho já foi agendado no YouTube em ${q.youtube.agendadoPara} `
          + `(${q.youtube.url}). Subir de novo criaria um segundo vídeo no canal. `
          + 'Se quiser mesmo refazer, apague o vídeo lá e limpe o campo `youtube` do quadrinho.',
      })
    }

    const rel = quadrinhoVideo(q.id)
    const abs = path.join(CONTEUDO_DIR, rel)
    if (!(await exists(abs))) {
      return res.status(400).json({
        error: 'Não existe vídeo deste quadrinho ainda. Monte na aba Vídeo (Montar o quadrinho inteiro) e volte.',
      })
    }

    const quando = instanteDePublicacao(dia || q.agenda, hora)
    const metadados = montarMetadados({ quad: q, quando })

    ocupado = true
    const r = await subirVideo({ arquivo: abs, metadados })

    // o resultado volta pro DADO: é ele que a tela lê depois pra dizer "já está agendado", e é o
    // que evita o upload duplicado acima
    const dd = await readDados()
    const alvo = (dd.quadrinhos || []).find((x) => x.id === quadrinhoId)
    if (alvo) {
      alvo.youtube = { videoId: r.id, url: r.url, agendadoPara: quando, titulo: metadados.snippet.title }
      await writeDados(dd)
    }

    res.json({ ok: true, ...r, agendadoPara: quando, titulo: metadados.snippet.title })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    ocupado = false
  }
})
