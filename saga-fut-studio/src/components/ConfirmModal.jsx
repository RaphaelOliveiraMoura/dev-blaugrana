import React from 'react'
import { Icon } from './Icon.jsx'

// modal de confirmação reutilizável (para ações destrutivas)
export function ConfirmModal({ titulo, mensagem, confirmar, onConfirm, onCancel, perigo }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4>{titulo}</h4>
        <p className="pre">{mensagem}</p>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button className={'btn ' + (perigo ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>
            {perigo && <Icon name="trash" size={14} />}
            {confirmar || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
