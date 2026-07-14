import React from 'react'

// bandeja da fila de geração (canto inferior direito), múltiplos jobs em paralelo
export function GenTray({ jobs, dismissJob }) {
  if (!jobs.length) return null
  const c = (s) => jobs.filter((j) => j.status === s).length
  const parts = []
  if (c('running')) parts.push(`${c('running')} gerando`)
  if (c('queued')) parts.push(`${c('queued')} na fila`)
  if (c('done')) parts.push(`${c('done')} ok`)
  if (c('error')) parts.push(`${c('error')} erro`)
  return (
    <div className="gen-tray" role="status">
      <div className="gen-tray-head"><span>⚡ {parts.join(' · ') || 'geração'}</span></div>
      <div className="gen-tray-list">
        {jobs.map((j) => (
          <div key={j.id} className={'gen-tray-row ' + j.status}>
            <span className="gen-tray-ic">
              {j.status === 'running' ? <span className="gen-spinner" /> : j.status === 'queued' ? '⏳' : j.status === 'done' ? '✓' : '⚠'}
            </span>
            <span className="gen-tray-name">
              {j.targetPath.split('/').pop()}
              {j.status === 'error' && <span className="gen-tray-err">, {j.err}</span>}
            </span>
            {j.status === 'error' && <button className="toast-x" onClick={() => dismissJob(j.id)}>✕</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
