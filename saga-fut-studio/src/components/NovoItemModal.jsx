import React, { useState } from 'react'
import { sugerirId, validarId } from '../lib/scaffold.js'
import { Icon } from './Icon.jsx'

// Pede nome e id na criação. O id fica visível de propósito: ele vira nome de
// pasta em disco e endereço na URL, e não tem como mudar depois sem migrar
// arquivo na mão. Sugere um id curto a partir do nome, mas quem manda é você.
export function NovoItemModal({ titulo, rotuloNome, exemploNome, idsExistentes, previewPasta, onCriar, onCancel }) {
  const [nome, setNome] = useState('')
  const [idManual, setIdManual] = useState(null) // null = ainda seguindo o nome
  const id = idManual ?? sugerirId(nome)
  const erro = nome.trim() ? validarId(id, idsExistentes) : null
  const podeCriar = !!nome.trim() && !erro
  const criar = () => podeCriar && onCriar({ id, titulo: nome.trim() })

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h4>{titulo}</h4>

        <label className="field-group">
          <span className="label">{rotuloNome}</span>
          <input className="field" autoFocus value={nome} placeholder={exemploNome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') criar() }} />
        </label>

        <label className="field-group">
          <span className="label">Id</span>
          <input className="field mono" value={id} placeholder="ex: carecas"
            onChange={(e) => setIdManual(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') criar() }} />
          <span className="hint">Vira o nome da pasta e o endereço. Não muda depois.</span>
        </label>

        {erro
          ? <p className="modal-warn"><Icon name="alerta" size={14} /><span>{erro}</span></p>
          : <p className="modal-path"><Icon name="pasta" size={12} />saga-fut/<strong>{previewPasta(id || '…')}</strong></p>}

        <p>Curto e sem artigo funciona melhor: <code>carecas</code>, não <code>a-era-dos-carecas</code>. O título completo você edita depois à vontade.</p>

        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" disabled={!podeCriar} onClick={criar}>
            <Icon name="plus" size={14} /> Criar
          </button>
        </div>
      </div>
    </div>
  )
}
