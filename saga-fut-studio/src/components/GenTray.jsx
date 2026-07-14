import React from 'react'
import { Icon } from './Icon.jsx'

// bandeja da fila de geração (canto inferior direito), múltiplos jobs em paralelo
export function GenTray({ jobs, dismissJob }) {
  if (!jobs.length) return null
  const c = (s) => jobs.filter((j) => j.status === s).length
  const parts = []
  if (c('running')) parts.push(`${c('running')} gerando`)
  if (c('queued')) parts.push(`${c('queued')} na fila`)
  if (c('done')) parts.push(`${c('done')} ok`)
  if (c('error')) parts.push(`${c('error')} erro`)

  const ic = { queued: 'relogio', done: 'check', error: 'alerta' }

  return (
    <div className="gen-tray" role="status">
      <div className="gen-tray-head">
        <Icon name="gerar" size={13} />
        {parts.join(' · ') || 'geração'}
      </div>
      <div className="gen-tray-list">
        {jobs.map((j) => (
          <div key={j.id} className={'gen-tray-row ' + j.status}>
            <span className="gen-tray-ic">
              {j.status === 'running' ? <span className="gen-spinner" /> : <Icon name={ic[j.status]} size={12} />}
            </span>
            <span className="gen-tray-name" title={j.targetPath}>
              {j.targetPath.split('/').pop()}
              {j.status === 'error' && <span className="gen-tray-err">, {j.err}</span>}
            </span>
            {j.status === 'error' && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => dismissJob(j.id)} title="Dispensar">
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
