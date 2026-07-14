import React, { useState } from 'react'
import { ConfirmModal, EditField, Media, PromptBlock, GenerateButton, FilePath } from '../components/index.js'
import { blankChar } from '../lib/scaffold.js'

// PERSONAGENS: o pool global (compartilhado entre sagas e quadrinhos), com casa própria.
export default function PersonagensView({ dados, update, existing, bust, jobs, startGen }) {
  const personagens = dados.personagens || []
  const estilos = dados.estilos || []
  const [confirm, setConfirm] = useState(null)

  function novoPersonagem() {
    const p = blankChar(personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p) })
  }
  function excluir(pid) {
    const p = personagens.find((x) => x.id === pid)
    const usos = (dados.sagas || []).filter((s) => s.elenco.includes(pid)).map((s) => s.titulo)
    const usosQ = (dados.quadrinhos || []).filter((q) => (q.elenco || []).includes(pid)).map((q) => q.titulo)
    const todos = [...usos, ...usosQ]
    setConfirm({
      titulo: 'Excluir personagem do pool?',
      mensagem: `"${p.nome}" sai do pool` + (todos.length ? ` e do elenco de: ${todos.join(', ')}.` : '.') +
        `\n\nA imagem no disco continua (não é apagada). Salve depois para efetivar.`,
      confirmar: 'Excluir', perigo: true,
      onConfirm: () => {
        setConfirm(null)
        update((n) => {
          n.personagens = n.personagens.filter((x) => x.id !== pid)
          for (const s of n.sagas) s.elenco = s.elenco.filter((x) => x !== pid)
          for (const q of (n.quadrinhos || [])) q.elenco = (q.elenco || []).filter((x) => x !== pid)
        })
      },
    })
  }

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      <div className="panel">
        <div className="section-head" style={{ margin: 0 }}>
          <h3 style={{ margin: 0 }}>👥 Pool de personagens ({personagens.length})</h3>
          <div className="row-actions">
            <button className="mini-btn" onClick={novoPersonagem}>＋ Novo personagem</button>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
          Todo personagem vive aqui e é reusado por qualquer saga ou quadrinho (crossover). A ficha é a âncora de
          consistência: gere-a e ela vai como referência nas cenas/painéis onde o personagem aparece.
          Cada um <b>herda um estilo do catálogo</b> e pode somar o próprio detalhe de arte, igual as sagas.
        </p>
      </div>

      <div className="char-grid">
        {personagens.map((p) => {
          const pi = personagens.findIndex((x) => x.id === p.id)
          const emSagas = (dados.sagas || []).filter((s) => s.elenco.includes(p.id)).map((s) => s.titulo)
          const emQuad = (dados.quadrinhos || []).filter((q) => (q.elenco || []).includes(p.id)).map((q) => q.titulo)
          const usos = [...emSagas, ...emQuad]
          const est = estilos.find((e) => e.id === p.estiloId)
          // espelha o readDados do server: estilo base + detalhe de arte do personagem
          const prefixo = est ? [est.stylePrefix, p.estiloExtra].filter(Boolean).join(', ') : ''
          return (
            <div className="char-card" key={p.id}>
              <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
              <div className="char-body">
                <div className="char-card-top">
                  <span className="char-id" title="id (usado no nome do arquivo)">#{p.id}</span>
                  <button className="mini-btn danger" onClick={() => excluir(p.id)}>excluir</button>
                </div>
                <EditField label="Nome" value={p.nome} onChange={(v) => update((n) => { n.personagens[pi].nome = v })} />
                <EditField label="Arquétipo (quem evoca)" value={p.arquetipo} onChange={(v) => update((n) => { n.personagens[pi].arquetipo = v })} />
                <p className="char-cross">{usos.length ? '🔗 ' + usos.join(', ') : 'sem uso ainda'}</p>
                <label className="edit-field">
                  <span className="edit-label">Estilo (herdado do catálogo)</span>
                  <select
                    value={p.estiloId || ''}
                    onChange={(e) => update((n) => { n.personagens[pi].estiloId = e.target.value || undefined })}
                  >
                    <option value="">(nenhum)</option>
                    {estilos.map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
                  </select>
                </label>
                <EditField
                  label="Detalhe de arte (soma ao estilo)"
                  value={p.estiloExtra || ''}
                  onChange={(v) => update((n) => { n.personagens[pi].estiloExtra = v })}
                />
                <EditField label="Regras (âncoras visuais)" value={p.regras} onChange={(v) => update((n) => { n.personagens[pi].regras = v })} textarea />
                <PromptBlock
                  label="Prompt da ficha"
                  tool="ChatGPT Images"
                  value={p.promptFicha}
                  onChange={(v) => update((n) => { n.personagens[pi].promptFicha = v })}
                  copyText={`${prefixo}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
                  hint={`Copia com o estilo "${est?.nome || '(escolha um acima)'}" + as regras da casa (negativos).`}
                />
                <div className="gen-row">
                  <GenerateButton
                    payload={{ tipo: 'ficha', personagemId: p.id }}
                    targetPath={p.imagem}
                    existing={existing}
                    jobs={jobs}
                    startGen={startGen}
                    label="⚡ Gerar ficha"
                    refInfo={`Estilo: ${est?.nome || '(nenhum — escolha acima)'}.`}
                  />
                  <span className="gen-hint muted">gpt-image-2 · seu ChatGPT Plus</span>
                </div>
                <FilePath path={p.imagem} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
