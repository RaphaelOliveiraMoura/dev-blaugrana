import React from 'react'
import { useStudio } from '../app/StudioContext.jsx'

// Onde um item do catálogo (personagem, estilo) está sendo usado, cada uso como
// link pra saga/quadrinho que o usa. Mesma lista no card e no detalhe aberto.
// Cada uso é { tipo: 'saga' | 'quadrinho', id, titulo }.
export function LinksDeUso({ usos, vazio = 'sem uso ainda' }) {
  const { nav } = useStudio()
  if (!usos.length) return <span className="muted">{vazio}</span>
  return usos.map((u, i) => (
    <React.Fragment key={u.tipo + u.id}>
      {i > 0 && ', '}
      <button className="char-uso" onClick={() => (u.tipo === 'saga' ? nav.saga(u.id) : nav.quadrinho(u.id))}>
        {u.titulo}
      </button>
    </React.Fragment>
  ))
}
