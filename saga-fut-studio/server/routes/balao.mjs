import { Router } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { CONTEUDO_DIR } from '../config.mjs'
import { renderBalao, FONTES_BALAO, FONTE_BALAO_PADRAO } from '../lib/balao.mjs'
import { painelImagem, painelBalao } from '../../shared/caminhos.mjs'

export const balaoRouter = Router()

// Catálogo de fontes de traço pra UI montar o seletor.
balaoRouter.get('/balao/fontes', (_req, res) => {
  res.json({ padrao: FONTE_BALAO_PADRAO, fontes: FONTES_BALAO.map((f) => ({ id: f.id, nome: f.nome })) })
})

// Preenche o BALÃO de um painel com o texto do corpo, por cima da arte parada.
// Instantâneo (vetorial, não é IA): o texto vem na request, então não depende de
// salvar o projeto antes, e regerar apenas troca o balao-<n>.png.
balaoRouter.post('/balao', async (req, res) => {
  try {
    const { quadrinhoId, painelNumero, texto, fonte, pos } = req.body || {}
    const n = Number(painelNumero)
    if (!quadrinhoId || !n) return res.status(400).json({ error: 'quadrinhoId e painelNumero são obrigatórios' })
    if (!(texto || '').trim()) return res.status(400).json({ error: 'texto do balão vazio' })

    const baseAbs = path.join(CONTEUDO_DIR, painelImagem(quadrinhoId, n))
    if (!fs.existsSync(baseAbs)) {
      return res.status(400).json({ error: `a arte base do painel ${n} ainda não foi gerada` })
    }
    const outRel = painelBalao(quadrinhoId, n)
    const outAbs = path.join(CONTEUDO_DIR, outRel)
    const info = await renderBalao({ baseAbs, texto, outAbs, fonte, pos })
    res.json({ ok: true, path: outRel, fontSize: info.fontSize, linhas: info.lines })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})
