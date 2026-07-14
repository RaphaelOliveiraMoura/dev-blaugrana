import React from 'react'

// modal de confirmação reutilizável (para ações destrutivas)
export function ConfirmModal({ titulo, mensagem, confirmar, onConfirm, onCancel, perigo }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h4>{titulo}</h4>
        <p style={{ whiteSpace: 'pre-wrap' }}>{mensagem}</p>
        <div className="modal-actions">
          <button className="ctrl" onClick={onCancel}>Cancelar</button>
          <button className={perigo ? 'gen-btn' : 'save-btn'} onClick={onConfirm}>{confirmar || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}
