import React from 'react'
import { CabecalhoTela, EditField, PromptBlock, Icon } from '../../components/index.js'
import { FORMATOS, TIPOS_QUADRINHO } from '../../lib/formatos.js'
import { useStudio } from '../../app/StudioContext.jsx'

export function QuadrinhoFicha({ quad, qi, onDuplicar, onExcluir }) {
  const { dados, update } = useStudio()
  const set = (campo, v) => update((n) => { n.quadrinhos[qi][campo] = v })
  const resumo = [TIPOS_QUADRINHO[quad.tipo]?.label, FORMATOS[quad.formato]?.label].filter(Boolean).join(' · ')

  const acoes = (
    <>
      <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar quadrinho" onClick={onDuplicar}>
        <Icon name="duplicar" size={13} />
      </button>
      <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir quadrinho" onClick={onExcluir}>
        <Icon name="trash" size={13} />
      </button>
    </>
  )

  return (
    <CabecalhoTela titulo={quad.titulo} selo={quad.selo} resumo={resumo} acoes={acoes}>
      <EditField label="Título" value={quad.titulo} onChange={(v) => set('titulo', v)} />
      <div className="field-row">
        <label className="field-group">
          <span className="label">Tipo</span>
          <select className="field" value={quad.tipo} onChange={(e) => set('tipo', e.target.value)}>
            {Object.entries(TIPOS_QUADRINHO).map(([t, m]) => <option key={t} value={t}>{m.label}</option>)}
          </select>
        </label>
        <label className="field-group">
          <span className="label">Formato</span>
          <select className="field" value={quad.formato} onChange={(e) => set('formato', e.target.value)}>
            {Object.entries(FORMATOS).map(([f, m]) => <option key={f} value={f}>{m.label}</option>)}
          </select>
        </label>
        <EditField label="Selo" value={quad.selo} onChange={(v) => set('selo', v)} />
        <EditField label="Status" value={quad.status} onChange={(v) => set('status', v)} />
      </div>
      <EditField label="Contexto" hint="O gancho real. Nota interna." value={quad.contexto}
        onChange={(v) => set('contexto', v)} textarea />

      <div className="ficha-sep">
        <label className="field-group">
          <span className="label">Estilo do catálogo</span>
          <select className="field" value={quad.estiloId || ''} onChange={(e) => set('estiloId', e.target.value || undefined)}>
            <option value="">estilo próprio (custom)</option>
            {(dados.estilos || []).map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
          </select>
        </label>
        {quad.estiloId
          ? <EditField label="Detalhe de arte" hint="Somado ao estilo base." value={quad.estiloExtra || ''}
              onChange={(v) => set('estiloExtra', v)} textarea />
          : <PromptBlock label="Prefixo de estilo próprio" value={quad.stylePrefix || ''}
              onChange={(v) => set('stylePrefix', v)} />}
      </div>
    </CabecalhoTela>
  )
}
