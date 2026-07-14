import React from 'react'
import { Icon } from './Icon.jsx'

// Seção que abre sob demanda. Existe para escalonar por etapa do pipeline: o que
// pertence ao passo seguinte fica a um clique, não empilhado no meio do trabalho.
export function Recolhivel({ titulo, nota, aberto, onToggle, children }) {
  return (
    <div className={'recolhivel' + (aberto ? ' aberto' : '')}>
      <button className="recolhivel-bar" onClick={onToggle} aria-expanded={aberto}>
        <Icon name="chevron" size={12} />
        <span className="recolhivel-titulo">{titulo}</span>
        {nota && <span className="recolhivel-nota">{nota}</span>}
      </button>
      {aberto && <div className="recolhivel-corpo">{children}</div>}
    </div>
  )
}
