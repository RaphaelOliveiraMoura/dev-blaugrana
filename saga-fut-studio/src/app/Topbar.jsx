import React from 'react'
import { Icon } from '../components/Icon.jsx'

export function Topbar({ crumbs, onCrumb, dirty, saving, error, onSave }) {
  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Trilha">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevron" size={13} className="crumb-sep" />}
            {c.rota
              ? <button className="crumb" onClick={() => onCrumb(c.rota)}>{c.label}</button>
              : <span className="crumb-current">{c.label}</span>}
          </React.Fragment>
        ))}
      </nav>

      <div className="topbar-actions">
        {error && (
          <span className="save-error" title={error}>
            <Icon name="alerta" size={13} />
            {error}
          </span>
        )}
        <div className="save-state">
          {dirty ? (
            <>
              <span className="dirty-dot">não salvo</span>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                <Icon name="salvar" size={14} />
                {saving ? 'Salvando…' : 'Salvar'}
                <kbd>⌘S</kbd>
              </button>
            </>
          ) : (
            <span className="saved-ok"><Icon name="check" size={13} /> tudo salvo</span>
          )}
        </div>
      </div>
    </header>
  )
}
