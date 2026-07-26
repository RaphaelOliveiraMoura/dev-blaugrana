import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { CONTEUDO_DIR } from '../config.mjs'
import { backupFile } from '../lib/arquivos.mjs'
import { segmentoParado } from '../render/estatico.mjs'
import { tierlistDir, tierlistVideo } from '../../shared/caminhos.mjs'
import { VIDEO_SEGUNDOS_PADRAO } from '../../shared/constantes.mjs'

// Tier lists: uma subpasta por ranking (igual quadrinho), com a arte e o vídeo lado a
// lado. Aqui a vitrine (lista o que existe) e o gerador do vídeo estático: a arte
// parada virando vídeo 9:16, tempo escolhido, mudo (o som se escolhe no TikTok).
export const tierlistsRouter = Router()

const TIERLISTS_DIR = path.join(CONTEUDO_DIR, 'tierlists')
const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const SEG_MIN = 2
const SEG_MAX = 60

// slug seguro: é nome de pasta, então nada de barra nem ".." (evita sair da vitrine)
const slugOk = (s) => typeof s === 'string' && /^[a-zA-Z0-9._-]+$/.test(s)

const urlDe = (slug, arquivo) =>
  '/files/tierlists/' + encodeURIComponent(slug) + '/' + encodeURIComponent(arquivo)

// Dados de publicação (título + legenda) de uma tier list. Vivem num publicacao.json
// dentro da própria pasta: a tier list é arquivo em disco, não entrada do project.json,
// então a legenda mora junto da arte e do vídeo, e não no data/.
const PUB_FILE = 'publicacao.json'
function lerPublicacao(dir) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(dir, PUB_FILE), 'utf8'))
    return { titulo: String(p.titulo || ''), legenda: String(p.legenda || '') }
  } catch { return null }
}

tierlistsRouter.get('/tierlists', (_req, res) => {
  let tierlists = []
  try {
    for (const e of fs.readdirSync(TIERLISTS_DIR, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const slug = e.name
      const dir = path.join(TIERLISTS_DIR, slug)
      const arquivos = fs.readdirSync(dir)
      const img = arquivos.find((f) => IMG_EXTS.has(path.extname(f).toLowerCase()))
      if (!img) continue // pasta sem arte não é uma tier list
      const vid = arquivos.find((f) => path.extname(f).toLowerCase() === '.mp4')
      const st = fs.statSync(path.join(dir, img))
      tierlists.push({
        slug,
        imagemRel: `${tierlistDir(slug)}/${img}`,
        imagemUrl: urlDe(slug, img),
        videoRel: vid ? `${tierlistDir(slug)}/${vid}` : null,
        videoUrl: vid ? urlDe(slug, vid) : null,
        publicacao: lerPublicacao(dir),
        bytes: st.size,
        mtime: st.mtimeMs,
      })
    }
    tierlists.sort((a, b) => b.mtime - a.mtime) // mais recentes primeiro
  } catch (e) {
    if (e.code !== 'ENOENT') throw e // pasta ainda não existe = vitrine vazia
  }
  res.json({ tierlists })
})

// Gera o vídeo estático de uma tier list: a arte parada segurando `segundos` em 9:16,
// mudo. Sai no MESMO diretório da arte, com o nome do slug, pra ver os dois juntos no
// Finder. Não precisa salvar nada antes: o servidor só precisa da imagem em disco.
tierlistsRouter.post('/tierlists/video', async (req, res) => {
  const { slug, segundos } = req.body || {}
  if (!slugOk(slug)) return res.status(400).json({ error: 'slug inválido.' })

  const dir = path.join(TIERLISTS_DIR, slug)
  try {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      return res.status(404).json({ error: 'Tier list não encontrada.' })
    }
    const img = fs.readdirSync(dir).find((f) => IMG_EXTS.has(path.extname(f).toLowerCase()))
    if (!img) return res.status(400).json({ error: 'Nenhuma imagem nessa pasta.' })

    const dur = Math.min(SEG_MAX, Math.max(SEG_MIN, Number(segundos) || VIDEO_SEGUNDOS_PADRAO))
    const outRel = tierlistVideo(slug)
    const outAbs = path.join(CONTEUDO_DIR, outRel)
    await backupFile(outAbs, 3) // preserva o vídeo anterior (últimos 3)
    await segmentoParado({ png: path.join(dir, img), dur, saida: outAbs })

    res.json({ ok: true, video: outRel, url: urlDe(slug, path.basename(outRel)), segundos: dur })
  } catch (err) {
    res.status(500).json({ error: 'Falha no ffmpeg: ' + err.message })
  }
})

// Salva os dados de publicação (título + legenda) de uma tier list no publicacao.json
// da pasta. Não passa pelo fluxo de dados/dirty do studio (a tier list não é do
// project.json): grava direto, e a vitrine relê no próximo carregamento.
tierlistsRouter.put('/tierlists/publicacao', (req, res) => {
  const { slug, publicacao } = req.body || {}
  if (!slugOk(slug)) return res.status(400).json({ error: 'slug inválido.' })

  const dir = path.join(TIERLISTS_DIR, slug)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return res.status(404).json({ error: 'Tier list não encontrada.' })
  }
  const dados = {
    titulo: String(publicacao?.titulo || ''),
    legenda: String(publicacao?.legenda || ''),
  }
  try {
    fs.writeFileSync(path.join(dir, PUB_FILE), JSON.stringify(dados, null, 2))
    res.json({ ok: true, publicacao: dados })
  } catch (err) {
    res.status(500).json({ error: 'Falha ao salvar: ' + err.message })
  }
})
