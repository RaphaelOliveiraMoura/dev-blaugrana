import React, { useEffect } from 'react'
import { Icon } from './Icon.jsx'

// O detalhe de um item da grade (ficha, painel, cena), em modal.
//
// Modal e não expansão no lugar: a grade é onde você procura, o detalhe é onde
// você trabalha. Crescendo um card no meio da grade, os vizinhos mudam de lugar e
// você perde de vista o que estava olhando. Aqui a grade fica intacta atrás e o
// editor ganha a largura que pede.
//
// Não existe cancelar: cada tecla já entra no estado do studio, igual ao resto do
// app (o Salvar da barra é quem grava em disco). Então fechar por Esc, pelo X ou
// clicando fora é sempre seguro.
//
// midia é a coluna da esquerda (fica à vista enquanto se escreve o prompt que a
// descreve); children é a coluna dos campos.
export function DetalheModal({ titulo, meta, acoes, midia, onFechar, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onFechar])

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal modal-det" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined}>
        <div className="modal-det-head">
          {typeof titulo === 'string' ? <h4 className="modal-det-titulo">{titulo}</h4> : titulo}
          {meta}
          <span className="modal-det-head-acoes">
            {acoes}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onFechar} title="Fechar (Esc)">
              <Icon name="x" size={14} />
            </button>
          </span>
        </div>
        <div className="modal-det-corpo">
          <div className="modal-det-midia">{midia}</div>
          <div className="modal-det-campos">{children}</div>
        </div>
      </div>
    </div>
  )
}
