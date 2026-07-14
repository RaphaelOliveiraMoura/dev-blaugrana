import React from 'react'
import { CabecalhoTela, EditField, PromptBlock, Icon } from '../../components/index.js'
import { useStudio } from '../../app/StudioContext.jsx'

// A ficha da saga: identidade, premissa, tom e estilo visual. Tudo que se escreve
// uma vez, atrás de uma linha. As ações raras (duplicar, excluir) moram na barra.
export function SagaFicha({ saga, si, onDuplicar, onExcluir }) {
  const { dados, update } = useStudio()
  const set = (campo, v) => update((n) => { n.sagas[si][campo] = v })
  const est = (dados.estilos || []).find((e) => e.id === saga.estiloId)

  const acoes = (
    <>
      <button className="btn btn-ghost btn-icon btn-sm" title="Duplicar saga" onClick={onDuplicar}>
        <Icon name="duplicar" size={13} />
      </button>
      <button className="btn btn-ghost btn-icon btn-sm btn-danger" title="Excluir saga" onClick={onExcluir}>
        <Icon name="trash" size={13} />
      </button>
    </>
  )

  return (
    <CabecalhoTela titulo={saga.titulo} selo={saga.selo} resumo={saga.genero} acoes={acoes}>
      <EditField label="Título" value={saga.titulo} onChange={(v) => set('titulo', v)} />
      <div className="field-row">
        <EditField label="Selo" value={saga.selo} onChange={(v) => set('selo', v)} />
        <EditField label="Gênero" value={saga.genero} onChange={(v) => set('genero', v)} />
        <EditField label="Status" value={saga.status} onChange={(v) => set('status', v)} />
      </div>
      <EditField label="Premissa" value={saga.premissa} onChange={(v) => set('premissa', v)} textarea />
      <EditField label="Tom do narrador" value={saga.narradorTom} onChange={(v) => set('narradorTom', v)} textarea />

      <div className="ficha-sep">
        <label className="field-group">
          <span className="label">Estilo do catálogo</span>
          <select className="field" value={saga.estiloId || ''} onChange={(e) => set('estiloId', e.target.value || undefined)}>
            <option value="">estilo próprio (custom)</option>
            {(dados.estilos || []).map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
          </select>
        </label>

        {saga.estiloId ? (
          <>
            <EditField
              label="Detalhe de arte"
              hint="Paleta ou cenário desta saga, somado ao estilo base."
              value={saga.estiloExtra || ''}
              onChange={(v) => set('estiloExtra', v)}
              textarea
            />
            <p className="hint">
              Prefixo resolvido: <code>{[est?.stylePrefix, saga.estiloExtra].filter(Boolean).join(', ') || 'vazio'}</code>
            </p>
            <p className="hint">Pra mudar o traço base, edite o estilo no menu Estilos.</p>
          </>
        ) : (
          <PromptBlock
            label="Prefixo de estilo próprio"
            tool="esta saga não usa o catálogo"
            value={saga.stylePrefix || ''}
            onChange={(v) => set('stylePrefix', v)}
          />
        )}
      </div>
    </CabecalhoTela>
  )
}
