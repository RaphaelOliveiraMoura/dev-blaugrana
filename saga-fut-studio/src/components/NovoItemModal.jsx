import React, { useState } from 'react'
import { sugerirId, validarId } from '../lib/scaffold.js'

// Pede nome e id na criação. O id fica visível de propósito: ele vira nome de
// pasta em disco e endereço na URL, e não tem como mudar depois sem migrar
// arquivo na mão. Sugere um id curto a partir do nome, mas quem manda é você.
export function NovoItemModal({ titulo, rotuloNome, exemploNome, idsExistentes, previewPasta, onCriar, onCancel }) {
  const [nome, setNome] = useState('')
  const [idManual, setIdManual] = useState(null) // null = ainda seguindo o nome
  const id = idManual ?? sugerirId(nome)
  const erro = nome.trim() ? validarId(id, idsExistentes) : null
  const podeCriar = !!nome.trim() && !erro

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h4>{titulo}</h4>
        <label className="edit-field">
          <span className="edit-label">{rotuloNome}</span>
          <input
            autoFocus
            value={nome}
            placeholder={exemploNome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && podeCriar) onCriar({ id, titulo: nome.trim() }) }}
          />
        </label>
        <label className="edit-field">
          <span className="edit-label">Id (vira o nome da pasta e o endereço, não muda depois)</span>
          <input
            value={id}
            placeholder="ex: carecas"
            onChange={(e) => setIdManual(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && podeCriar) onCriar({ id, titulo: nome.trim() }) }}
          />
        </label>
        {erro
          ? <p className="modal-warn">⚠ {erro}</p>
          : <p className="modal-path">📁 saga-fut/<strong>{previewPasta(id || '…')}</strong></p>}
        <p className="muted" style={{ fontSize: 12 }}>
          Curto e sem artigo funciona melhor: <code>carecas</code>, não <code>a-era-dos-carecas</code>.
          O título completo você edita depois à vontade.
        </p>
        <div className="modal-actions">
          <button className="ctrl" onClick={onCancel}>Cancelar</button>
          <button className="save-btn" disabled={!podeCriar} onClick={() => onCriar({ id, titulo: nome.trim() })}>Criar</button>
        </div>
      </div>
    </div>
  )
}
