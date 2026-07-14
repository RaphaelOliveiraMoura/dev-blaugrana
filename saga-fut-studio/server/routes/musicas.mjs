import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { INICIOS_FILE, MUSICA_DIR } from '../config.mjs'

export const musicasRouter = Router()

// Ponto de início (segundos) de cada faixa: onde o tema entra, pra pular a intro quieta.
// Propriedade GLOBAL da faixa (vale em qualquer cena/episódio), sidecar em assets/musica/.
export async function readInicios() {
  try { return JSON.parse(await fs.readFile(INICIOS_FILE, 'utf-8')) } catch { return {} }
}

musicasRouter.get('/musicas', async (_req, res) => {
  try {
    const files = await fs.readdir(MUSICA_DIR).catch(() => [])
    res.json({
      musicas: files.filter((f) => /\.(mp3|m4a|wav|ogg)$/i.test(f)).sort(),
      inicios: await readInicios(),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

musicasRouter.post('/musica-inicio', async (req, res) => {
  try {
    const { file, inicio } = req.body || {}
    if (!file) return res.status(400).json({ error: 'Falta file.' })
    const inicios = await readInicios()
    const v = Math.max(0, Math.round(Number(inicio) || 0))
    if (v) inicios[path.basename(String(file))] = v
    else delete inicios[path.basename(String(file))]
    await fs.mkdir(path.dirname(INICIOS_FILE), { recursive: true })
    await fs.writeFile(INICIOS_FILE, JSON.stringify(inicios, null, 2) + '\n', 'utf-8')
    res.json({ ok: true, inicios })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
