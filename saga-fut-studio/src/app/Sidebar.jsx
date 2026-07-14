import React from 'react'
import { NAV_GROUPS } from './nav.js'
import { Icon } from '../components/Icon.jsx'

export function Sidebar({ activeTop, onIr }) {
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => onIr('home')} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onIr('home') }}>
        <div className="brand-mark">SF</div>
        <div className="brand-title">SagaFut Studio</div>
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
                <Icon name={it.icon} />
                {it.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot" title="Geração de imagem ativa via Codex CLI, usando a assinatura ChatGPT Plus">
        <Icon name="check" size={13} />
        <span>Imagens via Codex · gpt-image-2</span>
      </div>
    </aside>
  )
}
