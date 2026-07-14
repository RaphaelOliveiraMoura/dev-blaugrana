import React from 'react'
import { NAV_GROUPS } from './nav.js'

export function Sidebar({ activeTop, onIr }) {
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => onIr('home')} style={{ cursor: 'pointer' }}>
        <div className="brand-title">⚽ SagaFut Studio</div>
        <div className="brand-sub">Universo de sagas de futebol</div>
      </div>
      <nav className="nav">
        {NAV_GROUPS.map((g) => (
          <div className="nav-group" key={g.label}>
            <div className="nav-group-label">{g.label}</div>
            {g.items.map((it) => (
              <button
                key={it.page}
                className={'nav-btn' + (activeTop === it.page ? ' active' : '')}
                onClick={() => onIr(it.page)}
              >
                {it.icon} {it.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot muted">⚡ Imagens: geração via Codex<br />(gpt-image-2 · ChatGPT Plus) ✓</div>
    </aside>
  )
}
