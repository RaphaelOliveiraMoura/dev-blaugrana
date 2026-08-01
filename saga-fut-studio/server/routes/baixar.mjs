import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { BAIXADOS_DIR, CONTEUDO_DIR } from '../config.mjs'
import { quadrinhoBaixadosDir, videoBaixadosDir } from '../../shared/caminhos.mjs'

export const baixarRouter = Router()

// id vindo do cliente (quadrinho ou vídeo): só kebab/alfanumérico, pra não escapar
// da pasta de conteúdo (nada de '/', '..' ou '.'). Inválido → null (cai no global).
const sanId = (v) => {
  const s = String(v || '').trim()
  return /^[a-zA-Z0-9_-]+$/.test(s) ? s : null
}

// Onde os downloads daquela peça caem. Tier list saiu da lista: virou quadrinho, então
// cai no destino de quadrinho como qualquer outra charge.
function destino({ quadrinhoId, videoId }) {
  const rel = quadrinhoId ? quadrinhoBaixadosDir(quadrinhoId)
    : videoId ? videoBaixadosDir(videoId)
    : null
  return rel ? { dir: path.join(CONTEUDO_DIR, rel), relPrefix: rel } : { dir: BAIXADOS_DIR, relPrefix: 'baixados' }
}

// Baixar o MP4 de um link (TikTok, YouTube Shorts) para reaproveitar como referência. O
// trabalho pesado é do yt-dlp: ele resolve a página, acha a URL do vídeo e grava
// o arquivo. Aqui a gente só valida o link, chama a ferramenta e devolve o que caiu.

// Lista fechada de fontes, pra não virar baixador geral de qualquer coisa colada sem
// querer. No YouTube só entra /shorts/: link de vídeo comum pode ser de horas e não é
// referência de formato curto, que é o que interessa aqui.
const FONTES = [
  { nome: 'TikTok', re: /^https?:\/\/([\w-]+\.)*tiktok\.com\//i },
  { nome: 'YouTube Shorts', re: /^https?:\/\/([\w-]+\.)*youtube\.com\/shorts\/[\w-]+/i },
]

function fonteDe(url) {
  try {
    const href = new URL(url).href
    return FONTES.find((f) => f.re.test(href)) || null
  } catch { return null }
}

// yt-dlp não vem com o Node: se faltar, a mensagem já diz como instalar.
function rodarYtDlp(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('yt-dlp', args)
    let out = '', err = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (err += d))
    p.on('error', (e) => reject(new Error(
      e.code === 'ENOENT'
        ? 'yt-dlp não está instalado. Instale com: brew install yt-dlp'
        : e.message,
    )))
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error((err || out).slice(-800)))))
  })
}

async function listarBaixados(dir, relPrefix) {
  const files = await fs.readdir(dir).catch(() => [])
  const mp4s = files.filter((f) => f.toLowerCase().endsWith('.mp4'))
  const comInfo = await Promise.all(mp4s.map(async (nome) => {
    const st = await fs.stat(path.join(dir, nome)).catch(() => null)
    return { nome, arquivo: `${relPrefix}/${nome}`, bytes: st?.size || 0, mtime: st?.mtimeMs || 0 }
  }))
  return comInfo.sort((a, b) => b.mtime - a.mtime)
}

baixarRouter.get('/baixados', async (req, res) => {
  try {
    const { dir, relPrefix } = destino({
      quadrinhoId: sanId(req.query?.quadrinhoId),
      videoId: sanId(req.query?.videoId),
    })
    res.json({ videos: await listarBaixados(dir, relPrefix) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

baixarRouter.post('/baixar-video', async (req, res) => {
  const url = String(req.body?.url || '').trim()
  // destino opcional; se o id veio mas é inválido, barra (não cai no global calado)
  const quadrinhoId = sanId(req.body?.quadrinhoId)
  const videoId = sanId(req.body?.videoId)
  if (req.body?.quadrinhoId && !quadrinhoId) return res.status(400).json({ error: 'quadrinhoId inválido.' })
  if (req.body?.videoId && !videoId) return res.status(400).json({ error: 'videoId inválido.' })
  if (!url) return res.status(400).json({ error: 'Cole o link do vídeo.' })
  if (!fonteDe(url)) {
    return res.status(400).json({
      error: 'Link não parece ser de um vídeo do TikTok nem de um YouTube Shorts.',
    })
  }

  const { dir, relPrefix } = destino({ quadrinhoId, videoId })
  try {
    await fs.mkdir(dir, { recursive: true })
    // %(id)s no nome mantém um arquivo por vídeo: recolar o mesmo link sobrescreve
    // em vez de duplicar. --no-playlist pra não puxar o perfil inteiro sem querer.
    const antes = new Set((await fs.readdir(dir).catch(() => [])))
    await rodarYtDlp([
      '--no-playlist',
      '--no-warnings',
      // nome de canal do YouTube tem espaço e acento; sem isso o arquivo vira uma URL
      // quebrada no preview do studio
      '--restrict-filenames',
      '-f', 'mp4/bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', path.join(dir, '%(uploader)s-%(id)s.%(ext)s'),
      url,
    ])

    // pega o arquivo que apareceu/mudou pra devolver o caminho certo pra UI
    const depois = await listarBaixados(dir, relPrefix)
    const novo = depois.find((v) => !antes.has(v.nome)) || depois[0]
    res.json({ ok: true, video: novo || null, videos: depois })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
