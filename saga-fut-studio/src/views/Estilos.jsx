import React from 'react'
import { EditField, PromptBlock, Icon } from '../components/index.js'
import { useStudio } from '../app/StudioContext.jsx'

// ESTILOS: catálogo central de traço visual (compartilhado por sagas e quadrinhos)
export default function EstilosView() {
  const { dados, update } = useStudio()
  const estilos = dados.estilos || []
  const usosDe = (id) => [
    ...(dados.sagas || []).filter((s) => s.estiloId === id).map((s) => s.titulo),
    ...(dados.quadrinhos || []).filter((q) => q.estiloId === id).map((q) => q.titulo),
  ]
  const setEstilo = (i, campo, v) => update((n) => { n.estilos[i][campo] = v })
  const addEstilo = () => update((n) => {
    if (!n.estilos) n.estilos = []
    const existentes = new Set(n.estilos.map((e) => e.id))
    let id = 'novo-estilo', k = 1
    while (existentes.has(id)) id = `novo-estilo-${++k}`
    n.estilos.push({ id, nome: 'Novo estilo', descricao: '', stylePrefix: '' })
  })
  const delEstilo = (i) => update((n) => { n.estilos.splice(i, 1) })

  return (
    <div>
      <div className="panel">
        <h3>Estilos visuais</h3>
        <p className="hint">
          Cada estilo é o traço compartilhado por vários vídeos e quadrinhos. Uma saga ou quadrinho só aponta qual
          estilo usar e herda esse prefixo em todo prompt de imagem: edite aqui num lugar só e todos mudam juntos.
          Cada um ainda pode somar um detalhe de arte próprio (paleta, cenário).
        </p>
      </div>

      {estilos.map((e, i) => {
        const usos = usosDe(e.id)
        return (
          <div className="panel" key={e.id}>
            <div className="field-row">
              <EditField label="Nome" value={e.nome} onChange={(v) => setEstilo(i, 'nome', v)} />
              <div className="field-group">
                <span className="label">Id</span>
                <code className="muted">{e.id}</code>
              </div>
            </div>
            <EditField label="Descrição" value={e.descricao} onChange={(v) => setEstilo(i, 'descricao', v)} textarea />
            <PromptBlock
              label="Prefixo de estilo"
              tool="entra em todo prompt deste estilo"
              value={e.stylePrefix}
              onChange={(v) => setEstilo(i, 'stylePrefix', v)}
            />
            <div className="row-actions row-actions-wide">
              <span className="hint">Usado por {usos.length}: {usos.join(', ') || 'ninguém'}</span>
              <button className="btn btn-sm btn-danger" disabled={usos.length > 0} onClick={() => delEstilo(i)}
                title={usos.length ? 'Em uso, não dá pra excluir' : 'Excluir estilo'}>
                <Icon name="trash" size={12} /> Excluir
              </button>
            </div>
          </div>
        )
      })}

      <button className="btn" onClick={addEstilo}><Icon name="plus" size={14} /> Novo estilo</button>
    </div>
  )
}
