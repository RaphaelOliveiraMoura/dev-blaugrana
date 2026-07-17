import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { BAIXADOS_DIR } from '../config.mjs'

export const baixarRouter = Router()

// Baixar o MP4 de um link (TikTok e afins) para reaproveitar como referência. O
// trabalho pesado é do yt-dlp: ele resolve a página, acha a URL do vídeo e grava
// o arquivo. Aqui a gente só valida o link, chama a ferramenta e devolve o que caiu.

// Aceita só o que parece um link de vídeo do TikTok, pra não virar baixador geral
// de qualquer coisa colada sem querer.
const TIKTOK_RE = /^https?:\/\/([\w-]+\.)*tiktok\.com\//i

function ehTikTok(url) {
  try { return TIKTOK_RE.test(new URL(url).href) } catch { return false }
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

async function listarBaixados() {
  const files = await fs.readdir(BAIXADOS_DIR).catch(() => [])
  const mp4s = files.filter((f) => f.toLowerCase().endsWith('.mp4'))
  const comInfo = await Promise.all(mp4s.map(async (nome) => {
    const st = await fs.stat(path.join(BAIXADOS_DIR, nome)).catch(() => null)
    return { nome, arquivo: `baixados/${nome}`, bytes: st?.size || 0, mtime: st?.mtimeMs || 0 }
  }))
  return comInfo.sort((a, b) => b.mtime - a.mtime)
}

baixarRouter.get('/baixados', async (_req, res) => {
  try {
    res.json({ videos: await listarBaixados() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

baixarRouter.post('/baixar-tiktok', async (req, res) => {
  const url = String(req.body?.url || '').trim()
  if (!url) return res.status(400).json({ error: 'Cole o link do vídeo.' })
  if (!ehTikTok(url)) return res.status(400).json({ error: 'Link não parece ser de um vídeo do TikTok.' })

  try {
    await fs.mkdir(BAIXADOS_DIR, { recursive: true })
    // %(id)s no nome mantém um arquivo por vídeo: recolar o mesmo link sobrescreve
    // em vez de duplicar. --no-playlist pra não puxar o perfil inteiro sem querer.
    const antes = new Set((await fs.readdir(BAIXADOS_DIR).catch(() => [])))
    await rodarYtDlp([
      '--no-playlist',
      '--no-warnings',
      '-f', 'mp4/bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '-o', path.join(BAIXADOS_DIR, '%(uploader)s-%(id)s.%(ext)s'),
      url,
    ])

    // pega o arquivo que apareceu/mudou pra devolver o caminho certo pra UI
    const depois = await listarBaixados()
    const novo = depois.find((v) => !antes.has(v.nome)) || depois[0]
    res.json({ ok: true, video: novo || null, videos: depois })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
