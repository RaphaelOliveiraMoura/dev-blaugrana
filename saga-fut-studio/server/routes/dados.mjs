import { Router } from 'express'
import { readDados, writeDados, validarPayload, lerItem, salvarItem, removerItem, problemaNaAgenda } from '../store.mjs'
import { problemaNasSugestoes } from '../../shared/musica-quadrinho.mjs'
import { problemaNoCanal } from '../../shared/canais.mjs'

export const dadosRouter = Router()

dadosRouter.get('/dados', async (_req, res) => {
  try {
    res.json(await readDados())
  } catch (err) {
    res.status(500).json({ error: `Não foi possível ler os dados: ${err.message}` })
  }
})

dadosRouter.put('/dados', async (req, res) => {
  try {
    const problema = validarPayload(req.body)
    if (problema) return res.status(400).json({ error: problema })
    await writeDados(req.body) // split por saga/quadrinho, atômico e com backup
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---------------------------------------------------------------------------
// ROTAS GRANULARES (um item por vez) — o caminho pra PRODUZIR EM PARALELO.
//
// O PUT /dados acima manda o objeto inteiro e é o certo pro front (a aba tem o estado
// completo na mão). Para agente/script é a armadilha: quem salva por último apaga o que
// os outros criaram no meio tempo. Estas rotas escrevem SÓ o arquivo daquele item.
//
//   GET    /api/videos/:id     -> o vídeo (404 se não existe)
//   PUT    /api/videos/:id     -> cria/atualiza só ele (e garante na ordem)
//   PATCH  /api/videos/:id     -> mescla campos no que já está lá (sem reler tudo)
//   DELETE /api/videos/:id     -> remove só ele (com backup)
// Mesmo conjunto pra /api/quadrinhos/:id e /api/sagas/:id.
// ---------------------------------------------------------------------------
const TIPOS = { videos: 'video', quadrinhos: 'quadrinho', sagas: 'saga' }

// o vídeo tem regra própria (título e legenda obrigatórios) — vale aqui também, senão a
// porta granular vira o buraco por onde entra vídeo sem publicação.
function problemaNoItem(tipo, item) {
  if (!item || typeof item !== 'object') return 'corpo precisa ser o objeto do item'
  if (typeof item.id !== 'string' || !item.id.trim()) return 'item precisa de id'
  if (tipo === 'video') {
    if (!String(item.publicacao?.titulo || '').trim()) return `Vídeo "${item.id}" precisa de publicacao.titulo`
    if (!String(item.publicacao?.legenda || '').trim()) return `Vídeo "${item.id}" precisa de publicacao.legenda`
  }
  if (tipo === 'quadrinho' && !Array.isArray(item.paineis)) return 'quadrinho precisa de paineis[]'
  if (tipo === 'saga' && !Array.isArray(item.episodios)) return 'saga precisa de episodios[]'
  // Esta é a porta por onde a skill /o-dia-em-que grava, e foi por aqui que entraram os 58
  // quadrinhos com agenda "19/11" que sumiram do cronograma sem erro nenhum.
  const agenda = tipo === 'saga'
    ? item.episodios.map((ep) => problemaNaAgenda(ep, `Episódio "${ep?.id}"`)).find(Boolean)
    : problemaNaAgenda(item, `${tipo} "${item.id}"`)
  if (agenda) return agenda
  if (tipo === 'quadrinho') {
    const trilha = problemaNasSugestoes(item)
    if (trilha) return trilha
  }
  // CANAL: item pode não declarar (vira devblaugrana, o padrão), mas declarar ERRADO é barrado.
  // Um `canal: "futigibi"` some da lista dos dois canais e do cronograma dos dois, sem erro
  // nenhum — a mesma classe de defeito das 58 agendas "19/11" que sumiram do cronograma.
  const canal = problemaNoCanal(item)
  if (canal) return `${tipo} "${item.id}": ${canal}`
  return null
}

for (const [rota, tipo] of Object.entries(TIPOS)) {
  dadosRouter.get(`/${rota}/:id`, async (req, res) => {
    try {
      const item = await lerItem(tipo, req.params.id)
      if (!item) return res.status(404).json({ error: `${tipo} "${req.params.id}" não existe` })
      res.json(item)
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  dadosRouter.put(`/${rota}/:id`, async (req, res) => {
    try {
      const item = { ...req.body, id: req.params.id }
      const problema = problemaNoItem(tipo, item)
      if (problema) return res.status(400).json({ error: problema })
      res.json({ ok: true, item: await salvarItem(tipo, item) })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  dadosRouter.patch(`/${rota}/:id`, async (req, res) => {
    try {
      const atual = await lerItem(tipo, req.params.id)
      if (!atual) return res.status(404).json({ error: `${tipo} "${req.params.id}" não existe` })
      const item = { ...atual, ...req.body, id: req.params.id }
      const problema = problemaNoItem(tipo, item)
      if (problema) return res.status(400).json({ error: problema })
      res.json({ ok: true, item: await salvarItem(tipo, item) })
    } catch (err) { res.status(500).json({ error: err.message }) }
  })

  dadosRouter.delete(`/${rota}/:id`, async (req, res) => {
    try { res.json(await removerItem(tipo, req.params.id)) }
    catch (err) { res.status(500).json({ error: err.message }) }
  })
}
