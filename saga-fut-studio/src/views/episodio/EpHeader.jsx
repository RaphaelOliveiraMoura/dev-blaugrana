import React, { useState } from 'react'
import { EditField, Icon } from '../../components/index.js'
import { useEp } from './EpContext.jsx'

// Cabeçalho do episódio. O contexto real e o cliffhanger você escreve uma vez e
// relê de vez em quando; as cenas você edita o tempo todo. Então isto é uma linha
// que resume, e só abre quando pedido: o trabalho começa na primeira dobra.
export function EpHeader() {
  const { ep, setEp } = useEp()
  const [aberto, setAberto] = useState(false)

  const resumo = ep.contextoReal || ep.publicar || 'sem contexto ainda'

  return (
    <div className={'ep-header' + (aberto ? ' aberto' : '')}>
      <button className="ep-header-bar" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <span className="ep-header-titulo">{ep.titulo}</span>
        {!aberto && <span className="ep-header-resumo">{resumo}</span>}
        <span className="ep-header-toggle">
          {aberto ? 'fechar' : 'contexto'}
          <Icon name="chevron" size={13} />
        </span>
      </button>

      {aberto && (
        <div className="ep-header-corpo">
          <EditField label="Título" value={ep.titulo} onChange={(v) => setEp('titulo', v)} />
          <EditField
            label="Contexto real"
            hint="O fato da vida real que esta saga está usando."
            value={ep.contextoReal}
            onChange={(v) => setEp('contextoReal', v)}
            textarea
          />
          <div className="field-row">
            <EditField
              label="Fim em suspense"
              hint="O gancho que fecha o episódio e faz querer o próximo."
              value={ep.cliffhanger}
              onChange={(v) => setEp('cliffhanger', v)}
              textarea
            />
            <EditField
              label="Publicar"
              hint="Nota interna, só pra você."
              value={ep.publicar}
              onChange={(v) => setEp('publicar', v)}
              textarea
            />
          </div>
        </div>
      )}
    </div>
  )
}
