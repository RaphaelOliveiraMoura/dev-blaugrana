import { Router } from 'express'
import path from 'node:path'
import { stat } from 'node:fs/promises'
import { CONTEUDO_DIR } from '../config.mjs'
import { exists, dentroDoConteudo } from '../lib/arquivos.mjs'
import { audioDaCena } from '../lib/midia.mjs'
import { readDados } from '../store.mjs'

export const midiaRouter = Router()

// Quais arquivos de mídia existem (para o front esconder o que falta).
//
// Devolve o MTIME em vez de `true`, e `false` quando não existe. Continua servindo como
// booleano em todo lugar que só pergunta "existe?" (mtime é sempre truthy), e de quebra dá
// pra saber se um DERIVADO envelheceu: o slide do carrossel nasce da arte do painel, e
// regerar a arte não regera o slide. Sem a data, o studio mostrava o slide de quatro dias
// atrás como se fosse a peça atual, sem nenhum sinal — foi exatamente o que aconteceu com o
// o-dia-bernabeu e o o-dia-dani depois de regerar a arte.
midiaRouter.post('/media-exists', async (req, res) => {
  const paths = Array.isArray(req.body?.paths) ? req.body.paths : []
  const result = {}
  for (const rel of paths) {
    const st = await stat(dentroDoConteudo(rel)).catch(() => null)
    result[rel] = st ? st.mtimeMs : false
  }
  res.json(result)
})

// Progresso de todos os episódios/quadrinhos com base nos ARQUIVOS em disco.
// É a fonte honesta: o status marcado à mão pode mentir, o arquivo não.
midiaRouter.get('/progress', async (_req, res) => {
  try {
    const d = await readDados()
    const out = {}
    for (const s of d.sagas || []) {
      for (const ep of s.episodios || []) {
        let img = 0, vid = 0, audio = 0
        for (const c of ep.cenas) {
          if (c.imagem && await exists(path.join(CONTEUDO_DIR, c.imagem))) img++
          if (c.video && await exists(path.join(CONTEUDO_DIR, c.video))) vid++
          if (await audioDaCena(ep.id, c.numero)) audio++
        }
        out[ep.id] = { img, vid, audio, total: ep.cenas.length }
      }
    }
    const quadrinhos = {}
    for (const q of d.quadrinhos || []) {
      let img = 0
      for (const p of q.paineis || []) {
        if (p.imagem && await exists(path.join(CONTEUDO_DIR, p.imagem))) img++
      }
      quadrinhos[q.id] = { img, total: (q.paineis || []).length }
    }
    out.quadrinhos = quadrinhos
    res.json(out)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
