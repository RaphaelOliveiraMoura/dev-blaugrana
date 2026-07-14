import React from 'react'

const OPCOES = ['pendente', 'gerada', 'aprovada', 'refazer']

export function StatusPill({ value, onChange }) {
  return (
    <select className={'status-pill s-' + value} value={value} onChange={(e) => onChange(e.target.value)}>
      {OPCOES.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}
