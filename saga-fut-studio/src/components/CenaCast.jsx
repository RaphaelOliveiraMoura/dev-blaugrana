import React from 'react'
import { Icon } from './Icon.jsx'

// editor de elenco da cena: chips que ciclam aparece(✓) → não aparece(✗) → neutro
export function CenaCast({ elencoIds, byId, personagens, naoAparecem, onChange }) {
  const stateOf = (id) => personagens.includes(id) ? 'in' : naoAparecem.includes(id) ? 'out' : 'off'
  const cycle = (id) => {
    const s = stateOf(id)
    let p = personagens.filter((x) => x !== id)
    let n = naoAparecem.filter((x) => x !== id)
    if (s === 'off') p = [...p, id]
    else if (s === 'in') n = [...n, id]
    onChange(p, n)
  }
  if (elencoIds.length === 0) {
    return <span className="hint">Adicione personagens ao elenco da saga primeiro (aba da saga).</span>
  }
  return (
    <div className="cast-editor">
      {elencoIds.map((id) => {
        const s = stateOf(id)
        return (
          <button key={id} className={'cast-chip ' + s} onClick={() => cycle(id)}
            title="clique: aparece → não aparece → neutro">
            {s === 'in' && <Icon name="check" size={11} />}
            {s === 'out' && <Icon name="x" size={11} />}
            {byId[id]?.nome || id}
          </button>
        )
      })}
    </div>
  )
}
