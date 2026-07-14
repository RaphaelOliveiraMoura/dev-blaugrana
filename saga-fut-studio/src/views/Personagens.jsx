import React, { useState } from 'react'
import {
  ConfirmModal, EditField, Media, PromptBlock, GenerateButton, FilePath, Icon,
} from '../components/index.js'
import { blankChar } from '../lib/scaffold.js'
import { useStudio } from '../app/StudioContext.jsx'

// Uma ficha do pool. O card é uma galeria: a cara e o nome bastam para achar quem
// você procura. O editor abre no lugar, porque aqui é onde ele mora de verdade.
function CharCard({ p, pi, usos, onExcluir }) {
  const { dados, update, existing, bust, jobs, startGen } = useStudio()
  const [aberto, setAberto] = useState(false)
  const estilos = dados.estilos || []
  const est = estilos.find((e) => e.id === p.estiloId)
  // espelha o readDados do server: estilo base + detalhe de arte do personagem
  const prefixo = est ? [est.stylePrefix, p.estiloExtra].filter(Boolean).join(', ') : ''
  const setChar = (campo, v) => update((n) => { n.personagens[pi][campo] = v })
  const temFicha = !!existing[p.imagem]

  return (
    <div className={'char-card' + (aberto ? ' aberto' : '')}>
      <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
      <div className="char-body">
        <div className="char-card-top">
          <span className="char-nome">{p.nome || <span className="muted">sem nome</span>}</span>
          <span className={'char-row-ficha' + (temFicha ? ' ok' : '')} title={temFicha ? 'ficha gerada' : 'ficha ainda não gerada'}>
            <Icon name={temFicha ? 'check' : 'alerta'} size={12} />
          </span>
        </div>
        <span className="char-arquetipo">{p.arquetipo}</span>
        <span className="char-cross">{usos.length ? usos.join(', ') : <span className="muted">sem uso ainda</span>}</span>

        <div className="char-card-acoes">
          <GenerateButton
            payload={{ tipo: 'ficha', personagemId: p.id }}
            targetPath={p.imagem}
            existing={existing}
            jobs={jobs}
            startGen={startGen}
            label="Gerar ficha"
            refInfo={`Estilo: ${est?.nome || 'nenhum, escolha ao editar'}.`}
          />
          <button className="btn btn-ghost btn-sm char-editar" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
            {aberto ? 'Fechar' : 'Editar'}
            <Icon name="chevron" size={11} />
          </button>
        </div>

        {aberto && (
          <div className="char-editor">
            <div className="char-card-top">
              <span className="char-id" title="id, usado no nome do arquivo">{p.id}</span>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => onExcluir(p.id)}>excluir</button>
            </div>
            <EditField label="Nome" value={p.nome} onChange={(v) => setChar('nome', v)} />
            <EditField label="Arquétipo" value={p.arquetipo} onChange={(v) => setChar('arquetipo', v)} />
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
            <FilePath path={p.imagem} />
          </div>
        )}
      </div>
    </div>
  )
}

// PERSONAGENS: o pool global, compartilhado entre sagas e quadrinhos.
export default function PersonagensView() {
  const { dados, update, existing } = useStudio()
  const personagens = dados.personagens || []
  const [confirm, setConfirm] = useState(null)
  const [busca, setBusca] = useState('')
  const [soSemFicha, setSoSemFicha] = useState(false)

  function novoPersonagem() {
    const p = blankChar(personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p) })
  }
  function usosDe(pid) {
    return [
      ...(dados.sagas || []).filter((s) => s.elenco.includes(pid)).map((s) => s.titulo),
      ...(dados.quadrinhos || []).filter((q) => (q.elenco || []).includes(pid)).map((q) => q.titulo),
    ]
  }
  function excluir(pid) {
    const p = personagens.find((x) => x.id === pid)
    const usos = usosDe(pid)
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

  // com 17 fichas e crescendo, achar alguém pelo olho já custa mais que digitar
  const termo = busca.trim().toLowerCase()
  const lista = personagens.filter((p) => {
    if (soSemFicha && existing[p.imagem]) return false
    if (!termo) return true
    return [p.nome, p.arquetipo, p.id].some((v) => (v || '').toLowerCase().includes(termo))
  })
  const nSemFicha = personagens.filter((p) => !existing[p.imagem]).length

  return (
    <div>
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}

      <div className="section-head">
        <h3 className="section-title">
          {personagens.length} personagens no pool
          {lista.length !== personagens.length && <span className="section-nota">{lista.length} na busca</span>}
        </h3>
        <div className="row-actions">
          <input className="field field-busca" value={busca} placeholder="Buscar por nome, arquétipo ou id…"
            onChange={(e) => setBusca(e.target.value)} />
          {nSemFicha > 0 && (
            <button className={'btn btn-sm' + (soSemFicha ? ' btn-primary' : '')} onClick={() => setSoSemFicha(!soSemFicha)}>
              <Icon name="alerta" size={12} /> Sem ficha ({nSemFicha})
            </button>
          )}
          <button className="btn btn-sm" onClick={novoPersonagem}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      <p className="hint intro">
        Todo personagem vive aqui e é reusado por qualquer saga ou quadrinho (crossover). A ficha é a âncora de
        consistência: gere-a e ela vai como referência nas cenas e painéis onde ele aparece. Cada um herda um estilo
        do catálogo e pode somar o próprio detalhe de arte, igual às sagas.
      </p>

      {lista.length === 0 && <p className="hint">Ninguém bate com esse filtro.</p>}

      <div className="char-grid">
        {lista.map((p) => (
          <CharCard
            key={p.id}
            p={p}
            pi={personagens.findIndex((x) => x.id === p.id)}
            usos={usosDe(p.id)}
            onExcluir={excluir}
          />
        ))}
      </div>
    </div>
  )
}
