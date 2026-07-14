import React, { useState } from 'react'
import {
  ConfirmModal, EditField, Media, PromptBlock, GenerateButton, FilePath, Icon,
} from '../components/index.js'
import { blankChar } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'

// PERSONAGENS: o pool global, compartilhado entre sagas e quadrinhos.
export default function PersonagensView() {
  const { dados, update, existing, bust, jobs, startGen } = useStudio()
  const personagens = dados.personagens || []
  const estilos = dados.estilos || []
  const [confirm, setConfirm] = useState(null)

  function novoPersonagem() {
    const p = blankChar(personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p) })
  }
  function excluir(pid) {
    const p = personagens.find((x) => x.id === pid)
    const usos = [
      ...(dados.sagas || []).filter((s) => s.elenco.includes(pid)).map((s) => s.titulo),
      ...(dados.quadrinhos || []).filter((q) => (q.elenco || []).includes(pid)).map((q) => q.titulo),
    ]
    setConfirm({
      titulo: 'Excluir personagem do pool?',
      mensagem: `"${p.nome}" sai do pool` + (usos.length ? ` e do elenco de: ${usos.join(', ')}.` : '.') +
        '\n\nA imagem no disco continua. Salve depois para efetivar.',
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

      <div className="section-head">
        <h3 className="section-title">{personagens.length} personagens no pool</h3>
        <button className="btn btn-sm" onClick={novoPersonagem}><Icon name="plus" size={12} /> Novo personagem</button>
      </div>
      <p className="hint" style={{ marginBottom: 'var(--sp-4)' }}>
        Todo personagem vive aqui e é reusado por qualquer saga ou quadrinho (crossover). A ficha é a âncora de
        consistência: gere-a e ela vai como referência nas cenas e painéis onde ele aparece. Cada um herda um estilo
        do catálogo e pode somar o próprio detalhe de arte, igual às sagas.
      </p>

      <div className="char-grid">
        {personagens.map((p, pi) => {
          const usos = [
            ...(dados.sagas || []).filter((s) => s.elenco.includes(p.id)).map((s) => s.titulo),
            ...(dados.quadrinhos || []).filter((q) => (q.elenco || []).includes(p.id)).map((q) => q.titulo),
          ]
          const est = estilos.find((e) => e.id === p.estiloId)
          // espelha o readDados do server: estilo base + detalhe de arte do personagem
          const prefixo = est ? [est.stylePrefix, p.estiloExtra].filter(Boolean).join(', ') : ''
          const setChar = (campo, v) => update((n) => { n.personagens[pi][campo] = v })

          return (
            <div className="char-card" key={p.id}>
              <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
              <div className="char-body">
                <div className="char-card-top">
                  <span className="char-id" title="id, usado no nome do arquivo">{p.id}</span>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => excluir(p.id)}>excluir</button>
                </div>
                <EditField label="Nome" value={p.nome} onChange={(v) => setChar('nome', v)} />
                <EditField label="Arquétipo" value={p.arquetipo} onChange={(v) => setChar('arquetipo', v)} />
                <p className="char-cross">{usos.length ? usos.join(', ') : <span className="muted">sem uso ainda</span>}</p>

                <label className="field-group">
                  <span className="label">Estilo</span>
                  <select className="field" value={p.estiloId || ''} onChange={(e) => setChar('estiloId', e.target.value || undefined)}>
                    <option value="">nenhum</option>
                    {estilos.map((es) => <option key={es.id} value={es.id}>{es.nome}</option>)}
                  </select>
                </label>
                <EditField label="Detalhe de arte" hint="Soma ao estilo." value={p.estiloExtra || ''}
                  onChange={(v) => setChar('estiloExtra', v)} />
                <EditField label="Regras" hint="Âncoras visuais que nunca mudam." value={p.regras}
                  onChange={(v) => setChar('regras', v)} textarea />

                <PromptBlock
                  label="Prompt da ficha"
                  tool="ChatGPT Images"
                  value={p.promptFicha}
                  onChange={(v) => setChar('promptFicha', v)}
                  copyText={`${prefixo}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
                  hint={`Copia com o estilo "${est?.nome || 'escolha um acima'}" e as regras da casa.`}
                />
                <div className="gen-row">
                  <GenerateButton
                    payload={{ tipo: 'ficha', personagemId: p.id }}
                    targetPath={p.imagem}
                    existing={existing}
                    jobs={jobs}
                    startGen={startGen}
                    label="Gerar ficha"
                    refInfo={`Estilo: ${est?.nome || 'nenhum, escolha acima'}.`}
                  />
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
