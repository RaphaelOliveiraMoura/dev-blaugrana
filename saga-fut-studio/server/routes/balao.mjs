import { Router } from 'express'
import { FONTES_BALAO, FONTE_BALAO_PADRAO } from '../lib/balao.mjs'

export const balaoRouter = Router()

// Só o catálogo de fontes de traço, pra UI montar o seletor.
//
// A rota que DESENHAVA o balão (POST /balao, gravando um posts/balao-<n>.png) saiu em
// 10/08/2026: o balão virou acabamento, desenhado junto com moldura e legenda, e a prévia
// da aba passou a ser o próprio slide (POST /previa-painel, em routes/render.mjs). Enquanto
// existiram os dois caminhos, o que a aba mostrava não era o que ia pro post.
balaoRouter.get('/balao/fontes', (_req, res) => {
  res.json({ padrao: FONTE_BALAO_PADRAO, fontes: FONTES_BALAO.map((f) => ({ id: f.id, nome: f.nome })) })
})
