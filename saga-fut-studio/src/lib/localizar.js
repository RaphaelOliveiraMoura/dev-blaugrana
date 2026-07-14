// Resolve as entidades da rota (que vem por id) para o objeto + a posição dele.
// A posição é derivada dos dados a cada render, nunca guardada: é ela que os
// caminhos de edição usam (n.sagas[si]...), e um id nunca aponta pro item errado.

export function acharSaga(dados, sagaId) {
  const si = (dados.sagas || []).findIndex((s) => s.id === sagaId)
  return si < 0 ? null : { saga: dados.sagas[si], si }
}

export function acharEpisodio(dados, sagaId, epId) {
  const naSaga = acharSaga(dados, sagaId)
  if (!naSaga) return null
  const ei = naSaga.saga.episodios.findIndex((e) => e.id === epId)
  return ei < 0 ? null : { ...naSaga, ep: naSaga.saga.episodios[ei], ei }
}

export function acharQuadrinho(dados, quadId) {
  const qi = (dados.quadrinhos || []).findIndex((q) => q.id === quadId)
  return qi < 0 ? null : { quad: dados.quadrinhos[qi], qi }
}
