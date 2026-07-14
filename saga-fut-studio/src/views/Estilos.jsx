import React from 'react'
import { EditField, PromptBlock } from '../components/index.js'

// ESTILOS: catálogo central de traço visual (compartilhado por sagas e quadrinhos)
export default function EstilosView({ dados, update }) {
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
        <h3>🎨 Estilos visuais (a base de como as imagens são geradas)</h3>
        <p className="muted" style={{ marginBottom: 0 }}>
          Cada estilo é o traço compartilhado por vários vídeos e quadrinhos. Uma saga ou quadrinho só aponta qual estilo
          usar e herda esse prefixo em TODO prompt de imagem. Edite aqui num lugar só e todos daquele estilo mudam juntos.
          Cada saga/quadrinho ainda pode somar um "detalhe de arte" próprio (paleta, cenário).
        </p>
      </div>
      {estilos.map((e, i) => {
        const usos = usosDe(e.id)
        return (
          <div className="panel" key={e.id}>
            <div className="edit-row">
              <EditField label="Nome" value={e.nome} onChange={(v) => setEstilo(i, 'nome', v)} />
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>id (referência das sagas, não editável)</div>
                <code style={{ fontSize: 13 }}>{e.id}</code>
              </div>
            </div>
            <EditField label="Descrição" value={e.descricao} onChange={(v) => setEstilo(i, 'descricao', v)} textarea />
            <PromptBlock
              label="Prefixo de estilo (vai junto em todo prompt de imagem deste estilo)"
              value={e.stylePrefix}
              onChange={(v) => setEstilo(i, 'stylePrefix', v)}
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Usado por {usos.length}: {usos.join(', ') || '(nenhum)'}
            </p>
            <button className="mini-btn danger" disabled={usos.length > 0} onClick={() => delEstilo(i)}>
              🗑 Excluir{usos.length > 0 ? ' (em uso, não dá)' : ''}
            </button>
          </div>
        )
      })}
      <button className="mini-btn" onClick={addEstilo}>＋ Novo estilo</button>
    </div>
  )
}
