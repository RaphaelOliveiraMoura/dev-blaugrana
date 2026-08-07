import React from 'react'
import { NAV_GROUPS } from './nav.js'
import { Icon } from '../components/Icon.jsx'

// O SELETOR DE MODELO SAIU DAQUI e foi pro header (SeletorModelo.jsx). No rodapé da barra lateral
// ele lia como configuração de instalação, mexida uma vez e esquecida — e não é: é ele que decide
// de onde sai cada geração, e se ela gasta cota de assinatura ou fatura por imagem.
export function Sidebar({ activeTop, onIr }) {
  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => onIr('quadrinhos')} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onIr('quadrinhos') }}>
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

    </aside>
  )
}
