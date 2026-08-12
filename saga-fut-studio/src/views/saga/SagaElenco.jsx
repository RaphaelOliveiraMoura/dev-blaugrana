import React, { useState } from 'react'
import { CharAvatar, GenerateButton, Icon } from '../../components/index.js'
import { fichaImagem } from '../../../shared/caminhos.mjs'
import { useStudio } from '../../app/StudioContext.jsx'
import { refInfoDaFicha } from '../../lib/refs.js'

// Um personagem do elenco. Na saga a pergunta é "quem está dentro e a ficha
// existe?". A ficha inteira mora no pool, num lugar só, e a linha leva direto
// pro card dele; gerar continua aqui, porque é o passo que destrava as cenas.
function ElencoLinha({ p, saga, si, onRemover }) {
  const { dados, existing, bust, jobs, startGen, nav } = useStudio()
  const temFicha = !!existing[p.imagem]
  const outras = dados.sagas.filter((s, j) => j !== si && s.elenco.includes(p.id)).map((s) => s.titulo)
  const est = (dados.estilos || []).find((e) => e.id === p.estiloId)

  return (
    <div className="char-row">
      <div className="char-row-bar">
        <button className="char-row-main" onClick={() => nav.personagem(p.id)} title="Abrir a ficha no pool">
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
          <span className="char-row-toggle"><Icon name="chevron" size={13} /></span>
        </button>
        {!temFicha && (
          <GenerateButton
            payload={{ tipo: 'ficha', sagaId: saga.id, personagemId: p.id }}
            targetPath={p.imagem}
            existing={existing}
            jobs={jobs}
            startGen={startGen}
            label="Gerar ficha"
            refInfo={refInfoDaFicha(p, est, existing)}
          />
        )}
        <button className="btn btn-ghost btn-icon btn-sm btn-danger" onClick={() => onRemover(p.id)}
          title="Tira do elenco desta saga; não apaga o personagem do pool">
          <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  )
}

export function SagaElenco({ saga, si, byId, onRemover }) {
  const { dados, update, nav } = useStudio()
  const elenco = saga.elenco.map((id) => byId[id]).filter(Boolean)
  const foraDoElenco = dados.personagens.filter((p) => !saga.elenco.includes(p.id))

  function addAoElenco(pid) {
    update((n) => { if (!n.sagas[si].elenco.includes(pid)) n.sagas[si].elenco.push(pid) })
  }

  return (
    <>
      <div className="section-head">
        <h3 className="section-title">Elenco da saga</h3>
      </div>
      {elenco.length === 0
        ? <p className="hint">Nenhum personagem ainda. Crie um novo ou adicione do pool acima.</p>
        : (
          <div className="char-list">
            {elenco.map((p) => (
              <ElencoLinha key={p.id} p={p} saga={saga} si={si} onRemover={onRemover} />
            ))}
          </div>
        )}
    </>
  )
}
