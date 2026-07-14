import React from 'react'

// Campo com rótulo curto em cima. Explicação longa vai em `hint`, embaixo e em
// texto normal: rótulo em caixa alta só aguenta 1-3 palavras sem virar grito.
export function EditField({ label, value, onChange, textarea, placeholder, hint }) {
  return (
    <label className="field-group">
      <span className="label">{label}</span>
      {textarea
        ? <textarea className="field" value={value || ''} placeholder={placeholder}
            rows={Math.min(6, Math.max(2, Math.ceil((value || '').length / 90)))}
            onChange={(e) => onChange(e.target.value)} />
        : <input className="field" value={value || ''} placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)} />}
      {hint && <span className="hint">{hint}</span>}
    </label>
  )
}
