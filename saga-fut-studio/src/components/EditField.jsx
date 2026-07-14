import React from 'react'

// input inline editável (rótulo pequeno em cima), para metadados de saga/episódio/quadrinho
export function EditField({ label, value, onChange, textarea, placeholder }) {
  return (
    <label className="edit-field">
      <span className="edit-label">{label}</span>
      {textarea
        ? <textarea value={value || ''} placeholder={placeholder} rows={Math.min(6, Math.max(2, Math.ceil((value || '').length / 80)))} onChange={(e) => onChange(e.target.value)} />
        : <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  )
}
