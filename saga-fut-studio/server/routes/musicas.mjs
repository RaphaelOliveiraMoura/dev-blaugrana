import { Router } from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { INICIOS_FILE, INICIOS_QUAD_FILE, MUSICA_DIR, MUSICA_QUAD_DIR } from '../config.mjs'
import { fichaDe, TONS } from '../../shared/musica-quadrinho.mjs'

export const musicasRouter = Router()

// Ponto de início (segundos) de cada faixa: onde o tema entra, pra pular a intro quieta.
// Propriedade GLOBAL da faixa, num sidecar em data/. A das sagas é a canônica (usada
// pela trilha do rough-cut via readInicios); a dos quadrinhos é uma biblioteca à parte.
async function readIniciosFile(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf-8')) } catch { return {} }
}
export const readInicios = () => readIniciosFile(INICIOS_FILE)

// Lista os MP3 de uma pasta + os inícios salvos. As duas bibliotecas (saga e
// quadrinho) compartilham a mesma mecânica, só mudam a pasta e o sidecar.
//
// `comFicha` liga os metadados do catálogo (tom, duração, nota, se é meme conhecido) na
// resposta, e é o que o modal de escolha mostra. Só a biblioteca de quadrinho tem catálogo;
// a das sagas devolve a lista crua, como sempre.
function servirBiblioteca(dir, iniciosFile, { comFicha = false } = {}) {
  return {
    async listar(_req, res) {
      try {
        const files = await fs.readdir(dir).catch(() => [])
        // mp4/m4v entram porque música baixada às vezes vem em container de vídeo
        // (só a faixa de áudio importa; o ffmpeg pega [i:a] e ignora o resto)
        const musicas = files.filter((f) => /\.(mp3|m4a|mp4|m4v|wav|ogg|opus|flac)$/i.test(f)).sort()
        res.json({
          musicas,
          inicios: await readIniciosFile(iniciosFile),
          ...(comFicha ? { fichas: Object.fromEntries(musicas.map((f) => [f, fichaDe(f)])), tons: TONS } : {}),
        })
      } catch (e) { res.status(500).json({ error: e.message }) }
    },
    async salvarInicio(req, res) {
      try {
        const { file, inicio } = req.body || {}
        if (!file) return res.status(400).json({ error: 'Falta file.' })
        const inicios = await readIniciosFile(iniciosFile)
        const v = Math.max(0, Math.round(Number(inicio) || 0))
        if (v) inicios[path.basename(String(file))] = v
        else delete inicios[path.basename(String(file))]
        await fs.mkdir(path.dirname(iniciosFile), { recursive: true })
        await fs.writeFile(iniciosFile, JSON.stringify(inicios, null, 2) + '\n', 'utf-8')
        res.json({ ok: true, inicios })
      } catch (e) { res.status(500).json({ error: e.message }) }
    },
  }
}

// As duas bibliotecas como DADO, não como constante solta que cada chamador escolhe de novo.
// Quem monta trilha recebe uma destas e não tem como cair na outra por omissão, que foi
// exatamente o defeito de 11/08/2026: a aba Vídeo do quadrinho listava a biblioteca das sagas,
// o render dela concordava, e o resultado era um acervo de comédia invisível numa tela e
// trilha de drama sombrio oferecida como única opção na outra. Nada falhava.
export const BIB_SAGA = { dir: MUSICA_DIR, inicios: () => readIniciosFile(INICIOS_FILE) }
export const BIB_QUADRINHO = { dir: MUSICA_QUAD_DIR, inicios: () => readIniciosFile(INICIOS_QUAD_FILE) }

const saga = servirBiblioteca(MUSICA_DIR, INICIOS_FILE)
const quad = servirBiblioteca(MUSICA_QUAD_DIR, INICIOS_QUAD_FILE, { comFicha: true })

musicasRouter.get('/musicas', saga.listar)
musicasRouter.post('/musica-inicio', saga.salvarInicio)
musicasRouter.get('/musicas-quadrinho', quad.listar)
musicasRouter.post('/musica-quadrinho-inicio', quad.salvarInicio)
