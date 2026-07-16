import React from 'react'

// Divisor de um grupo dentro de uma listagem agrupada por estilo: o nome do traço
// e quantos itens caem nele. É o mesmo cabeçalho nas três telas (sagas, quadrinhos,
// personagens) pra que agrupar signifique a mesma coisa em todas.
export function GrupoEstiloHead({ nome, n }) {
  return (
    <div className="grupo-estilo-head">
      <span className="grupo-estilo-nome">{nome}</span>
      <span className="grupo-estilo-n">{n}</span>
    </div>
  )
}
