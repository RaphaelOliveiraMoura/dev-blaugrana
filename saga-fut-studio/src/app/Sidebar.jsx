import React from 'react'
import { NAV_GROUPS } from './nav.js'
import { Icon } from '../components/Icon.jsx'
import { useStudio } from './StudioContext.jsx'
import { useModelosImagem } from '../hooks/useModelosImagem.js'

export function Sidebar({ activeTop, onIr }) {
  const { dados, update } = useStudio()
  const { modelos, padrao } = useModelosImagem()
  const modeloAtual = dados?.projeto?.modeloImagem || padrao
  const modelo = modelos.find((m) => m.id === modeloAtual)
  const dica = modelo
    ? `Geração de imagem via ${modelo.nome}, usando a assinatura ${modelo.assinatura}. Troque aqui pra valer em todo o projeto.`
    : 'Modelo que gera as imagens em todo o projeto'

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

      <div className="sidebar-foot" title={dica}>
        <Icon name="imagem" size={13} />
        <span className="sidebar-foot-label">Imagens</span>
        <select
          className="field sidebar-modelo"
          value={modeloAtual}
          onChange={(e) => update((n) => { n.projeto.modeloImagem = e.target.value })}
          title={dica}
        >
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>{m.curto || m.nome}</option>
          ))}
        </select>
      </div>
    </aside>
  )
}
