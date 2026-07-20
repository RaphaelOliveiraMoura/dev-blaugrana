// Scaffold: criar/duplicar sagas, episódios, cenas, personagens e quadrinhos.
// Os caminhos de mídia saem todos de shared/caminhos.mjs, nunca montados aqui.

import { cenaImagem, cenaVideo, fichaImagem, painelImagem, epIdDe } from '../../shared/caminhos.mjs'
import { TIPOS_QUADRINHO } from './formatos.js'

// mídia de uma cena, sempre derivada do id do episódio + número
const midiaDaCena = (epId, numero) => ({ imagem: cenaImagem(epId, numero), video: cenaVideo(epId, numero) })

export function slugify(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'saga'
}
export function uniqueId(base, existing) {
  let id = base, i = 2
  while (existing.includes(id)) { id = `${base}-${i}`; i++ }
  return id
}

// O id é uma ALÇA curta, não o título: ele vira nome de pasta e de URL, e não dá
// pra mudar depois. Sugere algo curto a partir do nome, sem artigos e sem ligação.
const PALAVRAS_VAZIAS = new Set(['a', 'o', 'as', 'os', 'um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'e'])
export function sugerirId(nome) {
  if (!(nome || '').trim()) return ''
  const partes = slugify(nome).split('-').filter(Boolean)
  const uteis = partes.filter((p) => !PALAVRAS_VAZIAS.has(p))
  return (uteis.length ? uteis : partes).slice(0, 2).join('-')
}

// kebab-case, sem acento, único. Devolve o problema ou null.
export function validarId(id, existentes) {
  if (!id) return 'Escolha um id.'
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) return 'Só minúsculas, números e hífen (ex: carecas-jorel).'
  if (existentes.includes(id)) return 'Já existe um item com esse id.'
  return null
}
export function allEpIds(dados) {
  return dados.sagas.flatMap((s) => s.episodios.map((e) => e.id))
}

// ---------- sagas / episódios / cenas ----------

export function blankCena(epId, numero) {
  return {
    numero, titulo: 'Nova cena', tempo: '', personagens: [], naoAparecem: [],
    narracao: '', promptImagem: '', promptVideo: '', promptAudio: '', montagem: '',
    ...midiaDaCena(epId, numero),
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
export function blankSaga(existingIds, { id, titulo }) {
  const sagaId = uniqueId(id, existingIds)
  return {
    id: sagaId, titulo, selo: 'Mercado da Bola', genero: '', status: 'roteiro',
    premissa: '', narradorTom: '',
    stylePrefix: '3D animated caricature in Pixar style, cinematic lighting, exaggerated expressions, vertical 9:16',
    elenco: [], episodios: [blankEp(epIdDe(sagaId, 1))],
  }
}
// re-ids os episódios e re-aponta a mídia das cenas para as novas pastas (esqueleto limpo)
export function reidEpisodios(saga, sagaId) {
  saga.episodios = saga.episodios.map((ep, i) => {
    const epId = epIdDe(sagaId, i + 1)
    ep.id = epId
    ep.cenas = ep.cenas.map((c) => ({
      ...c, ...midiaDaCena(epId, c.numero),
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
    ...c, ...midiaDaCena(newId, c.numero),
    statusImagem: 'pendente', statusVideo: 'pendente',
  }))
  return e
}
export function dupCena(cena, epId, novoNumero) {
  return {
    ...structuredClone(cena), numero: novoNumero, titulo: cena.titulo + ' (cópia)',
    ...midiaDaCena(epId, novoNumero),
    statusImagem: 'pendente', statusVideo: 'pendente',
  }
}
export function blankChar(existingIds, { id, nome } = {}) {
  const charId = uniqueId(id || slugify(nome) || 'personagem', existingIds)
  return { id: charId, nome: nome || 'Novo personagem', arquetipo: '', regras: '', imagem: fichaImagem(charId), promptFicha: '' }
}

// ---------- quadrinhos / painéis ----------

export function blankPainel(quadId, numero) {
  return {
    numero, roteiro: '', falas: [], promptImagem: '',
    imagem: painelImagem(quadId, numero), status: 'pendente',
  }
}
// O título é SEMPRE o id (nome da pasta): o `titulo` do pedido só serve para derivar o
// id quando não vem um pronto. Assim o quadrinho já nasce sem divergência — o nome
// bonito do post fica em publicacao.titulo. (O servidor reforça isso em toda leitura
// e escrita, mas nascer certo evita a UI piscar um nome que vai mudar.)
export function blankQuadrinho(existingIds, tipo = 'tirinha', { id, titulo }) {
  const quadId = uniqueId(id || slugify(titulo || 'quadrinho'), existingIds)
  const n = TIPOS_QUADRINHO[tipo]?.nPaineis || 2
  return {
    id: quadId, titulo: quadId, tipo, selo: 'Resenha da Rodada', status: 'roteiro',
    estiloId: 'comedia-3d', estiloExtra: '', formato: '3:4',
    elenco: [], contexto: '', legenda: '',
    paineis: Array.from({ length: n }, (_, i) => blankPainel(quadId, i + 1)),
    publicacao: { titulo: '', tiktok: '', instagram: '', twitter: '', youtube: { titulo: '', descricao: '' } },
  }
}
// re-aponta a arte dos painéis para a nova pasta (esqueleto limpo)
export function reidPaineis(quad, quadId) {
  quad.paineis = (quad.paineis || []).map((p) => ({
    ...p, imagem: painelImagem(quadId, p.numero), status: 'pendente',
  }))
  return quad
}
export function dupQuadrinho(quad, existingIds) {
  const id = uniqueId(slugify(quad.id) + '-copia', existingIds)
  const q = structuredClone(quad)
  q.id = id; q.titulo = id; q.status = 'roteiro' // título acompanha a pasta nova
  return reidPaineis(q, id)
}
export function dupPainel(painel, quadId, novoNumero) {
  return {
    ...structuredClone(painel), numero: novoNumero,
    imagem: painelImagem(quadId, novoNumero), status: 'pendente',
  }
}
