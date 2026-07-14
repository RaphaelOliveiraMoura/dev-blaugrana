// Progresso conta arquivos que existem em disco (via /api/progress); sem essa
// informação, cai no status marcado à mão em cada cena/painel.

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

export function quadProgress(quad, progress) {
  const total = (quad.paineis || []).length
  const p = progress && progress.quadrinhos && progress.quadrinhos[quad.id]
  const img = p ? p.img : (quad.paineis || []).filter((pn) => pn.status === 'aprovada').length
  return { img, total, done: total > 0 && img === total }
}
