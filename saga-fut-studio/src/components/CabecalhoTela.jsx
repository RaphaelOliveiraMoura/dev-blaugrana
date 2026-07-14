import React, { useState } from 'react'
import { Icon } from './Icon.jsx'

// Cabeçalho de uma tela de item (saga, episódio, quadrinho).
//
// A ficha (título, selo, premissa, tom, estilo) você preenche uma vez e relê de
// vez em quando; o conteúdo você mexe o tempo todo. Então isto é uma linha que
// resume, e só abre quando pedido: o trabalho começa na primeira dobra.
export function CabecalhoTela({ titulo, selo, resumo, rotulo = 'ficha', acoes, children }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className={'tela-header' + (aberto ? ' aberto' : '')}>
      <div className="tela-header-bar">
        <button className="tela-header-abrir" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          {selo && <span className="selo">{selo}</span>}
          <span className="tela-header-titulo">{titulo}</span>
          {!aberto && resumo && <span className="tela-header-resumo">{resumo}</span>}
          <span className="tela-header-toggle">
            {aberto ? 'fechar' : rotulo}
            <Icon name="chevron" size={13} />
          </span>
        </button>
        {acoes && <div className="tela-header-acoes">{acoes}</div>}
      </div>
      {aberto && <div className="tela-header-corpo">{children}</div>}
    </div>
  )
}
