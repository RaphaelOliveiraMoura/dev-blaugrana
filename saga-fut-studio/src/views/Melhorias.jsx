import React from 'react'
import { useStudio } from '../app/StudioContext.jsx'

// MELHORIAS: backlog do projeto
export default function Melhorias() {
  const { dados, update } = useStudio()
  const itens = dados.melhorias || []
  const ordem = { alta: 0, média: 1, baixa: 2 }
  const sorted = [...itens].sort((a, b) => (a.feito - b.feito) || (ordem[a.prioridade] - ordem[b.prioridade]))
  const feitos = itens.filter((m) => m.feito).length

  return (
    <div>
      <div className="section-head">
        <h3 className="section-title">Backlog · {feitos}/{itens.length} feitos</h3>
      </div>
      {sorted.map((m) => {
        const idx = itens.findIndex((x) => x.id === m.id)
        return (
          <div className={'panel melhoria' + (m.feito ? ' feito' : '')} key={m.id}>
            <label className="melhoria-head">
              <input type="checkbox" checked={!!m.feito} onChange={(e) => update((n) => { n.melhorias[idx].feito = e.target.checked })} />
              <span className="melhoria-titulo">{m.titulo}</span>
              <span className={'prio prio-' + m.prioridade}>{m.prioridade}</span>
            </label>
            <p className="melhoria-desc">{m.desc}</p>
            <div className="melhoria-tags">
              <span>impacto: <strong>{m.impacto}</strong></span>
              <span>esforço: <strong>{m.esforco}</strong></span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
