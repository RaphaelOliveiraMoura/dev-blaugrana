// Scaffold: criar/duplicar sagas, episódios, cenas, personagens e quadrinhos.

export function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'saga'
}
export function uniqueId(base, existing) {
  let id = base, i = 2
  while (existing.includes(id)) { id = `${base}-${i}`; i++ }
  return id
}
export function allEpIds(dados) {
  return dados.sagas.flatMap((s) => s.episodios.map((e) => e.id))
}

// ---------- sagas / episódios / cenas ----------

export function blankCena(epId, numero) {
  return {
    numero, titulo: 'Nova cena', tempo: '', personagens: [], naoAparecem: [],
    narracao: '', promptImagem: '', promptVideo: '', promptAudio: '', montagem: '',
    imagem: `episodios/${epId}/cenas/${numero}.png`, video: `episodios/${epId}/cenas/${numero}.mp4`,
    statusImagem: 'pendente', statusVideo: 'pendente',
  }
}
export function blankEp(epId) {
  return {
    id: epId, titulo: 'Novo episódio', status: 'roteiro', contextoReal: '', cliffhanger: '',
    publicar: '', narracaoCompleta: '', cenas: [1, 2, 3, 4].map((k) => blankCena(epId, k)),
    endCardText: 'CONTINUA...',
    publicacao: { titulo: '', tiktok: '', instagram: '', twitter: '', youtube: { titulo: '', descricao: '' } },
  }
}
export function blankSaga(existingIds) {
  const id = uniqueId('nova-saga', existingIds)
  return {
    id, titulo: 'Nova saga', selo: 'Mercado da Bola', genero: '', status: 'roteiro',
    premissa: '', narradorTom: '',
    stylePrefix: '3D animated caricature in Pixar style, cinematic lighting, exaggerated expressions, vertical 9:16',
    elenco: [], episodios: [blankEp(`${id}-01`)],
  }
}
// re-ids os episódios e re-aponta a mídia das cenas para as novas pastas (esqueleto limpo)
export function reidEpisodios(saga, sagaId) {
  saga.episodios = saga.episodios.map((ep, i) => {
    const epId = `${sagaId}-${String(i + 1).padStart(2, '0')}`
    ep.id = epId
    ep.cenas = ep.cenas.map((c) => ({
      ...c, imagem: `episodios/${epId}/cenas/${c.numero}.png`, video: `episodios/${epId}/cenas/${c.numero}.mp4`,
      statusImagem: 'pendente', statusVideo: 'pendente',
    }))
    return ep
  })
  return saga
}
export function dupSaga(saga, existingSagaIds) {
  const id = uniqueId(slugify(saga.titulo) + '-copia', existingSagaIds)
  const s = structuredClone(saga)
  s.id = id; s.titulo = saga.titulo + ' (cópia)'; s.status = 'roteiro'
  return reidEpisodios(s, id)
}
export function dupEp(ep, dados) {
  const e = structuredClone(ep)
  const newId = uniqueId(ep.id + '-copia', allEpIds(dados))
  e.id = newId; e.titulo = ep.titulo + ' (cópia)'; e.status = 'roteiro'
  e.cenas = e.cenas.map((c) => ({
    ...c, imagem: `episodios/${newId}/cenas/${c.numero}.png`, video: `episodios/${newId}/cenas/${c.numero}.mp4`,
    statusImagem: 'pendente', statusVideo: 'pendente',
  }))
  return e
}
export function dupCena(cena, epId, novoNumero) {
  return {
    ...structuredClone(cena), numero: novoNumero, titulo: cena.titulo + ' (cópia)',
    imagem: `episodios/${epId}/cenas/${novoNumero}.png`, video: `episodios/${epId}/cenas/${novoNumero}.mp4`,
    statusImagem: 'pendente', statusVideo: 'pendente',
  }
}
export function blankChar(existingIds, nome) {
  const id = uniqueId(slugify(nome) || 'personagem', existingIds)
  return { id, nome: nome || 'Novo personagem', arquetipo: '', regras: '', imagem: `personagens/personagem-${id}.png`, promptFicha: '' }
}

// ---------- quadrinhos / painéis ----------

export function blankPainel(quadId, numero) {
  return {
    numero, roteiro: '', falas: [], promptImagem: '',
    imagem: `quadrinhos/${quadId}/paineis/${numero}.png`, status: 'pendente',
  }
}
export function blankQuadrinho(existingIds, tipo = 'tirinha') {
  const id = uniqueId('nova-tira', existingIds)
  const n = tipo === 'charge' ? 1 : tipo === 'carrossel' ? 6 : 2
  return {
    id, titulo: 'Novo quadrinho', tipo, selo: 'Resenha da Rodada', status: 'roteiro',
    estiloId: 'comedia-3d', estiloExtra: '', formato: '4:5',
    elenco: [], contexto: '', legenda: '',
    paineis: Array.from({ length: n }, (_, i) => blankPainel(id, i + 1)),
    publicacao: { titulo: '', tiktok: '', instagram: '', twitter: '', youtube: { titulo: '', descricao: '' } },
  }
}
// re-aponta a arte dos painéis para a nova pasta (esqueleto limpo)
export function reidPaineis(quad, quadId) {
  quad.paineis = (quad.paineis || []).map((p) => ({
    ...p, imagem: `quadrinhos/${quadId}/paineis/${p.numero}.png`, status: 'pendente',
  }))
  return quad
}
export function dupQuadrinho(quad, existingIds) {
  const id = uniqueId(slugify(quad.titulo) + '-copia', existingIds)
  const q = structuredClone(quad)
  q.id = id; q.titulo = quad.titulo + ' (cópia)'; q.status = 'roteiro'
  return reidPaineis(q, id)
}
export function dupPainel(painel, quadId, novoNumero) {
  return {
    ...structuredClone(painel), numero: novoNumero,
    imagem: `quadrinhos/${quadId}/paineis/${novoNumero}.png`, status: 'pendente',
  }
}
