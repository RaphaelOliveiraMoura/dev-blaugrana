import React from 'react'

export function Topbar({ crumbs, onCrumb, dirty, saving, error, onSave }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb-sep">›</span>}
            <span
              className={c.rota ? 'crumb' : 'crumb-current'}
              onClick={c.rota ? () => onCrumb(c.rota) : undefined}
            >
              {c.label}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-actions">
        {error && <span className="save-error">⚠ {error}</span>}
        {dirty ? (
          <>
            <span className="dirty-dot" title="Há alterações não salvas">● não salvo</span>
            <button className="save-btn" onClick={onSave} disabled={saving}>
              {saving ? 'Salvando…' : '💾 Salvar'} <kbd>⌘S</kbd>
            </button>
          </>
        ) : <span className="saved-ok muted">tudo salvo ✓</span>}
      </div>
    </header>
  )
}
