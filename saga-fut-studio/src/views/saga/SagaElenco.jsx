import React, { useState } from 'react'
import {
  CharAvatar, Media, EditField, PromptBlock, GenerateButton, FilePath, Icon,
} from '../../components/index.js'
import { blankChar } from '../../lib/scaffold.js'
import { useStudio } from '../../app/StudioContext.jsx'

// Um personagem do elenco. Na saga o que interessa é quem está dentro e se a ficha
// existe; a edição profunda mora no pool. Então a linha resume e o editor abre por
// cima dela, sem mandar você trocar de tela.
function ElencoLinha({ p, pi, saga, si, onRemover }) {
  const { dados, update, existing, bust, jobs, startGen, nav } = useStudio()
  const [aberto, setAberto] = useState(false)
  const temFicha = !!existing[p.imagem]
  const outras = dados.sagas.filter((s, j) => j !== si && s.elenco.includes(p.id)).map((s) => s.titulo)
  const setChar = (campo, v) => update((n) => { n.personagens[pi][campo] = v })

  return (
    <div className={'char-row' + (aberto ? ' aberto' : '')}>
      <div className="char-row-bar">
        <button className="char-row-main" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          <CharAvatar p={p} existing={existing} bust={bust} />
          <span className="char-row-body">
            <span className="char-row-nome">{p.nome || <span className="muted">sem nome</span>}</span>
            <span className="char-row-sub">{p.arquetipo}</span>
          </span>
          {outras.length > 0 && <span className="char-cross">também em: {outras.join(', ')}</span>}
          <span className={'char-row-ficha' + (temFicha ? ' ok' : '')}>
            <Icon name={temFicha ? 'check' : 'alerta'} size={12} />
            {temFicha ? 'ficha pronta' : 'sem ficha'}
          </span>
          <span className="char-row-toggle">
            <Icon name="chevron" size={13} />
          </span>
        </button>
        <button className="btn btn-ghost btn-icon btn-sm btn-danger" onClick={() => onRemover(p.id)}
          title="Tira do elenco desta saga; não apaga o personagem do pool">
          <Icon name="x" size={13} />
        </button>
      </div>

      {aberto && (
        <div className="char-row-corpo">
          <div className="char-row-media">
            <div className="char-img-wrap"><Media existing={existing} src={p.imagem} kind="img" bust={bust} /></div>
            <FilePath path={p.imagem} />
          </div>
          <div className="char-row-campos">
            <div className="char-row-topo">
              <span className="char-id" title="id, usado no nome do arquivo">{p.id}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => nav.ir('personagens')}
                title="Abrir o pool, onde mora o estilo e o resto da ficha">
                Ver no pool <Icon name="chevron" size={11} />
              </button>
            </div>
            <div className="field-row">
              <EditField label="Nome" value={p.nome} onChange={(v) => setChar('nome', v)} />
              <EditField label="Arquétipo" value={p.arquetipo} onChange={(v) => setChar('arquetipo', v)} />
            </div>
            <EditField label="Regras" hint="Âncoras visuais que nunca mudam." value={p.regras}
              onChange={(v) => setChar('regras', v)} textarea />
            <PromptBlock
              label="Prompt da ficha"
              tool="ChatGPT Images"
              value={p.promptFicha}
              onChange={(v) => setChar('promptFicha', v)}
              copyText={`${saga.stylePrefix}, ${p.promptFicha}\n\n${dados.projeto.promptRules}`}
              hint="Copia com o prefixo de estilo da saga e as regras da casa."
            />
            <div className="gen-row">
              <GenerateButton
                payload={{ tipo: 'ficha', sagaId: saga.id, personagemId: p.id }}
                targetPath={p.imagem}
                existing={existing}
                jobs={jobs}
                startGen={startGen}
                label="Gerar ficha"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SagaElenco({ saga, si, byId, onRemover }) {
  const { dados, update } = useStudio()
  const elenco = saga.elenco.map((id) => byId[id]).filter(Boolean)
  const foraDoElenco = dados.personagens.filter((p) => !saga.elenco.includes(p.id))

  function addAoElenco(pid) {
    update((n) => { if (!n.sagas[si].elenco.includes(pid)) n.sagas[si].elenco.push(pid) })
  }
  function novoPersonagem() {
    const p = blankChar(dados.personagens.map((x) => x.id), '')
    update((n) => { n.personagens.push(p); n.sagas[si].elenco.push(p.id) })
  }

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">Elenco da saga</h3>
        <div className="row-actions">
          {foraDoElenco.length > 0 && (
            <select className="field field-auto" value="" onChange={(e) => { if (e.target.value) addAoElenco(e.target.value) }}>
              <option value="">Adicionar do pool…</option>
              {foraDoElenco.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={novoPersonagem}><Icon name="plus" size={12} /> Novo personagem</button>
        </div>
      </div>
      {elenco.length === 0
        ? <p className="hint">Nenhum personagem ainda. Crie um novo ou adicione do pool acima.</p>
        : (
          <div className="char-list">
            {elenco.map((p) => (
              <ElencoLinha
                key={p.id}
                p={p}
                pi={dados.personagens.findIndex((x) => x.id === p.id)}
                saga={saga}
                si={si}
                onRemover={onRemover}
              />
            ))}
          </div>
        )}
    </>
  )
}
