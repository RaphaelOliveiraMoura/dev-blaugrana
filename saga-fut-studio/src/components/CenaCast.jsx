import React from 'react'

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
  return (
    <div className="cast-editor">
      {elencoIds.length === 0
        ? <span className="muted" style={{ fontSize: 12 }}>Adicione personagens ao elenco da saga primeiro (aba da saga).</span>
        : elencoIds.map((id) => {
          const s = stateOf(id)
          return (
            <button key={id} className={'cast-chip ' + s} onClick={() => cycle(id)}
              title="clique: aparece → não aparece → neutro">
              {s === 'in' ? '✓ ' : s === 'out' ? '✗ ' : ''}{byId[id]?.nome || id}
            </button>
          )
        })}
    </div>
  )
}
