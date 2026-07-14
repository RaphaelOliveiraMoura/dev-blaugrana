import React from 'react'
import { CabecalhoTela, EditField } from '../../components/index.js'
import { useEp } from './EpContext.jsx'

export function EpHeader() {
  const { ep, setEp } = useEp()

  return (
    <CabecalhoTela
      titulo={ep.titulo}
      resumo={ep.contextoReal || ep.publicar || 'sem contexto ainda'}
      rotulo="contexto"
    >
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
    </CabecalhoTela>
  )
}
