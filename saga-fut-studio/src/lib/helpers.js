// Helpers puros: estimativa de narração, progresso e roteamento por hash.

// estimativa de duração da narração (calibrada com áudio real do ElevenLabs: ~2.1 palavras/s
// + ~0.5s por pausa "..."). O clipe do Grok tem 10s.
export function estimaSegundos(texto) {
  const palavras = (texto || '').trim().split(/\s+/).filter(Boolean).length
  const pausas = ((texto || '').match(/\.\.\./g) || []).length
  return Math.round(palavras / 2.1 + pausas * 0.5)
}

// orçamento de tempo da cena contra o clipe de 10s do Grok
export const CLIPE_S = 10   // duração fixa do clipe do Grok
export const MAX_S = 13.5   // acima disso, além de acelerar 1.35x, precisa congelar quadro
export function orcamentoNarracao(texto) {
  const palavras = (texto || '').trim().split(/\s+/).filter(Boolean).length
  const pausas = ((texto || '').match(/\.\.\./g) || []).length
  const seg = estimaSegundos(texto)
  const alvoPalavras = Math.max(0, Math.round((CLIPE_S - pausas * 0.5) * 2.1))
  const cortar = Math.max(0, palavras - alvoPalavras)
  const nivel = seg > MAX_S ? 'alto' : seg > CLIPE_S ? 'medio' : 'ok'
  return { palavras, seg, nivel, cortar, alvoPalavras }
}

// progresso: conta arquivos que existem em disco (via /api/progress); fallback nos status
export function epProgress(ep, progress) {
  const total = ep.cenas.length
  const p = progress && progress[ep.id]
  if (p) {
    return { img: p.img, vid: p.vid, audio: p.audio, total, done: p.img === total && p.vid === total && p.audio === total }
  }
  const img = ep.cenas.filter((c) => c.statusImagem === 'aprovada').length
  const vid = ep.cenas.filter((c) => c.statusVideo === 'aprovada').length
  return { img, vid, audio: 0, total, done: img === total && vid === total }
}

export function sagaProgress(saga, progress) {
  const eps = saga.episodios.map((e) => epProgress(e, progress))
  return { prontos: eps.filter((e) => e.done).length, total: eps.length }
}

// progresso de um quadrinho: painéis com imagem em disco (via progress.quadrinhos) ou fallback status
export function quadProgress(quad, progress) {
  const total = (quad.paineis || []).length
  const p = progress && progress.quadrinhos && progress.quadrinhos[quad.id]
  const img = p ? p.img : (quad.paineis || []).filter((pn) => pn.status === 'aprovada').length
  return { img, total, done: total > 0 && img === total }
}

// formatos de quadrinho: proporção do painel (aspect-ratio p/ o front, orientação p/ o gerador)
export const FORMATOS = {
  '9:16': { label: 'Vertical 9:16', ar: '9 / 16' },
  '4:5': { label: 'Retrato 4:5', ar: '4 / 5' },
  '1:1': { label: 'Quadrado 1:1', ar: '1 / 1' },
}
export const TIPOS_QUADRINHO = {
  charge: { label: 'Charge (1 painel)', nPaineis: 1 },
  tirinha: { label: 'Tirinha (2-4 painéis)', nPaineis: 2 },
  carrossel: { label: 'Carrossel (6-10 painéis)', nPaineis: 6 },
}

// ---- rota persistida na URL (hash) para sobreviver a refresh ----
export function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const p = h.split('/')
  if (p[0] === 'melhorias') return { page: 'melhorias' }
  if (p[0] === 'estilos') return { page: 'estilos' }
  if (p[0] === 'redes') return { page: 'redes' }
  if (p[0] === 'personagens') return { page: 'personagens' }
  if (p[0] === 'sagas') return { page: 'sagas' }
  if (p[0] === 'quadrinhos') return { page: 'quadrinhos' }
  if (p[0] === 'quadrinho' && p[1] != null) return { page: 'quadrinho', qi: Number(p[1]) }
  if (p[0] === 'saga' && p[1] != null) return { page: 'saga', si: Number(p[1]) }
  if (p[0] === 'ep' && p[1] != null && p[2] != null) return { page: 'ep', si: Number(p[1]), ei: Number(p[2]), sub: p[3] || 'cenas' }
  return { page: 'home' }
}
export function routeToHash(r) {
  if (r.page === 'melhorias') return '#/melhorias'
  if (r.page === 'estilos') return '#/estilos'
  if (r.page === 'redes') return '#/redes'
  if (r.page === 'personagens') return '#/personagens'
  if (r.page === 'sagas') return '#/sagas'
  if (r.page === 'quadrinhos') return '#/quadrinhos'
  if (r.page === 'quadrinho') return `#/quadrinho/${r.qi}`
  if (r.page === 'saga') return `#/saga/${r.si}`
  if (r.page === 'ep') return `#/ep/${r.si}/${r.ei}/${r.sub || 'cenas'}`
  return '#/home'
}
